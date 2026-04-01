import { NextResponse } from 'next/server';
import { supabaseFetch } from '../supabase-fetch';

// ── Supabase REST (no JS client — avoids connection issues) ───────────────
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const sbHeaders = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

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

  // HF returns either [[...embedding]] or [...embedding]
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

// ── Handler ────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const { userMessage, aiResponse, sessionId = 'global', chatId } = await req.json();

    if (!userMessage || !aiResponse) {
      return NextResponse.json({ error: 'userMessage and aiResponse are required' }, { status: 400 });
    }

    // Step 1: Detect + extract
    const extracted = await detectAndExtract(userMessage, aiResponse);

    if (!extracted || !extracted.shouldStore || !extracted.chunk) {
      return NextResponse.json({ stored: false, reason: extracted?.reason || 'Not worth storing' });
    }

    // Step 2: Embed the extracted chunk
    let embedding: number[];
    try {
      embedding = await getEmbedding(extracted.chunk);
    } catch (err) {
      console.error('[RAG Ingest] Embedding failed:', err);
      // Store without embedding — can be re-embedded later
      const res = await supabaseFetch(`${SB_URL}/rest/v1/rag_memories`, {
        method: 'POST',
        headers: sbHeaders,
        body: JSON.stringify({
          session_id: sessionId,
          chunk_type: extracted.type || 'qa',
          content: extracted.chunk,
          source_user: userMessage.slice(0, 500),
          source_ai: aiResponse.slice(0, 500),
          tags: extracted.tags || [],
          score: 0,
        }),
      });
      if (!res.ok) { const b = await res.text(); throw new Error(`Supabase insert ${res.status}: ${b.slice(0,200)}`); }
      const rows = await res.json() as any[];
      return NextResponse.json({ stored: true, id: rows[0]?.id, embedded: false });
    }

    // Step 3: Store in Supabase with embedding via REST
    const insertRes = await supabaseFetch(`${SB_URL}/rest/v1/rag_memories`, {
      method: 'POST',
      headers: sbHeaders,
      body: JSON.stringify({
        session_id: sessionId,
        chunk_type: extracted.type || 'qa',
        content: extracted.chunk,
        source_user: userMessage.slice(0, 500),
        source_ai: aiResponse.slice(0, 500),
        embedding: `[${embedding.join(',')}]`,
        tags: extracted.tags || [],
        score: 0,
      }),
    });

    if (!insertRes.ok) {
      const b = await insertRes.text();
      throw new Error(`Supabase insert ${insertRes.status}: ${b.slice(0, 200)}`);
    }
    const rows = await insertRes.json() as any[];
    const id = rows[0]?.id;

    console.log(`[RAG] Stored memory ${id} — type: ${extracted.type}, tags: ${extracted.tags?.join(', ')}`);

    return NextResponse.json({ stored: true, id, type: extracted.type, tags: extracted.tags, chunk: extracted.chunk });
  } catch (err) {
    console.error('[RAG Ingest] Error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
