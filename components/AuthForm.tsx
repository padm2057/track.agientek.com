import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export const AuthForm = ({ onLoginSuccess }: { onLoginSuccess: () => void }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!supabase) {
        setMessage({ type: 'error', text: 'Supabase configuration is missing. Cannot login.' });
        setLoading(false);
        return;
    }

    // Try to sign in with Magic Link (Passwordless is easiest for MVPs)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Check your email for the login link!' });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Sign In to Sync</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Save your project securely to the cloud.
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            placeholder="you@example.com"
          />
        </div>

        {message && (
          <div className={`text-sm p-2 rounded ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Sending Magic Link...' : 'Send Magic Link'}
        </button>
      </form>
    </div>
  );
};