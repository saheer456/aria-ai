export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div className="glass-card rounded-3xl p-8 max-w-sm w-full font-sans">
        <h2 className="text-white font-bold text-2xl mb-2">404</h2>
        <p className="text-slate-400 text-sm mb-6">Page not found.</p>
        <a href="/" className="btn-gradient px-6 py-2.5 rounded-xl text-white font-semibold text-sm inline-block">
          Go Home
        </a>
      </div>
    </div>
  );
}
