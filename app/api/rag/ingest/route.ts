import { NextResponse } from 'next/server';
import { getRagSupabase } from '../supabase-client';

// ── HuggingFace embedding (all-MiniLM-L6-v2 → 384-dim, free tier) ─────────
async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch(
    'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
    }
  );

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    throw new Error(`HF embedding error ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  if (Array.isArray(data[0])) return data[0] as number[];
  return data as number[];
}

// ── AI-powered extraction using Groq (fast & free) ─────────────────────────
async function detectAndExtract(
  userMsg: string,
  aiMsg: string
): Promise<{ shouldStore: boolean; chunk: string; type: string; tags: string[]; reason?: string } | null> {
  const prompt = `You are a memory extraction system. Analyze this conversation turn and decide if it contains knowledge worth remembering long-term.

User: ${userMsg.slice(0, 500)}
AI: ${aiMsg.slice(0, 800)}

Respond with ONLY a JSON object (no markdown, no explanation):
{
  "shouldStore": true/false,
  "reason": "brief reason",
  "chunk": "A self-contained, factual summary of the knowledge (max 200 words). Empty string if shouldStore=false.",
  "type": "qa" | "code" | "style" | "fact",
  "tags": ["tag1", "tag2"]
}

Store if: specific facts, technical explanations, user preferences, code patterns, how-to answers.
Skip if: greetings, vague chat, simple confirmations, already generic knowledge.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const text = data.choices[0]?.message?.content ?? '{}';
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ── Direct Invocation Logic (bypasses Next.js localhost networking) ─────────
export async function processIngestion(userMessage: string, aiResponse: string, sessionId: string) {
  const effectiveSessionId = sessionId || 'guest_anonymous';
  const supabase = getRagSupabase();

  if (!userMessage || !aiResponse) return null;

  // Step 1: Detect + extract
  const extracted = await detectAndExtract(userMessage, aiResponse);
  if (!extracted || !extracted.shouldStore || !extracted.chunk) return null;

  // Step 2 & 3: Embed and Store
  let embedding: number[] | undefined;
  try {
    embedding = await getEmbedding(extracted.chunk);
  } catch (err) {
    console.error('[RAG Ingest] Embedding logic failed:', err);
    // Continue without embedding (store text only)
  }

  const record = {
    session_id: effectiveSessionId,
    chunk_type: extracted.type || 'qa',
    content: extracted.chunk,
    source_user: userMessage.slice(0, 500),
    source_ai: aiResponse.slice(0, 500),
    tags: extracted.tags || [],
    score: 0,
    ...(embedding ? { embedding: `[${embedding.join(',')}]` } : {})
  };

  const { data, error } = await supabase.from('rag_memories').insert(record).select('id').single();

  if (error) {
    console.error(`[RAG Ingest] Supabase insert failed: ${error.message}`);
    throw error;
  }

  console.log(`[RAG] Stored memory ${data?.id} (session: ${effectiveSessionId}) — tags: ${extracted.tags?.join(', ')}`);
  return { id: data?.id, embedded: !!embedding, chunk: extracted.chunk };
}

// ── Route Handler (Optional generic HTTP access if needed) ────────────────
export async function POST(req: Request) {
  try {
    const { userMessage, aiResponse, sessionId } = await req.json();
    
    if (!userMessage || !aiResponse) {
      return NextResponse.json({ error: 'userMessage and aiResponse required' }, { status: 400 });
    }

    const result = await processIngestion(userMessage, aiResponse, sessionId);
    
    if (!result) {
      return NextResponse.json({ stored: false, reason: 'Not worth storing' });
    }

    return NextResponse.json({ stored: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
