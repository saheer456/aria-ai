'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

type Mode = 'signin' | 'signup';

export default function AuthPage() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    if (mode === 'signup') {
      if (!name.trim()) { toast.error('Please enter your name'); return; }
      if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
      if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    }

    setLoading(true);

    if (mode === 'signin') {
      const { error } = await signIn(email, password);
      if (error) { toast.error(error); }
      else { toast.success('Welcome back!'); router.push('/'); }
    } else {
      const { error } = await signUp(email, password, name.trim());
      if (error) { toast.error(error); }
      else {
        toast.success(`Account created! Welcome, ${name.trim().split(' ')[0]} 🎉`);
        router.push('/');
      }
    }

    setLoading(false);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setPassword('');
    setConfirmPassword('');
    setName('');
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--auth-gradient)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-[90vw] max-w-[400px] relative z-10 bg-white/30 backdrop-blur-xl rounded-[28px] px-8 py-10 shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-white/40"
      >
        {/* Brand */}
        <h1 className="text-4xl font-semibold text-center text-slate-900 mb-8 tracking-tight">Aria</h1>

        {/* Mode tabs */}
        <div className="flex bg-black/5 rounded-xl p-1 mb-7">
          <button
            onClick={() => switchMode('signin')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'signin' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => switchMode('signup')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'signup' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Name field — sign up only */}
          <AnimatePresence>
            {mode === 'signup' && (
              <motion.div
                key="name"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required={mode === 'signup'}
                  autoFocus
                  className="w-full bg-transparent border-b border-slate-900/20 pb-2 text-slate-900 placeholder-slate-500/70 text-[15px] focus:outline-none focus:border-slate-900 transition-colors"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full bg-transparent border-b border-slate-900/20 pb-2 text-slate-900 placeholder-slate-500/70 text-[15px] focus:outline-none focus:border-slate-900 transition-colors"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={6}
            className="w-full bg-transparent border-b border-slate-900/20 pb-2 text-slate-900 placeholder-slate-500/70 text-[15px] focus:outline-none focus:border-slate-900 transition-colors"
          />

          <AnimatePresence>
            {mode === 'signup' && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  required={mode === 'signup'}
                  minLength={6}
                  className="w-full bg-transparent border-b border-slate-900/20 pb-2 text-slate-900 placeholder-slate-500/70 text-[15px] focus:outline-none focus:border-slate-900 transition-colors"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-dark py-3.5 rounded-full text-[15px] font-semibold mt-2 disabled:opacity-60"
          >
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-[13px] text-slate-500 hover:text-slate-800 transition-colors"
          >
            Continue without account →
          </button>
        </div>
      </motion.div>

      {/* SVG House Scenery */}
      <div className="absolute bottom-0 left-0 w-full h-[30vh] pointer-events-none z-0">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <polygon points="0,100 0,60 15,40 30,60 30,100" fill="#a4addf" />
          <polygon points="15,40 30,60 15,60" fill="#8c97cf" opacity="0.6" />
          <rect x="7" y="70" width="6" height="6" fill="#fdfbf6" opacity="0.8" />
          <polygon points="65,100 65,75 75,60 85,75 85,100" fill="#a4addf" />
          <polygon points="80,100 80,65 92,45 100,60 100,100" fill="#b0b7e5" />
          <rect x="88" y="65" width="5" height="5" fill="#fcf8ef" opacity="0.8" />
          <rect x="0" y="97" width="100" height="3" fill="#8c97cf" />
        </svg>
      </div>
    </div>
  );
}
