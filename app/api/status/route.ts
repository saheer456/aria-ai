import { NextResponse } from 'next/server';

export async function GET() {
  const models = [
    {
      id: 'groq',
      name: 'Groq Llama',
      status: process.env.GROQ_API_KEY ? 'online' : 'offline',
    },
    {
      id: 'huggingface',
      name: 'HuggingFace',
      status: process.env.HF_TOKEN ? 'online' : 'offline',
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      status: process.env.OPENROUTER_KEY ? 'online' : 'offline',
    },
    {
      id: 'image',
      name: 'Image Gen',
      status: 'online', // Pollinations AI — no key needed, always available
    },
  ];

  return NextResponse.json({ models });
}
