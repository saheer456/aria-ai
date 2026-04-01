import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
);

// ── HF embedding (same model as ingest) ───────────────────────────────────
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

  if (!response.ok) throw new Error(`HF embedding error ${response.status}`);
  const data = await response.json();
  if (Array.isArray(data[0])) return data[0] as number[];
  return data as number[];
}

export async function POST(req: Request) {
  try {
    const { query, sessionId = 'global', limit = 5, minScore = -1 } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    // Step 1: Embed the query
    let embedding: number[];
    try {
      embedding = await getEmbedding(query);
    } catch (err) {
      console.warn('[RAG Query] Embedding failed, returning empty context:', err);
      return NextResponse.json({ memories: [], preferences: null, source: 'fallback' });
    }

    // Step 2: Vector similarity search via Supabase RPC
    const { data: memories, error } = await supabase.rpc('match_memories', {
      query_embedding: `[${embedding.join(',')}]`,
      match_count: limit,
      session: sessionId,
      min_score: minScore,
    });

    if (error) {
      console.error('[RAG Query] Supabase RPC error:', error);
      return NextResponse.json({ memories: [], preferences: null, error: error.message });
    }

    // Step 3: Increment use_count for retrieved memories (fire-and-forget)
    // We do individual updates since pgvector doesn't support bulk increments easily
    if (memories && memories.length > 0) {
      Promise.all(
        memories.map((m: { id: string; use_count: number }) =>
          supabase
            .from('rag_memories')
            .update({ use_count: (m.use_count || 0) + 1 })
            .eq('id', m.id)
        )
      ).catch(() => {}); // fire-and-forget
    }

    // Step 4: Fetch user preferences
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    return NextResponse.json({
      memories: memories || [],
      preferences: prefs || null,
      count: memories?.length || 0,
    });
  } catch (err) {
    console.error('[RAG Query] Error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
