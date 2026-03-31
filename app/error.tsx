'use client';

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="glass-card rounded-3xl p-8 max-w-sm w-full">
        <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-4 text-2xl">⚠️</div>
        <h2 className="text-white font-semibold text-lg mb-2">Something went wrong</h2>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">{error.message || 'An unexpected error occurred.'}</p>
        <button
          onClick={reset}
          className="btn-gradient w-full py-3 rounded-2xl text-white font-semibold text-sm"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
