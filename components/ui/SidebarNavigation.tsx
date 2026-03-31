'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, MessageSquare, BarChart2, Settings, Plug, HelpCircle,
  LogOut, ChevronDown, ChevronLeft, ChevronRight, Plus, X, User, Check, Loader2,
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

interface ChatItem { id: string; title: string; created_at: string; }
interface ApiStatus { id: string; name: string; status: 'online' | 'offline'; }

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  user: any;
  displayName?: string;
  onSignOut: () => void;
  onNewChat?: () => void;
}

export function SidebarNavigation({ isOpen = false, onClose, user, displayName, onSignOut, onNewChat }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [history, setHistory] = useState<ChatItem[]>([]);
  const [apiStatus, setApiStatus] = useState<ApiStatus[]>([]);
  const [apiLoading, setApiLoading] = useState(true);

  // Section expand states
  const [chatsOpen, setChatsOpen] = useState(true);
  const [apiOpen, setApiOpen] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    try {
      if (localStorage.getItem('aria_sidebar_collapsed') === 'true') setCollapsed(true);
    } catch {}

    // Fetch API status
    fetch('/api/status')
      .then(r => r.json())
      .then(d => { setApiStatus(d.models || []); setApiLoading(false); })
      .catch(() => setApiLoading(false));
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (user) {
      supabase.from('chats').select('id, title, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
        .then(({ data, error }) => { if (!error && data) setHistory(data as ChatItem[]); });
    } else {
      try {
        const local = JSON.parse(localStorage.getItem('aria_local_chats') || '[]');
        setHistory(local.slice(0, 20));
      } catch { setHistory([]); }
    }
  }, [user, mounted]);

  const nav = (path: string) => {
    if (!mounted) return;
    router.push(path);
    if (onClose) onClose();
  };

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem('aria_sidebar_collapsed', String(next)); } catch {}
  };

  const isActive = (path: string) => mounted && pathname === path;

  // ── Render a single nav row
  const NavRow = ({
    icon: Icon, label, path, badge, onClick, danger = false,
  }: { icon: any; label: string; path?: string; badge?: string; onClick?: () => void; danger?: boolean }) => (
    <button
      onClick={() => { if (onClick) onClick(); else if (path) nav(path); }}
      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-colors group
        ${collapsed ? 'justify-center' : ''}
        ${path && isActive(path) ? 'bg-slate-100 text-slate-900' : danger ? 'text-red-500 hover:bg-red-50' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
    >
      <Icon size={17} strokeWidth={1.8} className="shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1 text-[13px] font-medium">{label}</span>
          {badge && <span className="text-[11px] text-slate-400 font-medium">{badge}</span>}
        </>
      )}
    </button>
  );

  const renderContent = (mobile = false) => {
    const isCompact = collapsed && !mobile;

    return (
      <div className="flex flex-col h-full overflow-hidden">

        {/* ── Top bar: brand + collapse toggle ── */}
        <div className={`flex items-center px-4 pt-5 pb-3 ${isCompact ? 'justify-center' : 'justify-between'}`}>
          {!isCompact && (
            <span className="text-[15px] font-bold text-slate-900 tracking-tight">Aria</span>
          )}
          <div className="flex items-center gap-1">
            {mobile ? (
              <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            ) : (
              <button onClick={toggleCollapse} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
              </button>
            )}
          </div>
        </div>

        {/* ── Profile ── */}
        <div className={`flex items-center gap-3 mx-3 mb-4 px-3 py-3 bg-slate-50 rounded-2xl ${isCompact ? 'justify-center px-2' : ''}`}>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center shrink-0">
            <User size={18} className="text-white" strokeWidth={1.8} />
          </div>
          {!isCompact && (
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-slate-900 truncate">
                {displayName || (user ? user.email?.split('@')[0] : 'Guest')}
              </p>
              <p className="text-[11px] text-slate-400 truncate">{user ? user.email : 'Not signed in'}</p>
            </div>
          )}
        </div>

        {/* ── New Chat ── */}
        <div className="px-3 mb-3">
          <button
            onClick={() => { if (onNewChat) onNewChat(); else nav('/'); if (mobile && onClose) onClose(); }}
            className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-slate-900 text-white text-[13px] font-medium hover:bg-slate-700 transition-colors ${isCompact ? 'justify-center' : ''}`}
          >
            <Plus size={15} />
            {!isCompact && 'New Chat'}
          </button>
        </div>

        {/* ── Scrollable nav area ── */}
        <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-0.5">

          {/* Home */}
          <NavRow icon={Home} label="Home" path="/" />

          {/* ── Chats section ── */}
          {!isCompact ? (
            <div>
              <button
                onClick={() => setChatsOpen(o => !o)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <MessageSquare size={17} strokeWidth={1.8} className="shrink-0" />
                <span className="flex-1 text-[13px] font-medium text-left">Chats</span>
                {history.length > 0 && (
                  <span className="text-[11px] text-slate-400 font-medium mr-1">{history.length}</span>
                )}
                <ChevronDown size={13} className={`text-slate-400 transition-transform ${chatsOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {chatsOpen && history.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-7 mt-1 space-y-0.5 border-l border-slate-100 pl-3">
                      {history.map((chat) => (
                        <button
                          key={chat.id}
                          onClick={() => nav(`/chat/${chat.id}`)}
                          className={`w-full text-left px-2 py-1.5 rounded-lg text-[12px] transition-colors truncate
                            ${isActive(`/chat/${chat.id}`) ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                        >
                          {chat.title || 'New Chat'}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
                {chatsOpen && history.length === 0 && (
                  <p className="ml-10 mt-1 text-[11px] text-slate-400 pb-1">No chats yet</p>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <NavRow icon={MessageSquare} label="Chats" onClick={() => nav('/')} />
          )}

          {/* Divider */}
          {!isCompact && <div className="my-2 border-t border-black/5" />}

          {/* Analytics */}
          <NavRow icon={BarChart2} label="Analytics" path="/analytics" />

          {/* Settings */}
          <NavRow icon={Settings} label="Settings" path="/settings" />

          {/* ── API Connections ── */}
          {!isCompact ? (
            <div>
              <button
                onClick={() => setApiOpen(o => !o)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <Plug size={17} strokeWidth={1.8} className="shrink-0" />
                <span className="flex-1 text-[13px] font-medium text-left">API Connections</span>
                <ChevronDown size={13} className={`text-slate-400 transition-transform ${apiOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {apiOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-7 mt-1 space-y-1 border-l border-slate-100 pl-3 pb-1">
                      {apiLoading ? (
                        <div className="flex items-center gap-2 px-2 py-1.5">
                          <Loader2 size={12} className="animate-spin text-slate-400" />
                          <span className="text-[11px] text-slate-400">Checking...</span>
                        </div>
                      ) : apiStatus.length === 0 ? (
                        [
                          { name: 'Groq', status: 'unknown' },
                          { name: 'HuggingFace', status: 'unknown' },
                          { name: 'OpenRouter', status: 'unknown' },
                          { name: 'Image Gen', status: 'unknown' },
                        ].map(api => (
                          <div key={api.name} className="flex items-center gap-2 px-2 py-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            <span className="text-[12px] text-slate-500">{api.name}</span>
                          </div>
                        ))
                      ) : (
                        apiStatus.map((api) => (
                          <div key={api.id} className="flex items-center gap-2 px-2 py-1.5">
                            {api.status === 'online'
                              ? <Check size={12} className="text-green-500 shrink-0" />
                              : <div className="w-3 h-3 rounded-full border border-slate-200 shrink-0" />
                            }
                            <span className={`text-[12px] font-medium ${api.status === 'online' ? 'text-slate-700' : 'text-slate-400'}`}>
                              {api.name}
                            </span>
                            <span className={`ml-auto text-[10px] font-semibold uppercase tracking-wide ${api.status === 'online' ? 'text-green-500' : 'text-slate-400'}`}>
                              {api.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <NavRow icon={Plug} label="APIs" />
          )}

          {/* Help */}
          <NavRow icon={HelpCircle} label="Help & Support" path="/help" />
        </div>

        {/* ── Footer ── */}
        <div className="px-3 pt-2 pb-6 border-t border-black/5 mt-1">
          {user ? (
            <button
              onClick={() => { onSignOut(); if (mobile && onClose) onClose(); }}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-colors ${isCompact ? 'justify-center' : ''}`}
            >
              <LogOut size={16} strokeWidth={1.8} />
              {!isCompact && <span className="text-[13px] font-medium">Log out</span>}
            </button>
          ) : (
            <button
              onClick={() => nav('/auth')}
              className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-900 text-white text-[13px] font-medium hover:bg-slate-700 transition-colors`}
            >
              {!isCompact ? 'Sign In' : <User size={16} />}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* DESKTOP — persistent, collapsible */}
      <motion.aside
        animate={{ width: collapsed ? 68 : 248 }}
        transition={{ type: 'spring', damping: 28, stiffness: 200 }}
        className="hidden lg:flex flex-col h-screen sticky top-0 bg-white border-r border-black/5 shrink-0 overflow-hidden"
      >
        {renderContent(false)}
      </motion.aside>

      {/* MOBILE — overlay drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="lg:hidden">
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px]"
            />
            <motion.div
              key="drawer"
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed top-0 left-0 h-full w-[268px] z-50 flex flex-col bg-white border-r border-black/5 shadow-xl"
            >
              {renderContent(true)}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
