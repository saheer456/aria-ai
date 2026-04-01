import { NextResponse } from 'next/server';
import { getRagSupabase } from '../supabase-client';

// GET /api/rag/memories?sessionId=<user_id_or_guest_id>
// Returns only memories belonging to the given session (user or guest).
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ memories: [], error: 'sessionId query param is required' }, { status: 400 });
    }

    const supabase = getRagSupabase();

    const { data, error } = await supabase
      .from('rag_memories')
      .select('id,content,chunk_type,tags,score,use_count,source_user,source_ai,created_at,session_id')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error(`[RAG Memories Route Error] -> Supabase query failed for session ${sessionId}: ${error.message}`);
      return NextResponse.json({ memories: [], error: error.message }, { status: 500 });
    }

    return NextResponse.json({ memories: data || [] });
  } catch (err: any) {
    console.error(`[RAG Memories Route Error] -> Unexpected failure:`, err?.message || err);
    return NextResponse.json(
      { memories: [], error: err?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
