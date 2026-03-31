import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
  return { text: completion.choices[0]?.message?.content ?? '', model: 'GROQ' };
}

async function callGemini(messages: Message[], modelId?: string): Promise<{ text: string; model: string }> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
  const model = genAI.getGenerativeModel({ model: modelId || 'gemini-2.0-flash' });
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));
  const lastMsg = messages[messages.length - 1].content;
  const chat = model.startChat({ history });
  const result = await chat.sendMessage(lastMsg);
  return { text: result.response.text(), model: 'Gemini' };
}

async function callOpenRouter(messages: Message[], modelId?: string): Promise<{ text: string; model: string }> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://aria-ai.app',
      'X-Title': 'Aria AI',
    },
    body: JSON.stringify({
      model: modelId || 'meta-llama/llama-3.1-70b-instruct:free',
      messages,
      max_tokens: 2048,
    }),
  });
  if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`);
  const data = await response.json();
  return { text: data.choices[0]?.message?.content ?? '', model: 'OpenRouter' };
}

// ── Routing ────────────────────────────────────────────────────────────────

type ProviderKey = 'groq' | 'gemini' | 'openrouter' | 'auto';

async function routeToModel(messages: Message[], provider: ProviderKey) {
  if (provider === 'groq') return callGroq(messages);
  if (provider === 'gemini') return callGemini(messages);
  if (provider === 'openrouter') return callOpenRouter(messages);

  // auto — try in order with fallback
  const providers = [
    { name: 'Groq', fn: () => callGroq(messages) },
    { name: 'Gemini', fn: () => callGemini(messages) },
    { name: 'OpenRouter', fn: () => callOpenRouter(messages) },
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
