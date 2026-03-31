'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Menu, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatBubble } from '@/components/ui/ChatBubble';
import { SidebarNavigation } from '@/components/ui/SidebarNavigation';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model_used?: string;
  created_at: string;
}

interface ChatHistory { id: string; title: string; created_at: string; }

// ── Available models ───────────────────────────────────────────────────────
const MODELS = [
  { key: 'auto',        label: 'Auto',           desc: 'Best available' },
  { key: 'groq',        label: 'Groq (Llama 3)', desc: 'Fast & capable' },
  { key: 'gemini',      label: 'Gemini Flash',   desc: 'Google AI' },
  { key: 'openrouter',  label: 'OpenRouter',     desc: 'Llama 3.1 70B' },
] as const;

type ModelKey = typeof MODELS[number]['key'];

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params.id as string;
  const { user, signOut } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatTitle, setChatTitle] = useState('New Chat');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelKey>('auto');
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClient();

  // Load messages
  useEffect(() => {
    if (!chatId) return;
    if (user) {
      supabase.from('messages').select('*').eq('chat_id', chatId)
        .order('created_at', { ascending: true })
        .then(({ data, error }) => { if (!error && data) setMessages(data as Message[]); });
      supabase.from('chats').select('title').eq('id', chatId).single()
        .then(({ data }) => { if (data?.title) setChatTitle(data.title); });
    } else {
      try {
        const localMessages = JSON.parse(localStorage.getItem(`aria_chat_${chatId}`) || '[]');
        setMessages(localMessages);
        const localChats = JSON.parse(localStorage.getItem('aria_local_chats') || '[]');
        const chat = localChats.find((c: { id: string; title?: string }) => c.id === chatId);
        if (chat?.title) setChatTitle(chat.title);
      } catch { console.error('Failed to read local chat'); }
    }
  }, [chatId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Persist model choice
  useEffect(() => {
    try {
      const saved = localStorage.getItem('aria_model');
      if (saved) setSelectedModel(saved as ModelKey);
    } catch {}
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text, created_at: new Date().toISOString() };

    setMessages((prev) => {
      const next = [...prev, userMsg];
      if (!user) localStorage.setItem(`aria_chat_${chatId}`, JSON.stringify(next));
      return next;
    });

    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setIsLoading(true);

    // Auto-set title from first message
    if (messages.length === 0 && text.length > 3) {
      const newTitle = text.slice(0, 60);
      setChatTitle(newTitle);
      if (user) supabase.from('chats').update({ title: newTitle }).eq('id', chatId).then(() => {});
      else {
        try {
          const chats = JSON.parse(localStorage.getItem('aria_local_chats') || '[]');
          localStorage.setItem('aria_local_chats', JSON.stringify(
            chats.map((c: ChatHistory) => c.id === chatId ? { ...c, title: newTitle } : c)
          ));
        } catch {}
      }
    }

    if (user) supabase.from('messages').insert({ chat_id: chatId, role: 'user', content: text, model_used: null }).then(() => {});

    try {
      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, chatId, provider: selectedModel }),
      });

      if (!res.ok) throw new Error('API error');
      const data = await res.json();

      const aiMsg: Message = {
        id: crypto.randomUUID(), role: 'assistant',
        content: data.content, model_used: data.model,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => {
        const next = [...prev, aiMsg];
        if (!user) localStorage.setItem(`aria_chat_${chatId}`, JSON.stringify(next));
        return next;
      });

      if (user) supabase.from('messages').insert({ chat_id: chatId, role: 'assistant', content: data.content, model_used: data.model }).then(() => {});
    } catch {
      toast.error('Failed to get a response. Please check your API keys.');
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, user, chatId, supabase, selectedModel]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleSignOut = async () => { await signOut(); toast.success('Signed out'); };

  const activeModel = MODELS.find(m => m.key === selectedModel) || MODELS[0];

  return (
    <div className="min-h-screen flex w-full bg-[var(--aria-bg)]">
      <SidebarNavigation isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} user={user} onSignOut={handleSignOut} />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 lg:px-8 py-3 border-b border-black/5 bg-[var(--aria-bg)] sticky top-0 z-20 shrink-0">
          <button onClick={() => router.push('/')} className="p-2 text-slate-500 hover:text-slate-800 rounded-xl transition-colors">
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
          <span className="flex-1 font-semibold text-slate-800 text-[15px] truncate">{chatTitle}</span>
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-500 hover:text-slate-800 rounded-xl transition-colors">
            <Menu size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto" onClick={() => setModelDropdownOpen(false)}>
          <div className="max-w-3xl mx-auto px-4 lg:px-8 pt-6 pb-2">
            <AnimatePresence>
              {messages.length === 0 && !isLoading && (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-32 text-center"
                >
                  <div className="w-14 h-14 rounded-full bg-[#f0eadd] mb-4 flex items-center justify-center text-2xl">✨</div>
                  <h2 className="text-slate-800 font-semibold text-lg mb-1">Ready to chat</h2>
                  <p className="text-slate-400 text-sm">Type your message below to get started.</p>
                </motion.div>
              )}
            </AnimatePresence>

            {messages.map((msg) => (
              <ChatBubble key={msg.id} role={msg.role} content={msg.content} model={msg.model_used} timestamp={msg.created_at} />
            ))}

            {isLoading && (
              <div className="flex items-start gap-3 mb-5">
                <div className="w-7 h-7 rounded-full bg-[var(--aria-pastel-purple)] flex items-center justify-center text-[11px] font-bold text-slate-700 shrink-0">A</div>
                <div className="bubble-ai px-4 py-3 flex gap-1.5">
                  <div className="w-2 h-2 bg-slate-500/40 rounded-full typing-dot" />
                  <div className="w-2 h-2 bg-slate-500/40 rounded-full typing-dot" />
                  <div className="w-2 h-2 bg-slate-500/40 rounded-full typing-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input bar */}
        <div className="shrink-0 px-4 lg:px-8 pb-6 pt-3 bg-[var(--aria-bg)]">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-black/5">

              {/* Text area row */}
              <div className="flex items-end gap-3 px-4 pt-3 pb-1">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Message Aria..."
                  rows={1}
                  className="flex-1 bg-transparent text-[15px] text-slate-800 placeholder-slate-400 resize-none leading-relaxed focus:outline-none"
                  style={{ minHeight: '26px', maxHeight: '140px' }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isLoading}
                  className="p-2.5 bg-slate-900 rounded-xl text-white disabled:opacity-30 hover:bg-slate-700 transition-colors shrink-0 mb-1"
                >
                  <Send size={16} />
                </button>
              </div>

              {/* Model selector row */}
              <div className="flex items-center justify-between px-3 pb-2.5 pt-1 border-t border-black/4 mt-1 relative">
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setModelDropdownOpen(o => !o); }}
                    className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-800 font-medium px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                    {activeModel.label}
                    <ChevronDown size={12} className={`transition-transform ${modelDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown */}
                  <AnimatePresence>
                    {modelDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.97 }}
                        transition={{ duration: 0.12 }}
                        className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-xl shadow-lg border border-black/6 overflow-hidden z-30"
                      >
                        {MODELS.map((m) => (
                          <button
                            key={m.key}
                            onClick={() => {
                              setSelectedModel(m.key);
                              setModelDropdownOpen(false);
                              try { localStorage.setItem('aria_model', m.key); } catch {}
                            }}
                            className={`w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors ${selectedModel === m.key ? 'bg-slate-50' : ''}`}
                          >
                            <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${selectedModel === m.key ? 'bg-green-400' : 'bg-slate-200'}`} />
                            <div>
                              <p className="text-[13px] font-medium text-slate-800">{m.label}</p>
                              <p className="text-[11px] text-slate-400">{m.desc}</p>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <p className="text-[11px] text-slate-400">Enter ↵ to send · Shift+Enter for new line</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
