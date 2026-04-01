import { NextResponse } from 'next/server';
import { performWebSearch, requiresWebSearch } from './web-search';
import { getRagSupabase } from '../rag/supabase-client';
import { processIngestion } from '../rag/ingest/route';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface RagMemory {
  id: string;
  content: string;
  chunk_type: string;
  tags: string[];
  score: number;
  similarity: number;
  use_count: number;
}

// ── HF embedding with 8s timeout ──────────────────────────────────────────
async function getEmbedding(text: string): Promise<number[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.HF_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    if (!response.ok) throw new Error(`HF embedding error ${response.status}`);
    const data = await response.json();
    if (Array.isArray(data[0])) return data[0] as number[];
    return data as number[];
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ── RAG: Text-search fallback via Supabase REST ────────────────────────────
async function textSearchRAG(userQuery: string, sessionId: string): Promise<RagMemory[]> {
  try {
    const supabase = getRagSupabase();
    const keywords = userQuery.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 3);
    if (keywords.length === 0) return [];
    const orFilter = keywords.map(k => `content.ilike.*${k}*`).join(',');
    
    const { data, error } = await supabase
      .from('rag_memories')
      .select('id,content,chunk_type,tags,score,use_count')
      .eq('session_id', sessionId)
      .or(orFilter)
      .order('score', { ascending: false })
      .limit(4);

    if (error) {
      console.error(`[RAG Text Search Error] -> Supabase query failed: ${error.message} (Code: ${error.code})`);
      return [];
    }
    
    return (data || []).map((m: any) => ({ ...m, similarity: 0.5 }));
  } catch (err: any) {
    console.error(`[RAG Text Search Error] -> Unexpected failure:`, err?.message || err);
    return [];
  }
}

// ── RAG: Vector search via Supabase RPC ───────────────────────────────────
async function vectorSearchRAG(embedding: number[], sessionId: string): Promise<RagMemory[]> {
  try {
    const supabase = getRagSupabase();
    const { data, error } = await supabase.rpc('match_memories', {
      query_embedding: `[${embedding.join(',')}]`,
      match_count: 5,
      session: sessionId,
      min_score: -1
    });

    if (error) {
      console.error(`[RAG Vector Search Error] -> RPC 'match_memories' failed: ${error.message} (Code: ${error.code})`);
      return [];
    }

    return ((data || []) as RagMemory[]).filter(m => m.similarity > 0.25);
  } catch (err: any) {
    console.error(`[RAG Vector Search Error] -> Unexpected RPC failure:`, err?.message || err);
    return [];
  }
}

async function queryRAG(userQuery: string, sessionId: string): Promise<RagMemory[]> {
  try {
    const ObjectEmbedding = await getEmbedding(userQuery).catch((err) => {
      console.error(`[RAG Query Error] -> HuggingFace Embedding failed: ${err.message}`);
      return null;
    });

    if (ObjectEmbedding) {
      const results = await vectorSearchRAG(ObjectEmbedding, sessionId);
      if (results.length > 0) return results;
    }
  } catch (err: any) {
    console.warn('[RAG Query Warning] -> Vector search failed, falling back to basic text matching.', err?.message);
  }
  
  // Fallback to strict database text search
  return await textSearchRAG(userQuery, sessionId);
}



// ── AI Stream Provider Factory ─────────────────────────────────────────────
async function fetchProviderStream(provider: string, messages: Message[]) {
  const createPayload = (model: string) => JSON.stringify({ model, messages, max_tokens: 2048, temperature: 0.7, stream: true });

  if (provider === 'groq') {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: createPayload('llama-3.3-70b-versatile'),
    });
    if (!res.ok) throw new Error(`Groq failed: ${res.status}`);
    return { response: res, model: 'Groq (Llama 3.3)' };
  }

  if (provider === 'huggingface') {
    const res = await fetch('https://api-inference.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.HF_TOKEN}`, 'Content-Type': 'application/json' },
      body: createPayload('meta-llama/Meta-Llama-3.1-8B-Instruct'),
    });
    if (!res.ok) throw new Error(`HF failed: ${res.status}`);
    return { response: res, model: 'HuggingFace (Llama 3.1 8B)' };
  }

  if (provider === 'openrouter' || provider === 'auto') {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://aria-ai.app',
        'X-Title': 'Aria AI',
      },
      body: createPayload('openrouter/free'),
    });
    if (!res.ok) throw new Error(`OpenRouter failed: ${res.status}`);
    return { response: res, model: 'OpenRouter' };
  }
  
  throw new Error('Unknown provider');
}

