'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Trash2, RefreshCw, Code2, MessageSquare, Palette, Lightbulb,
  Search, ChevronDown, ThumbsUp, ThumbsDown, Sparkles, Database
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface Memory {
  id: string;
  content: string;
  chunk_type: 'qa' | 'code' | 'style' | 'fact';
  tags: string[];
  score: number;
  use_count: number;
  source_user?: string;
  source_ai?: string;
  created_at: string;
  session_id: string;
}

const TYPE_CONFIG = {
  qa:    { icon: MessageSquare, label: 'Q&A',   color: 'text-blue-500',   bg: 'bg-blue-50',   border: 'border-blue-100' },
  code:  { icon: Code2,         label: 'Code',  color: 'text-violet-500', bg: 'bg-violet-50', border: 'border-violet-100' },
  style: { icon: Palette,       label: 'Style', color: 'text-pink-500',   bg: 'bg-pink-50',   border: 'border-pink-100' },
  fact:  { icon: Lightbulb,     label: 'Fact',  color: 'text-amber-500',  bg: 'bg-amber-50',  border: 'border-amber-100' },
};

function ScoreBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, ((score + 1) / 6) * 100));
  const color = score >= 3 ? 'bg-green-400' : score >= 1 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className="text-[11px] font-semibold text-slate-500 w-8 text-right">
        {score.toFixed(1)}
      </span>
    </div>
  );
}

