export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6">
      {/* Orb spinner */}
      <div className="relative w-20 h-20">
        <div
          className="absolute inset-0 rounded-full opacity-20 animate-ping"
          style={{ background: 'linear-gradient(180deg, rgba(20, 184, 166, 0.9) 0%, rgba(13, 148, 136, 1) 100%)' }}
        />
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: 'linear-gradient(180deg, rgba(20, 184, 166, 0.9) 0%, rgba(13, 148, 136, 1) 100%)' }}
        />
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.25), transparent 60%)' }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xl">A</div>
      </div>
      {/* Skeleton cards */}
      <div className="w-full max-w-lg space-y-3 px-4">
        <div className="skeleton h-14 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <div className="skeleton h-24 rounded-2xl" />
          <div className="skeleton h-24 rounded-2xl" />
          <div className="skeleton h-24 rounded-2xl" />
          <div className="skeleton h-24 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