// ── Handler ────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { messages, chatId, provider = 'auto', sessionId } = await req.json();
    // Guard: sessionId must always be provided by the client (user.id or guest_<uuid>)
    const effectiveSessionId: string = sessionId || 'guest_anonymous';

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages array' }, { status: 400 });
    }

    const lastUserMsg = [...messages].reverse().find((m: Message) => m.role === 'user')?.content || '';

    // ── STEP 1 & 2: Intent detection (DDG vs RAG) ─────────────────────────
    const needsWebSearch = requiresWebSearch(lastUserMsg);

    // Strict Qwen-style formatting injected into every response
    let systemPrompt = [
      'You are Aria, a premium AI assistant with a distinctive, highly structured communication style.',
      '',
      '## FORMATTING RULES (MANDATORY — ALWAYS FOLLOW)',
      '',
      '### 1. Always lead with a **bold one-liner** summary of the core answer.',
      '### 2. Use emoji-prefixed H2/H3 headers for every major section. Example headers:',
      '   - ## 💰 COST ANALYSIS',
      '   - ## 🚀 RECOMMENDED STACK',
      '   - ## ⚠️ IMPORTANT NOTES',
      '   - ## ✅ FINAL RECOMMENDATION',
      '   - ## 🏗️ ARCHITECTURE OVERVIEW',
      '   - ## 📚 HOW IT WORKS',
      '   - ## 🔧 IMPLEMENTATION STEPS',
      '### 3. Use markdown TABLES for comparisons, pros/cons, attribute lists, or anything multi-column:',
      '   | Service | Cost | Limit | Notes |',
      '   |---|---|---|---|',
      '   | Groq API | Free | 30 req/min | Fastest option |',
      '### 4. Use mermaid code blocks for ALL architecture diagrams and workflows:',
      '   ```mermaid',
      '   graph TD',
      '     A[User] --> B[Aria API] --> C[Groq LLM]',
      '   ```',
      '### 5. Use language-tagged code blocks for ALL code, shell commands, and config.',
      '### 6. End EVERY substantive response with a ## ✅ SUMMARY or ## 🚀 NEXT STEPS section.',
      '',
      '### DO NOT:',
      '- Write long prose paragraphs without headers.',
      '- Use a plain list when a table would be clearer.',
      '- Skip emojis on section headers.',
      '',
      '## PDF EXPORT',
      'If asked to save, export, or download this chat as a PDF or document, ALWAYS respond:',
      '"To save this as a PDF, click the 📄 **Export PDF** button in the top-right corner of the chat window."',
      '',
    ].join('\n');

    let ragMemories: RagMemory[] = [];

    if (needsWebSearch) {
      console.log(`[Pipeline] Triggered Web Search for: "${lastUserMsg}"`);
      const searchResults = await performWebSearch(lastUserMsg, 4);
      if (searchResults.length > 0) {
        systemPrompt += '## 🌐 REAL-TIME WEB SEARCH RESULTS\n';
        systemPrompt += 'Use these fresh results to give an accurate, up-to-date answer:\n\n';
        searchResults.forEach((r, i) => {
          systemPrompt += `**[Source ${i + 1}] ${r.title}**\n${r.snippet}\nURL: ${r.link}\n\n`;
        });
      }
    } else {
      ragMemories = await queryRAG(lastUserMsg, effectiveSessionId);
      if (ragMemories.length > 0) {
        systemPrompt += '## 🧠 YOUR MEMORY ABOUT THIS USER\n';
        systemPrompt += 'Use this context naturally to personalize your response:\n\n';
        ragMemories.forEach((m, i) => {
          systemPrompt += `[Memory ${i + 1} | ${m.chunk_type}]\n${m.content}\n\n`;
        });
      }
    }

    // ── STEP 3: API Request ────────────────────────────────────────────────
    const fullMessages: Message[] = [{ role: 'system', content: systemPrompt }, ...messages];
    
    // Auto-fallback chain
    let res: Response | null = null;
    let fallbackModel = '';
    
    const tryFetch = async (prov: string) => {
      try {
        const { response, model } = await fetchProviderStream(prov, fullMessages);
        res = response; fallbackModel = model;
        return true;
      } catch (e) { console.warn(`Provider ${prov} failed.`); return false; }
    };

    if (provider !== 'auto') {
      await tryFetch(provider);
    }
    
    if (!res) {
      // Auto fallback chain
      const ok = await tryFetch('groq') || await tryFetch('openrouter') || await tryFetch('huggingface');
      if (!ok || !res) throw new Error('All AI providers failed.');
    }

    // ── STEP 4: Stream Interception & RAG Ingestion ────────────────────────
    let accumulatedText = '';
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const finalRes = res as unknown as Response;
    if (!finalRes.body) throw new Error('No body in response');

    // Transform stream: extracts content from SSE, yields raw text to client via Server-Sent Events pattern
    let buffer = '';
    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices?.[0]?.delta?.content || '';
              if (content) {
                accumulatedText += content;
                controller.enqueue(encoder.encode(content));
              }
            } catch {
              // Ignore parse errors on valid format but corrupted JSON payload
            }
          }
        }
      },
      flush(controller) {
        // Stream completed
        const isMemoryQuery = /what.*(my name|i prefer|do i like|remember|recall)|who am i/i.test(lastUserMsg);
        const isSubstantive = lastUserMsg.length >= 10 && accumulatedText.length >= 20;
        
        if (isSubstantive && !isMemoryQuery) {
          console.log(`[Pipeline] → Direct background ingestion triggered (session: ${effectiveSessionId})`);
          // Directly process ingestion without networking, with explicit error boundary
          processIngestion(lastUserMsg, accumulatedText, effectiveSessionId)
            .catch((err) => console.error(`[Ingestion Error Boundary] -> Async processing failed for ${effectiveSessionId}:`, err));
        }
      }
    });

    const stream = finalRes.body.pipeThrough(transformStream);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8', // Plain text stream makes client parsing ridiculously easy
        'Cache-Control': 'no-cache',
        'x-aria-model': fallbackModel,
        'x-aria-rag': ragMemories.length > 0 ? ragMemories.map(m => m.id).join(',') : '',
        'x-aria-web': needsWebSearch ? 'true' : 'false'
      }
    });

  } catch (err: unknown) {
    console.error('[Aria] Chat API error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
