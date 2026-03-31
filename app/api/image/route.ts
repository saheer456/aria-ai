import { NextResponse } from 'next/server';

// Pollinations.AI — free, no API key required.
// The image is generated synchronously when the URL is fetched.
// We fetch it server-side first so it's ready when the client renders it.

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const encoded = encodeURIComponent(prompt.trim());
    const seed = Math.floor(Math.random() * 1_000_000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&seed=${seed}&nologo=true`;

    // Fetch server-side to trigger and wait for generation (~5-15s)
    const response = await fetch(imageUrl, { method: 'GET' });

    if (!response.ok) {
      throw new Error(`Pollinations error ${response.status}`);
    }

    // Image is now generated and cached at the URL — safe to return
    return NextResponse.json({ imageUrl, model: 'Pollinations AI' });
  } catch (err) {
    console.error('[Aria] Image API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
