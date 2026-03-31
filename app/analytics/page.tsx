'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, MessageSquare, BarChart2, Zap, TrendingUp, Calendar, Menu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { SidebarNavigation } from '@/components/ui/SidebarNavigation';
import toast from 'react-hot-toast';

interface DayStat { date: string; count: number; }
interface ModelStat { model: string; count: number; }

function StatCard({ icon: Icon, label, value, sub, color = '#bcaaed' }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-5 border border-black/5 shadow-sm"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}25` }}>
          <Icon size={18} style={{ color }} strokeWidth={1.8} />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900 mb-0.5">{value}</p>
      <p className="text-[13px] font-medium text-slate-700">{label}</p>
      {sub && <p className="text-[12px] text-slate-400 mt-0.5">{sub}</p>}
    </motion.div>
  );
}

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] text-slate-500 w-24 truncate shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full rounded-full" style={{ background: color }}
        />
      </div>
      <span className="text-[12px] font-semibold text-slate-600 w-6 text-right shrink-0">{value}</span>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, signOut, displayName } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [totalChats, setTotalChats] = useState(0);
  const [totalMessages, setTotalMessages] = useState(0);
  const [userMessages, setUserMessages] = useState(0);
  const [aiMessages, setAiMessages] = useState(0);
  const [modelStats, setModelStats] = useState<ModelStat[]>([]);
  const [dayStats, setDayStats] = useState<DayStat[]>([]);
  const [avgPerChat, setAvgPerChat] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    async function loadStats() {
      if (user) {
        // Total chats
        const { count: chatCount } = await supabase.from('chats').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
        setTotalChats(chatCount ?? 0);

        // Messages
        const { data: msgs } = await supabase
          .from('messages')
          .select('role, model_used, created_at')
          .in('chat_id', (await supabase.from('chats').select('id').eq('user_id', user.id)).data?.map(c => c.id) ?? []);

        if (msgs) {
          setTotalMessages(msgs.length);
          setUserMessages(msgs.filter(m => m.role === 'user').length);
          setAiMessages(msgs.filter(m => m.role === 'assistant').length);
          setAvgPerChat(chatCount && chatCount > 0 ? Math.round(msgs.length / chatCount) : 0);

          // Model breakdown
          const modelMap: Record<string, number> = {};
          msgs.filter(m => m.role === 'assistant' && m.model_used).forEach(m => {
            const k = m.model_used.toUpperCase();
            modelMap[k] = (modelMap[k] || 0) + 1;
          });
          setModelStats(Object.entries(modelMap).map(([model, count]) => ({ model, count })).sort((a, b) => b.count - a.count));

          // Last 7 days activity
          const now = new Date();
          const days: DayStat[] = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().slice(0, 10);
            const count = msgs.filter(m => m.created_at.slice(0, 10) === dateStr).length;
            days.push({ date: d.toLocaleDateString([], { weekday: 'short' }), count });
          }
          setDayStats(days);
        }
      } else {
        // Guest — local stats
        try {
          const chats = JSON.parse(localStorage.getItem('aria_local_chats') || '[]');
          setTotalChats(chats.length);
          let totalMsg = 0;
          let userMsg = 0;
          let aiMsg = 0;
          chats.forEach((chat: any) => {
            const msgs = JSON.parse(localStorage.getItem(`aria_chat_${chat.id}`) || '[]');
            totalMsg += msgs.length;
            userMsg += msgs.filter((m: any) => m.role === 'user').length;
            aiMsg += msgs.filter((m: any) => m.role === 'assistant').length;
          });
          setTotalMessages(totalMsg);
          setUserMessages(userMsg);
          setAiMessages(aiMsg);
          setAvgPerChat(chats.length > 0 ? Math.round(totalMsg / chats.length) : 0);
        } catch {}
      }
      setLoading(false);
    }
    loadStats();
  }, [user]);

  const maxDay = Math.max(...dayStats.map(d => d.count), 1);
  const maxModel = Math.max(...modelStats.map(m => m.count), 1);
  const MODEL_COLORS: Record<string, string> = { GROQ: '#9fd1fc', GEMINI: '#bcaaed', OPENROUTER: '#f9c784', AUTO: '#a8e6cf' };

  return (
    <div className="min-h-screen flex w-full bg-[var(--aria-bg)]">
      <SidebarNavigation isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} user={user} displayName={displayName} onSignOut={async () => { await signOut(); toast.success('Signed out'); }} />

      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 lg:px-10 py-4 border-b border-black/5 sticky top-0 bg-[var(--aria-bg)] z-10">
          <button onClick={() => router.push('/')} className="p-2 text-slate-500 hover:text-slate-800 rounded-xl transition-colors">
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
          <div className="flex items-center gap-2">
            <BarChart2 size={20} className="text-slate-600" strokeWidth={1.5} />
            <h1 className="font-bold text-slate-900 text-lg">Analytics</h1>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden ml-auto p-2 text-slate-500 rounded-xl">
            <Menu size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 lg:px-10 py-8 max-w-4xl w-full mx-auto">
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Stats grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={MessageSquare} label="Total Chats" value={totalChats} color="#9fd1fc" />
                <StatCard icon={Zap} label="Total Messages" value={totalMessages} color="#bcaaed" />
                <StatCard icon={TrendingUp} label="Your Messages" value={userMessages} sub={`${aiMessages} AI responses`} color="#a8e6cf" />
                <StatCard icon={Calendar} label="Avg per Chat" value={avgPerChat} sub="messages" color="#f9c784" />
              </div>

              {/* Weekly activity */}
              {dayStats.length > 0 && (
                <div className="bg-white rounded-2xl p-6 border border-black/5 shadow-sm">
                  <h3 className="font-semibold text-slate-900 mb-5">Last 7 Days Activity</h3>
                  <div className="space-y-3">
                    {dayStats.map(d => (
                      <MiniBar key={d.date} label={d.date} value={d.count} max={maxDay} color="#9fd1fc" />
                    ))}
                  </div>
                </div>
              )}

              {/* Model usage */}
              {modelStats.length > 0 && (
                <div className="bg-white rounded-2xl p-6 border border-black/5 shadow-sm">
                  <h3 className="font-semibold text-slate-900 mb-5">Model Usage</h3>
                  <div className="space-y-3">
                    {modelStats.map(m => (
                      <MiniBar key={m.model} label={m.model} value={m.count} max={maxModel} color={MODEL_COLORS[m.model] || '#bcaaed'} />
                    ))}
                  </div>
                </div>
              )}

              {!user && (
                <div className="bg-slate-50 rounded-2xl p-6 border border-black/5 text-center">
                  <p className="text-slate-500 text-sm mb-3">Sign in to unlock full analytics with cloud history sync.</p>
                  <button onClick={() => router.push('/auth')} className="btn-dark px-5 py-2.5 rounded-full text-sm">Sign In</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
