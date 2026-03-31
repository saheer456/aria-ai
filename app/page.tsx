'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Menu, ArrowRight, Code2, PenLine, Calculator, Lightbulb } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { SidebarNavigation } from '@/components/ui/SidebarNavigation';
import toast from 'react-hot-toast';

interface ChatHistory { id: string; title: string; created_at: string; }

function getGreeting(name: string, recentChats: ChatHistory[]): { heading: string; sub: string } {
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (recentChats.length > 0) {
    const last = recentChats[0];
    const title = last.title?.replace(/^new conversation$/i, '').trim();
    if (title) {
      return {
        heading: `${timeGreeting}, ${name}!`,
        sub: `Last time you explored "${title}". What's next?`,
      };
    }
    return {
      heading: `${timeGreeting}, ${name}!`,
      sub: 'Ready to continue where you left off?',
    };
  }

  return {
    heading: `${timeGreeting}, ${name}! 👋`,
    sub: "I'm Aria. Ask me anything — let's get started.",
  };
}

const QUICK_ACTIONS = [
  { label: 'Write code', icon: Code2, prompt: 'Help me write code for: ' },
  { label: 'Draft text', icon: PenLine, prompt: 'Help me write: ' },
  { label: 'Solve math', icon: Calculator, prompt: 'Solve this for me: ' },
  { label: 'Brainstorm', icon: Lightbulb, prompt: 'Help me brainstorm ideas about: ' },
];

export default function HomePage() {
  const router = useRouter();
  const { user, signOut, displayName } = useAuth();
  const [recentChats, setRecentChats] = useState<ChatHistory[]>([]);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (user) {
      supabase.from('chats').select('id, title, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)
        .then(({ data, error }) => { if (!error && data) setRecentChats(data as ChatHistory[]); });
    } else {
      try {
        const local = JSON.parse(localStorage.getItem('aria_local_chats') || '[]');
        setRecentChats(local.slice(0, 5));
      } catch { setRecentChats([]); }
    }
  }, [user]);

  const createChat = async (initialPrompt?: string) => {
    const title = initialPrompt ? initialPrompt.slice(0, 50) : 'New Conversation';

    if (!user) {
      const localId = crypto.randomUUID();
      const existing = JSON.parse(localStorage.getItem('aria_local_chats') || '[]');
      localStorage.setItem('aria_local_chats', JSON.stringify(
        [{ id: localId, title, created_at: new Date().toISOString() }, ...existing].slice(0, 15)
      ));
      router.push(`/chat/${localId}`);
      return;
    }

    const { data, error } = await supabase.from('chats')
      .insert({ user_id: user.id, title })
      .select('id').single();

    if (error || !data) {
      // Fallback to local
      const localId = crypto.randomUUID();
      const existing = JSON.parse(localStorage.getItem('aria_local_chats') || '[]');
      localStorage.setItem('aria_local_chats', JSON.stringify(
        [{ id: localId, title, created_at: new Date().toISOString() }, ...existing].slice(0, 15)
      ));
      router.push(`/chat/${localId}`);
      return;
    }
    router.push(`/chat/${data.id}`);
  };

  const handleSignOut = async () => { await signOut(); toast.success('Signed out'); };

  const { heading, sub } = getGreeting(displayName, recentChats);

  return (
    <div className="min-h-screen flex w-full bg-[var(--aria-bg)]">
      <SidebarNavigation
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        displayName={displayName}
        onSignOut={handleSignOut}
        onNewChat={() => createChat()}
      />

      {/* Main content — fills ALL remaining space */}
      <div className="flex-1 flex flex-col min-h-screen relative overflow-hidden">

        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-6 pt-8 pb-2">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <Menu size={24} strokeWidth={1.5} />
          </button>
          <span className="font-semibold text-slate-800">Aria</span>
          <div className="w-10" />
        </header>

        {/* Greeting section */}
        <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 pb-40 max-w-4xl w-full mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight mb-2">{heading}</h1>
            <p className="text-slate-500 text-base lg:text-lg mb-10">{sub}</p>

            {/* Main CTA */}
            <button
              onClick={() => createChat()}
              className="group w-full flex items-center gap-4 bg-white rounded-2xl px-6 py-5 mb-8 text-left transition-all hover:shadow-md"
              style={{ boxShadow: '0 2px 16px -4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)' }}
            >
              <div className="flex-1">
                <p className="text-[15px] text-slate-400 font-medium">Ask me anything...</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <ArrowRight size={16} className="text-white" />
              </div>
            </button>

            {/* Quick action cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {QUICK_ACTIONS.map((action) => (
                <motion.button
                  key={action.label}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => createChat(action.prompt)}
                  className="flex flex-col items-start gap-3 bg-white rounded-2xl px-4 py-4 text-left border border-black/5 hover:border-black/10 hover:shadow-sm transition-all"
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                    <action.icon size={16} className="text-slate-600" strokeWidth={1.8} />
                  </div>
                  <span className="text-[13px] font-medium text-slate-700">{action.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Mountain SVG background */}
        <div className="absolute bottom-0 left-0 right-0 h-[40%] pointer-events-none z-0">
          <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <polygon points="0,100 0,65 30,42 60,58 90,35 120,52 150,28 200,48 200,100" fill="#e9e6dd" opacity="0.5" />
            <polygon points="0,100 0,75 25,60 55,78 80,60 120,82 160,55 200,72 200,100" fill="#dedbcf" opacity="0.7" />
            <polygon points="0,100 0,88 40,72 80,90 110,70 150,88 200,78 200,100" fill="#d1cec3" />
          </svg>
        </div>
      </div>
    </div>
  );
}
