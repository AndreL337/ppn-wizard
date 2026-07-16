'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User } from '@supabase/supabase-js';

interface SupabaseAuthProps {
  onSessionActive?: (user: User | null) => void;
}

export default function SupabaseAuth({ onSessionActive }: SupabaseAuthProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const activeUser = session?.user ?? null;
      setUser(activeUser);
      if (onSessionActive) onSessionActive(activeUser);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const activeUser = session?.user ?? null;
      setUser(activeUser);
      if (onSessionActive) onSessionActive(activeUser);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [onSessionActive]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({
          type: 'success',
          text: '✅ Check your email for the magic login link! Click the link to automatically sign in.',
        });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'An unexpected error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      if (onSessionActive) onSessionActive(null);
      setMessage({ type: 'success', text: 'Successfully logged out.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-4 transition-all">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 text-white rounded-full p-2.5 shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-black uppercase tracking-wider text-emerald-800">Save &amp; Resume Active</p>
            <p className="text-sm text-slate-700 font-medium">
              Signed in as <strong className="text-slate-900 font-bold">{user.email}</strong>
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={loading}
          type="button"
          className="bg-white hover:bg-slate-50 text-slate-700 hover:text-red-600 border border-slate-200 hover:border-red-200 text-xs font-extrabold uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-sm active:scale-95"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
      <div className="space-y-1.5">
        <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Save &amp; Resume Your Draft
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
          Don't lose your progress. Enter your business email below to receive a passwordless magic login link. After signing in, you can save your draft to the cloud and resume from any device.
        </p>
      </div>

      <form onSubmit={handleLogin} className="flex flex-col sm:flex-row gap-3 items-stretch max-w-xl">
        <div className="relative flex-1">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            required
            disabled={loading}
            className="w-full bg-slate-50/50 hover:bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white text-slate-800 rounded-xl px-4 py-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-[#006D5B] hover:bg-[#005749] disabled:bg-slate-300 text-white font-extrabold text-xs uppercase tracking-widest px-6 py-3 sm:py-0 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
          style={{ minHeight: '48px' }}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Sending...
            </>
          ) : (
            'Get Magic Link'
          )}
        </button>
      </form>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold leading-relaxed border ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
              : 'bg-rose-50 border-rose-100 text-rose-800'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
