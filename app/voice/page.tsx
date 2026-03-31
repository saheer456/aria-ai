'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Mic, MicOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function VoicePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const supabase = createClient();

  const sendVoiceMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: text }] }),
      });
      const data = await res.json();
      setResponse(data.content);
    } catch {
      toast.error('Failed to get AI response');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const toggleListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice not supported in this browser');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      setIsListening(false);
      sendVoiceMessage(text);
    };
    recognition.onerror = () => {
      setIsListening(false);
      toast.error('Voice error — try again');
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
    recognitionRef.current = recognition;
  }, [isListening, sendVoiceMessage]);

  useEffect(() => {
    const timer = setTimeout(toggleListening, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveAndGoToChat = async () => {
    if (!transcript) return;
    const title = transcript.slice(0, 50);

    if (!user) {
      const localId = crypto.randomUUID();
      const existing = JSON.parse(localStorage.getItem('aria_local_chats') || '[]');
      localStorage.setItem(
        'aria_local_chats',
        JSON.stringify([{ id: localId, title, created_at: new Date().toISOString() }, ...existing].slice(0, 15))
      );
      const firstPair = [
        { id: crypto.randomUUID(), role: 'user', content: transcript, created_at: new Date().toISOString() },
        ...(response ? [{ id: crypto.randomUUID(), role: 'assistant', content: response, created_at: new Date().toISOString() }] : []),
      ];
      localStorage.setItem(`aria_chat_${localId}`, JSON.stringify(firstPair));
      router.push(`/chat/${localId}`);
      return;
    }

    const { data } = await supabase.from('chats').insert({ user_id: user.id, title }).select('id').single();
    if (data) {
      await supabase.from('messages').insert({ chat_id: data.id, role: 'user', content: transcript });
      if (response) {
        await supabase.from('messages').insert({ chat_id: data.id, role: 'assistant', content: response });
      }
      router.push(`/chat/${data.id}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between px-6 py-10 bg-[var(--aria-bg)]">

      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between">
        <button
          onClick={() => { recognitionRef.current?.stop(); router.push('/'); }}
          className="p-2 text-slate-500 hover:text-slate-800 rounded-xl transition-colors"
        >
          <ArrowLeft size={22} strokeWidth={1.5} />
        </button>
        <span className="font-semibold text-slate-800 text-[15px]">Voice Mode</span>
        <div className="w-10" />
      </div>

      {/* Orb area */}
      <div className="flex flex-col items-center gap-8 flex-1 justify-center w-full max-w-md">

        {/* Animated mic orb */}
        <motion.button
          onClick={toggleListening}
          className="relative w-28 h-28 rounded-full flex items-center justify-center"
          style={{ background: isListening ? 'var(--aria-pastel-purple)' : '#e8e4db' }}
          animate={isListening ? { scale: [1, 1.06, 1] } : { scale: 1 }}
          transition={{ duration: 1.4, repeat: isListening ? Infinity : 0 }}
        >
          {isListening
            ? <MicOff size={36} className="text-white" />
            : <Mic size={36} className="text-slate-500" />
          }
          {isListening && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: '2px solid var(--aria-pastel-purple)' }}
              animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            />
          )}
        </motion.button>

        <p className="text-slate-500 text-sm font-medium">
          {isListening ? '🎤 Listening...' : isProcessing ? '⏳ Thinking...' : 'Tap to speak'}
        </p>

        {/* Transcript card */}
        <AnimatePresence>
          {transcript && (
            <motion.div
              key="transcript"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full bg-white rounded-2xl px-5 py-4 shadow-sm border border-black/5"
            >
              <p className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wider">You said</p>
              <p className="text-slate-800 text-sm leading-relaxed">"{transcript}"</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading dots */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full bg-white rounded-2xl px-5 py-4 shadow-sm border border-black/5"
            >
              <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">Aria</p>
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-slate-300 rounded-full typing-dot" />
                <div className="w-2 h-2 bg-slate-300 rounded-full typing-dot" />
                <div className="w-2 h-2 bg-slate-300 rounded-full typing-dot" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI response */}
        <AnimatePresence>
          {response && !isProcessing && (
            <motion.div
              key="response"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full bg-white rounded-2xl px-5 py-4 shadow-sm border border-black/5"
            >
              <p className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wider">Aria</p>
              <p className="text-slate-800 text-sm leading-relaxed">{response}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="w-full max-w-md flex flex-col items-center gap-3">
        {transcript && !isProcessing && (
          <button
            onClick={saveAndGoToChat}
            className="w-full btn-dark py-4 rounded-2xl flex items-center justify-center gap-2 text-white font-medium"
          >
            <Send size={16} />
            Continue in Chat
          </button>
        )}
        <button
          onClick={() => { setTranscript(''); setResponse(''); }}
          className="text-slate-400 text-sm hover:text-slate-600 transition-colors"
        >
          Clear &amp; Start Over
        </button>
      </div>
    </div>
  );
}
