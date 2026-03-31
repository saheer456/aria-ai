import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// ── Providers ──────────────────────────────────────────────────────────────

async function callGroq(messages: Message[], modelId?: string): Promise<{ text: string; model: string }> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const completion = await groq.chat.completions.create({
    model: modelId || 'llama-3.3-70b-versatile',
    messages,
    max_tokens: 2048,
    temperature: 0.7,
  });
  return { text: completion.choices[0]?.message?.content ?? '', model: 'Groq' };
}

async function callHuggingFace(messages: Message[], modelId?: string): Promise<{ text: string; model: string }> {
  // HuggingFace Inference API — free tier, OpenAI-compatible endpoint
  const model = modelId || 'meta-llama/Meta-Llama-3.1-8B-Instruct';

  const response = await fetch('https://api-inference.huggingface.co/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.HF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, max_tokens: 2048, temperature: 0.7 }),
  });

  if (response.status === 401) throw new Error('HuggingFace: invalid token — check HF_TOKEN in .env.local');
  if (response.status === 429) throw new Error('HuggingFace: rate limited, try again shortly');
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`HuggingFace error ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data.choices[0]?.message?.content ?? '';
  if (!text) throw new Error('HuggingFace returned an empty response');

  const shortModel = model.includes('/') ? model.split('/')[1] : model;
  return { text, model: `HuggingFace (${shortModel})` };
}

async function callOpenRouter(messages: Message[], modelId?: string): Promise<{ text: string; model: string }> {
  // 'openrouter/free' is OpenRouter's built-in meta-router — it auto-picks whichever
  // free model is currently available, so no hardcoded slugs ever go stale.
  const model = modelId || 'openrouter/free';

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://aria-ai.app',
      'X-Title': 'Aria AI',
    },
    body: JSON.stringify({ model, messages, max_tokens: 2048 }),
  });

  if (response.status === 401) throw new Error('OpenRouter: invalid API key — check OPENROUTER_KEY in .env.local');
  if (response.status === 429) throw new Error('OpenRouter: rate limited, try again shortly');
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`OpenRouter error ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data.choices[0]?.message?.content ?? '';
  if (!text) throw new Error('OpenRouter returned an empty response');

  const usedModel = (data.model as string | undefined) ?? model;
  const shortName = usedModel.includes('/') ? usedModel.split('/')[1].replace(/:free$/, '') : usedModel;
  return { text, model: `OpenRouter (${shortName})` };
}

// ── Routing ────────────────────────────────────────────────────────────────

type ProviderKey = 'groq' | 'huggingface' | 'openrouter' | 'auto';

async function routeToModel(messages: Message[], provider: ProviderKey) {
  if (provider === 'groq')         return callGroq(messages);
  if (provider === 'huggingface')  return callHuggingFace(messages);
  if (provider === 'openrouter')   return callOpenRouter(messages);

  // auto — try in order with fallback
  const providers = [
    { name: 'Groq',         fn: () => callGroq(messages) },
    { name: 'HuggingFace',  fn: () => callHuggingFace(messages) },
    { name: 'OpenRouter',   fn: () => callOpenRouter(messages) },
  ];
  for (const p of providers) {
    try {
      return await p.fn();
    } catch (err) {
      console.warn(`[Aria] ${p.name} failed:`, err instanceof Error ? err.message : err);
    }
  }
  throw new Error('All AI providers failed. Please check your API keys.');
}

// ── Handler ────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { messages, chatId, provider = 'auto' } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages array' }, { status: 400 });
    }

    const systemMessage: Message = {
      role: 'system',
      content: 'You are Aria, a premium AI assistant. You are helpful, creative, and precise. Format code in markdown code blocks. Be concise but thorough.',
    };

    const fullMessages: Message[] = [systemMessage, ...messages];
    const { text, model } = await routeToModel(fullMessages, provider as ProviderKey);

    return NextResponse.json({ content: text, model, chatId, timestamp: new Date().toISOString() });
  } catch (err: unknown) {
    console.error('[Aria] Chat API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
