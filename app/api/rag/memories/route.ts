import { NextResponse } from 'next/server';
import { supabaseFetch } from './../supabase-fetch';

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET /api/rag/memories — list all via direct REST (bypasses @supabase/supabase-js client init issues)
export async function GET() {
  try {
    const url = `${SUPABASE_URL}/rest/v1/rag_memories?select=id,content,chunk_type,tags,score,use_count,source_user,source_ai,created_at,session_id&order=created_at.desc&limit=100`;

    const response = await supabaseFetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Supabase REST ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = await response.json();
    return NextResponse.json({ memories: data || [] });
  } catch (err) {
    console.error('[RAG Memories] Error:', err);
    return NextResponse.json(
      { memories: [], error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
