import { NextResponse } from 'next/server';
import { supabaseFetch } from '../rag/supabase-fetch';
import { performWebSearch, requiresWebSearch } from './web-search';

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

// ── Supabase REST helpers (no JS client — avoids connection issues) ─────────
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const sbHeaders = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
};

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
async function textSearchRAG(userQuery: string): Promise<RagMemory[]> {
  try {
    const keywords = userQuery.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 3);
    if (keywords.length === 0) return [];
    const orFilter = keywords.map(k => `content.ilike.*${k}*`).join(',');
    const url = `${SB_URL}/rest/v1/rag_memories?select=id,content,chunk_type,tags,score,use_count&session_id=eq.global&or=(${orFilter})&order=score.desc&limit=4`;

    const res = await supabaseFetch(url, { headers: sbHeaders });
    if (!res.ok) return [];
    const data = await res.json() as any[];
    return (data || []).map((m: any) => ({ ...m, similarity: 0.5 }));
  } catch {
    return [];
  }
}

// ── RAG: Vector search via Supabase RPC ───────────────────────────────────
async function vectorSearchRAG(embedding: number[], sessionId: string): Promise<RagMemory[]> {
  const res = await supabaseFetch(`${SB_URL}/rest/v1/rpc/match_memories`, {
    method: 'POST',
    headers: sbHeaders,
    body: JSON.stringify({
      query_embedding: `[${embedding.join(',')}]`,
      match_count: 5,
      session: sessionId,
      min_score: -1,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`match_memories RPC ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return ((data || []) as RagMemory[]).filter(m => m.similarity > 0.25);
}

async function queryRAG(userQuery: string, sessionId: string): Promise<RagMemory[]> {
  try {
    const embedding = await getEmbedding(userQuery);
    const results = await vectorSearchRAG(embedding, sessionId);
    if (results.length > 0) return results;
  } catch (err) {
    console.warn('[Pipeline] Embedding/vector failed:', err instanceof Error ? err.message : err);
  }
  return await textSearchRAG(userQuery);
}

// ── Fire-and-forget ingest ─────────────────────────────────────────────────
function ingestRAG(userMessage: string, aiResponse: string, sessionId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  fetch(`${baseUrl}/api/rag/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userMessage, aiResponse, sessionId }),
  }).catch(() => {});
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
    const { messages, chatId, provider = 'auto', sessionId = 'global' } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages array' }, { status: 400 });
    }

    const lastUserMsg = [...messages].reverse().find((m: Message) => m.role === 'user')?.content || '';

    // ── STEP 1 & 2: Intent detection (DDG vs RAG) ─────────────────────────
    const needsWebSearch = requiresWebSearch(lastUserMsg);
    let systemPrompt = `You are Aria, a premium AI assistant. You are helpful, creative, and precise. Format code in markdown code blocks. Be concise but thorough.\n\n`;
    let ragMemories: RagMemory[] = [];
    
    if (needsWebSearch) {
      console.log(`[Pipeline] Triggered Web Search for: "${lastUserMsg}"`);
      const searchResults = await performWebSearch(lastUserMsg, 4);
      if (searchResults.length > 0) {
        systemPrompt += `## Real-Time Web Search Context\nYou have been provided with real-time web search results to answer the user's query accurately based on the latest information.\n\n`;
        searchResults.forEach((r, i) => {
          systemPrompt += `[Source ${i + 1}] ${r.title}\n${r.snippet}\nURL: ${r.link}\n\n`;
        });
      }
    } else {
      ragMemories = await queryRAG(lastUserMsg, sessionId);
      if (ragMemories.length > 0) {
        systemPrompt += `## Your Memory About This User\nYou have learned the following from previous conversations. Use this context naturally to give personalized responses:\n\n`;
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
          console.log('[Pipeline] → Saving for learning (Background)');
          ingestRAG(lastUserMsg, accumulatedText, sessionId);
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
