import { NextResponse } from 'next/server';

export async function GET() {
  // We only check if the keys are populated, no actual API pings to save credits.
  const models = [
    {
      id: 'groq',
      name: 'Groq Llama',
      status: process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here' ? 'online' : 'offline',
    },
    {
      id: 'gemini',
      name: 'Gemini 2.0',
      status: process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY !== 'your_google_api_key_here' ? 'online' : 'offline',
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      status: process.env.OPENROUTER_KEY && process.env.OPENROUTER_KEY !== 'your_openrouter_key_here' ? 'online' : 'offline',
    },
  ];

  return NextResponse.json({ models });
}
