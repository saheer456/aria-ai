'use client';

interface ModelBadgeProps {
  model: string;
  small?: boolean;
}

const modelConfig: Record<string, { label: string; dot: string; color: string }> = {
  groq: { label: 'Groq', dot: 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)]', color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' },
  gemini: { label: 'Gemini', dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  openrouter: { label: 'OpenRouter', dot: 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
};

export function ModelBadge({ model, small = false }: ModelBadgeProps) {
  const config = modelConfig[model] ?? { label: model, dot: 'bg-slate-400', color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' };

  return (
    <span
      className={`inline-flex items-center gap-1 border rounded-full font-mono ${config.color} ${
        small ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
      }`}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
