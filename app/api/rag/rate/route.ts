import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
);

export async function POST(req: Request) {
  try {
    const { memoryId, rating } = await req.json();
    // rating: 1 = thumbs up, -1 = thumbs down, or 1-5 numeric

    if (!memoryId) {
      return NextResponse.json({ error: 'memoryId is required' }, { status: 400 });
    }

    if (typeof rating !== 'number' || rating < -1 || rating > 5) {
      return NextResponse.json({ error: 'rating must be a number between -1 and 5' }, { status: 400 });
    }

    // Get current score
    const { data: current, error: fetchErr } = await supabase
      .from('rag_memories')
      .select('id, score, use_count')
      .eq('id', memoryId)
      .single();

    if (fetchErr || !current) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    // Weighted moving average: new_score = old_score * 0.8 + rating * 0.2
    // This prevents wild swings from single ratings
    const normalizedRating = rating === 1 ? 5 : rating === -1 ? 0 : rating; // map thumbs to 0-5
    const newScore = current.score * 0.8 + normalizedRating * 0.2;

    const { error: updateErr } = await supabase
      .from('rag_memories')
      .update({ score: Math.round(newScore * 100) / 100 })
      .eq('id', memoryId);

    if (updateErr) throw updateErr;

    console.log(`[RAG Rate] Memory ${memoryId} score: ${current.score.toFixed(2)} → ${newScore.toFixed(2)}`);

    return NextResponse.json({
      success: true,
      memoryId,
      oldScore: current.score,
      newScore: Math.round(newScore * 100) / 100,
    });
  } catch (err) {
    console.error('[RAG Rate] Error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

// DELETE — remove a memory entirely
export async function DELETE(req: Request) {
  try {
    const { memoryId } = await req.json();
    if (!memoryId) return NextResponse.json({ error: 'memoryId required' }, { status: 400 });

    const { error } = await supabase.from('rag_memories').delete().eq('id', memoryId);
    if (error) throw error;

    return NextResponse.json({ success: true, deleted: memoryId });
  } catch (err) {
    console.error('[RAG Rate/Delete] Error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
