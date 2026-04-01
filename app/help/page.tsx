'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, HelpCircle, ChevronDown, Mail, MessageSquare, Zap, Shield, Globe, Menu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { SidebarNavigation } from '@/components/ui/SidebarNavigation';
import toast from 'react-hot-toast';

const FAQS = [
  {
    q: 'What AI models does Aria use?',
    a: 'Aria supports three providers: Groq (Llama 3.3 70B) for speed, Google Gemini 2.0 Flash for intelligence, and OpenRouter (Llama 3.1 70B). In Auto mode, Aria tries each in order and falls back if one is unavailable.',
  },
  {
    q: 'Do I need an account to use Aria?',
    a: 'No! You can chat anonymously without signing up. Your chats are stored locally in your browser. Sign in to sync your history across devices and access analytics.',
  },
  {
    q: 'Is my chat data private?',
    a: 'Absolutely. Your conversations are stored in your own Supabase database with Row Level Security — only you can access your data. We never share or sell your data.',
  },
  {
    q: 'How do I switch AI models?',
    a: 'In any chat, click the model pill (e.g. "Auto ▾") at the bottom-left of the input box. You can pick Groq, Gemini, OpenRouter, or leave it on Auto. Your preference is saved.',
  },
  {
    q: 'What does "Auto" mode mean?',
    a: 'Auto mode tries Groq first (fastest), then Gemini, then OpenRouter as fallbacks. This ensures you always get a response even if one provider is temporarily down.',
  },
  {
    q: 'Can I use Aria offline?',
    a: 'Aria requires an internet connection to query AI models. However, your chat history and preferences are cached locally and available offline to browse.',
  },
  {
    q: 'How do I delete my data?',
    a: 'Go to Settings → Data & Privacy → "Clear local data" to remove cached chats. For full account deletion, contact khansaheer424@gmail.com.',
  },
  {
    q: 'Why is the AI response slow sometimes?',
    a: 'Response speed depends on the selected model and provider load. Groq is typically fastest. If slow, try switching to a different model in the chat input.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-black/5 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-4 text-left gap-4"
      >
        <span className="text-[14px] font-medium text-slate-800">{q}</span>
        <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.p
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-[13px] text-slate-500 leading-relaxed pb-4 overflow-hidden"
          >
            {a}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HelpPage() {
  const router = useRouter();
  const { user, signOut, displayName } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) { toast.error('Please fill in all fields'); return; }
    const mailto = `mailto:khansaheer424@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    window.open(mailto, '_blank');
    toast.success('Opening your email client...');
    setSubject('');
    setMessage('');
  };

  const QUICK_LINKS = [
    { icon: MessageSquare, label: 'Start a new chat', action: () => router.push('/') },
    { icon: Zap, label: 'Switch AI model', action: () => toast('Open any chat → click model pill at bottom', { icon: '💡' }) },
    { icon: Shield, label: 'Privacy settings', action: () => router.push('/settings') },
    { icon: Globe, label: 'View analytics', action: () => router.push('/analytics') },
  ];

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
            <HelpCircle size={20} className="text-slate-600" strokeWidth={1.5} />
            <h1 className="font-bold text-slate-900 text-lg">Help & Support</h1>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden ml-auto p-2 text-slate-500 rounded-xl">
            <Menu size={20} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 px-6 lg:px-10 py-8 max-w-2xl w-full mx-auto space-y-8">

          {/* Quick links */}
          <div>
            <h2 className="text-[13px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {QUICK_LINKS.map(link => (
                <motion.button
                  key={link.label}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={link.action}
                  className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 text-left border border-black/5 hover:shadow-sm transition-all"
                >
                  <link.icon size={16} className="text-slate-500 shrink-0" strokeWidth={1.8} />
                  <span className="text-[13px] font-medium text-slate-700">{link.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div>
            <h2 className="text-[13px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Frequently Asked Questions</h2>
            <div className="bg-white rounded-2xl px-6 border border-black/5 shadow-sm">
              {FAQS.map((faq, i) => <FaqItem key={i} q={faq.q} a={faq.a} />)}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h2 className="text-[13px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Contact Support</h2>
            <div className="bg-white rounded-2xl p-6 border border-black/5 shadow-sm">
              <div className="flex items-center gap-3 mb-5 p-3 bg-slate-50 rounded-xl">
                <Mail size={16} className="text-slate-500 shrink-0" />
                <div>
                  <p className="text-[12px] text-slate-400">Email support</p>
                  <a href="mailto:khansaheer424@gmail.com" className="text-[13px] font-medium text-slate-800 hover:text-blue-600 transition-colors">
                    khansaheer424@gmail.com
                  </a>
                </div>
              </div>

              <form onSubmit={handleContact} className="space-y-4">
                <div>
                  <label className="text-[12px] text-slate-400 font-medium mb-1.5 block">Subject</label>
                  <input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="e.g. Bug report, Feature request"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] text-slate-800 focus:outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="text-[12px] text-slate-400 font-medium mb-1.5 block">Message</label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Describe your issue or question..."
                    rows={4}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] text-slate-800 focus:outline-none focus:border-slate-400 resize-none"
                  />
                </div>
                <button type="submit" className="w-full btn-dark py-3 rounded-xl text-[13px] font-medium">
                  Send via Email
                </button>
              </form>
            </div>
          </div>

          {/* Version */}
          <p className="text-center text-[11px] text-slate-400 pb-4">Aria AI Assistant · v1.5.0 'Aura' · Built with ❤️</p>
        </div>
      </div>
    </div>
  );
}