function MemoryCard({ memory, onDelete, onRate }: {
  memory: Memory;
  onDelete: (id: string) => void;
  onRate: (id: string, rating: 1 | -1) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const cfg = TYPE_CONFIG[memory.chunk_type] || TYPE_CONFIG.qa;
  const Icon = cfg.icon;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch('/api/rag/rate', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memoryId: memory.id }),
      });
      onDelete(memory.id);
    } catch {
      setDeleting(false);
    }
  };

  const handleRate = async (rating: 1 | -1) => {
    await fetch('/api/rag/rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memoryId: memory.id, rating }),
    });
    onRate(memory.id, rating);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: deleting ? 0 : 1, y: 0, scale: deleting ? 0.95 : 1 }}
      exit={{ opacity: 0, scale: 0.95, y: -8 }}
      transition={{ duration: 0.2 }}
      className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg} ${cfg.border} border`}>
          <Icon size={15} className={cfg.color} strokeWidth={1.8} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[11px] font-semibold uppercase tracking-wide ${cfg.color}`}>
              {cfg.label}
            </span>
            {memory.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                {tag}
              </span>
            ))}
            <span className="ml-auto text-[10px] text-slate-400">
              used {memory.use_count}×
            </span>
          </div>
          <p className="text-[13px] text-slate-800 leading-relaxed line-clamp-2">
            {memory.content}
          </p>
          <div className="mt-2">
            <ScoreBar score={memory.score} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1 px-4 pb-3 pt-1 border-t border-slate-50">
        <span className="text-[10px] text-slate-400 flex-1">
          {new Date(memory.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>

        {/* Quick rate */}
        <button
          id={`mem-up-${memory.id}`}
          onClick={() => handleRate(1)}
          title="Good memory"
          className="p-1.5 rounded-lg text-slate-400 hover:text-green-500 hover:bg-green-50 transition-colors"
        >
          <ThumbsUp size={12} strokeWidth={1.8} />
        </button>
        <button
          id={`mem-down-${memory.id}`}
          onClick={() => handleRate(-1)}
          title="Bad memory"
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <ThumbsDown size={12} strokeWidth={1.8} />
        </button>

        {/* Expand source */}
        {(memory.source_user || memory.source_ai) && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
            title="View source conversation"
          >
            <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}

        {/* Delete */}
        <button
          id={`mem-delete-${memory.id}`}
          onClick={handleDelete}
          disabled={deleting}
          title="Delete memory"
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
        >
          <Trash2 size={12} strokeWidth={1.8} />
        </button>
      </div>

      {/* Expanded source */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mx-4 mb-4 p-3 bg-slate-50 rounded-xl space-y-2 text-[11px]">
              {memory.source_user && (
                <div>
                  <span className="font-semibold text-slate-500">You: </span>
                  <span className="text-slate-700">{memory.source_user.slice(0, 200)}</span>
                </div>
              )}
              {memory.source_ai && (
                <div>
                  <span className="font-semibold text-violet-500">Aria: </span>
                  <span className="text-slate-700">{memory.source_ai.slice(0, 200)}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function MemoryPage() {
  const { user } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [stats, setStats] = useState({ total: 0, avgScore: 0, topType: '' });

  // ── Same session ID logic as chat page ──
  const sessionId = user?.id ?? (() => {
    try {
      let gid = localStorage.getItem('aria_guest_id');
      if (!gid) { gid = crypto.randomUUID(); localStorage.setItem('aria_guest_id', gid); }
      return `guest_${gid}`;
    } catch { return 'guest_anonymous'; }
  })();

  const fetchMemories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rag/memories?sessionId=${encodeURIComponent(sessionId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { memories: mems } = await res.json() as { memories: Memory[] };
      setMemories(mems || []);

      // Compute stats
      if (mems && mems.length > 0) {
        const avg = mems.reduce((a: number, m: Memory) => a + m.score, 0) / mems.length;
        const typeCounts = mems.reduce((acc: Record<string, number>, m: Memory) => {
          acc[m.chunk_type] = (acc[m.chunk_type] || 0) + 1; return acc;
        }, {} as Record<string, number>);
        const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
        setStats({ total: mems.length, avgScore: avg, topType });
      } else {
        setStats({ total: 0, avgScore: 0, topType: '' });
      }
    } catch (err) {
      console.error('[Memory Page] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { fetchMemories(); }, [fetchMemories]);

  const handleDelete = (id: string) => {
    setMemories(prev => prev.filter(m => m.id !== id));
  };

  const handleRate = (id: string, rating: 1 | -1) => {
    setMemories(prev => prev.map(m => {
      if (m.id !== id) return m;
      const norm = rating === 1 ? 5 : 0;
      return { ...m, score: Math.round((m.score * 0.8 + norm * 0.2) * 100) / 100 };
    }));
  };

  const filtered = memories.filter(m => {
    const matchType = filterType === 'all' || m.chunk_type === filterType;
    const matchSearch = !search || m.content.toLowerCase().includes(search.toLowerCase())
      || m.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchType && matchSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <title>Memory — Aria AI</title>

      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-200">
              <Brain size={20} className="text-white" strokeWidth={1.8} />
            </div>
            <div>
              <h1 className="text-[18px] font-bold text-slate-900">Aria Memory</h1>
              <p className="text-[12px] text-slate-500">Knowledge learned from your conversations</p>
            </div>
            <button
              id="memory-refresh"
              onClick={fetchMemories}
              disabled={loading}
              className="ml-auto p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Total Memories', value: stats.total, icon: Database, color: 'text-slate-600' },
              { label: 'Avg Score', value: stats.avgScore.toFixed(1), icon: Sparkles, color: 'text-violet-500' },
              { label: 'Most Common', value: stats.topType ? TYPE_CONFIG[stats.topType as keyof typeof TYPE_CONFIG]?.label || stats.topType : '—', icon: Brain, color: 'text-blue-500' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-slate-50 rounded-2xl px-3 py-3 text-center border border-slate-100">
                <Icon size={14} className={`mx-auto mb-1 ${color}`} strokeWidth={1.8} />
                <p className="text-[16px] font-bold text-slate-900">{value}</p>
                <p className="text-[10px] text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          {/* Search + filter */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="memory-search"
                type="text"
                placeholder="Search memories..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-violet-300 focus:bg-white transition-colors"
              />
            </div>
            <div className="flex gap-1">
              {['all', 'qa', 'code', 'style', 'fact'].map(type => (
                <button
                  key={type}
                  id={`filter-${type}`}
                  onClick={() => setFilterType(type)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold capitalize transition-colors ${
                    filterType === type
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Memory list */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw size={24} className="animate-spin text-slate-300" />
            <p className="text-[13px] text-slate-400">Loading memories...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center">
              <Brain size={28} className="text-slate-300" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-slate-600">
                {search || filterType !== 'all' ? 'No matching memories' : 'No memories yet'}
              </p>
              <p className="text-[13px] text-slate-400 mt-1">
                {search || filterType !== 'all'
                  ? 'Try a different search or filter'
                  : 'Start chatting with Aria — she\'ll learn from your conversations automatically'}
              </p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {filtered.map(memory => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  onDelete={handleDelete}
                  onRate={handleRate}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
