'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Settings, User, Lock, Cpu, Trash2, Check, Menu, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { SidebarNavigation } from '@/components/ui/SidebarNavigation';
import toast from 'react-hot-toast';

const MODELS = [
  { key: 'auto',        label: 'Auto (Best available)',         desc: 'Tries Groq → HuggingFace → OpenRouter' },
  { key: 'groq',        label: 'Groq — Llama 3.3 70B',         desc: 'Fast and capable' },
  { key: 'huggingface', label: 'HuggingFace — Llama 3.1 8B',   desc: 'Free · No quota limits' },
  { key: 'openrouter',  label: 'OpenRouter — Free models',      desc: 'Community free tier' },
  { key: 'image',       label: 'Image Gen — Pollinations AI',   desc: 'Text-to-image · Free' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-black/5">
        <h3 className="font-semibold text-slate-900 text-[15px]">{title}</h3>
      </div>
      <div className="px-6 py-5">{children}</div>
    </motion.div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOut, displayName } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const supabase = createClient();

  // Profile
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  // Default model
  const [defaultModel, setDefaultModel] = useState('auto');

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      const savedName = (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || '';
      setName(savedName);
    }
    try {
      const m = localStorage.getItem('aria_model');
      if (m) setDefaultModel(m);
    } catch {}
  }, [user]);

  const saveName = async () => {
    if (!name.trim()) return;
    setSavingName(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: name.trim() } });
    if (error) toast.error(error.message);
    else toast.success('Name updated!');
    setSavingName(false);
  };

  const savePassword = async () => {
    if (!newPassword || newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else { toast.success('Password updated!'); setNewPassword(''); setCurrentPassword(''); }
    setSavingPw(false);
  };

  const saveModel = (key: string) => {
    setDefaultModel(key);
    try { localStorage.setItem('aria_model', key); } catch {}
    toast.success('Default model saved');
  };

  const deleteAccount = async () => {
    toast.error('Account deletion requires admin access. Contact khansaheer424@gmail.com');
    setDeleteConfirm(false);
  };

  const clearLocalData = () => {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('aria_'));
      keys.forEach(k => localStorage.removeItem(k));
      toast.success('Local data cleared');
    } catch { toast.error('Failed to clear data'); }
  };

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
            <Settings size={20} className="text-slate-600" strokeWidth={1.5} />
            <h1 className="font-bold text-slate-900 text-lg">Settings</h1>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden ml-auto p-2 text-slate-500 rounded-xl">
            <Menu size={20} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 px-6 lg:px-10 py-8 max-w-2xl w-full mx-auto space-y-5">

          {/* Profile */}
          <Section title="Profile">
            {user ? (
              <div className="space-y-4">
                <div>
                  <label className="text-[12px] text-slate-400 font-medium mb-1.5 block">Display Name</label>
                  <div className="flex gap-3">
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] text-slate-800 focus:outline-none focus:border-slate-400"
                      placeholder="Your name"
                    />
                    <button onClick={saveName} disabled={savingName}
                      className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-[13px] font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
                    >
                      {savingName ? '...' : 'Save'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[12px] text-slate-400 font-medium mb-1.5 block">Email</label>
                  <input
                    value={user.email || ''}
                    readOnly
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-slate-500 text-sm mb-3">Sign in to manage your profile</p>
                <button onClick={() => router.push('/auth')} className="btn-dark px-5 py-2.5 rounded-full text-sm">Sign In</button>
              </div>
            )}
          </Section>

          {/* Password */}
          {user && (
            <Section title="Change Password">
              <div className="space-y-4">
                <div>
                  <label className="text-[12px] text-slate-400 font-medium mb-1.5 block">New Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] text-slate-800 focus:outline-none focus:border-slate-400 pr-12"
                    />
                    <button onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button onClick={savePassword} disabled={savingPw || !newPassword}
                  className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-[13px] font-medium hover:bg-slate-700 disabled:opacity-40 transition-colors"
                >
                  {savingPw ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </Section>
          )}

          {/* Default Model */}
          <Section title="Default AI Model">
            <div className="space-y-2">
              {MODELS.map(m => (
                <button
                  key={m.key}
                  onClick={() => saveModel(m.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left
                    ${defaultModel === m.key ? 'border-slate-900 bg-slate-50' : 'border-transparent hover:bg-slate-50'}`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${defaultModel === m.key ? 'border-slate-900 bg-slate-900' : 'border-slate-300'}`}>
                    {defaultModel === m.key && <Check size={9} className="text-white" strokeWidth={3} />}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-slate-800">{m.label}</p>
                    <p className="text-[11px] text-slate-400">{m.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </Section>

          {/* Data & Privacy */}
          <Section title="Data & Privacy">
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-[13px] font-medium text-slate-800">Clear local data</p>
                  <p className="text-[11px] text-slate-400">Remove all locally cached chats and preferences</p>
                </div>
                <button onClick={clearLocalData} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-[12px] font-medium hover:bg-slate-50 transition-colors">
                  Clear
                </button>
              </div>

              {user && (
                <div className="flex items-center justify-between py-2 border-t border-black/5">
                  <div>
                    <p className="text-[13px] font-medium text-red-600">Delete account</p>
                    <p className="text-[11px] text-slate-400">Permanently remove your account and all data</p>
                  </div>
                  <button onClick={() => setDeleteConfirm(true)} className="px-4 py-2 border border-red-200 text-red-500 rounded-xl text-[12px] font-medium hover:bg-red-50 transition-colors">
                    Delete
                  </button>
                </div>
              )}
            </div>
          </Section>
        </div>
      </div>

      {/* Delete confirm modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center px-4"
            onClick={() => setDeleteConfirm(false)}
          >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <h3 className="font-bold text-slate-900 mb-2">Delete account?</h3>
              <p className="text-sm text-slate-500 mb-5">This cannot be undone. All your chats and data will be permanently deleted.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-[13px] text-slate-600 hover:bg-slate-50">Cancel</button>
                <button onClick={deleteAccount} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-[13px] font-medium hover:bg-red-600">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
