'use client';

export function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4 px-4">
      <div className="w-8 h-8 rounded-full bg-teal-500/10 border border-teal-500/20 shadow-[0_0_15px_rgba(20,184,166,0.15)] flex items-center justify-center text-xs font-bold text-teal-400 mr-2 mt-1 shrink-0">
        A
      </div>
      <div className="bubble-ai px-4 py-3.5 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-teal-400/70 typing-dot" />
        <span className="w-2 h-2 rounded-full bg-teal-400/70 typing-dot" />
        <span className="w-2 h-2 rounded-full bg-teal-400/70 typing-dot" />
      </div>
    </div>
  );
}
