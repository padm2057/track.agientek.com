import React, { useState, useEffect } from 'react';
import { getSupabase, hasSupabaseConfig } from '../utils/supabaseClient';
import { ProjectPlan } from '../types';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectData: ProjectPlan;
  onLoadProject: (data: ProjectPlan) => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ 
    isOpen, 
    onClose, 
    projectData, 
    onLoadProject 
}) => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [statusMsg, setStatusMsg] = useState<{type: 'error'|'success', text: string} | null>(null);
  
  // Config State
  const [isConfigured, setIsConfigured] = useState(false);
  const [configUrl, setConfigUrl] = useState('');
  const [configKey, setConfigKey] = useState('');

  // 1. Check Configuration & Session on Mount
  useEffect(() => {
    if (!isOpen) return;

    const checkConfig = () => {
        const configured = hasSupabaseConfig();
        setIsConfigured(configured);

        if (configured) {
            const client = getSupabase();
            if (client) {
                client.auth.getSession().then(({ data: { session } }) => setSession(session));
                const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
                    setSession(session);
                });
                return () => subscription.unsubscribe();
            }
        }
    };

    checkConfig();
  }, [isOpen]);

  // 2. Handle Manual Configuration Save
  const handleSaveConfig = (e: React.FormEvent) => {
      e.preventDefault();
      if (!configUrl || !configKey) {
          setStatusMsg({ type: 'error', text: 'Both URL and Key are required.' });
          return;
      }
      
      // Attempt to init
      const client = getSupabase(configUrl, configKey);
      if (client) {
          setIsConfigured(true);
          setStatusMsg(null);
      } else {
          setStatusMsg({ type: 'error', text: 'Failed to initialize Supabase client.' });
      }
  };

  // 3. Handle Login (Magic Link)
  const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setStatusMsg(null);
      
      const client = getSupabase();
      if (!client) {
          setStatusMsg({ type: 'error', text: 'Supabase configuration missing.' });
          setLoading(false);
          return;
      }

      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin }
      });

      if (error) {
          setStatusMsg({ type: 'error', text: error.message });
      } else {
          setStatusMsg({ type: 'success', text: 'Check your email for the login link!' });
      }
      setLoading(false);
  };

  // 4. Handle Save (Sends JWT to n8n)
  const handleSaveToN8n = async () => {
      if (!session) return;
      setLoading(true);
      
      try {
        const { access_token } = session; 

        // REPLACE WITH YOUR ACTUAL N8N WEBHOOK URL
        const N8N_WEBHOOK_URL = 'https://your-n8n-instance.com/webhook/sync-project';

        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}` 
            },
            body: JSON.stringify({
                project_id: projectData.id,
                name: projectData.smart_goal,
                data: projectData
            })
        });

        if (!response.ok) throw new Error('Sync failed');

        setStatusMsg({type: 'success', text: "Project synced to cloud securely!"});
        
      } catch (err: any) {
          console.error(err);
          setStatusMsg({type: 'error', text: "Save failed. Check console."});
      } finally {
          setLoading(false);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 flex flex-col transition-all">
        
        {/* Header - Changed bg to white to match user request for lighter dialog */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-950 rounded-t-xl">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Cloud Sync</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        {/* Content */}
        <div className="p-6">
            {statusMsg && (
                <div className={`mb-4 p-3 rounded text-sm font-bold ${statusMsg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {statusMsg.text}
                </div>
            )}

            {!isConfigured ? (
               // VIEW 0: CONFIGURATION FORM
               <form onSubmit={handleSaveConfig} className="space-y-4">
                   <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-100 dark:border-amber-900/30 mb-4">
                        <p className="text-amber-800 dark:text-amber-200 font-bold text-sm">Supabase Not Detected</p>
                        <p className="text-amber-600 dark:text-amber-400 text-xs mt-1">
                            Environment variables missing. Please enter your project details below to connect manually.
                        </p>
                   </div>

                   <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project URL</label>
                        <input 
                            type="text" 
                            required
                            value={configUrl}
                            onChange={(e) => setConfigUrl(e.target.value)}
                            placeholder="https://xyz.supabase.co"
                            className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                   </div>

                   <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Anon Key</label>
                        <input 
                            type="password" 
                            required
                            value={configKey}
                            onChange={(e) => setConfigKey(e.target.value)}
                            placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                            className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                   </div>

                   <button 
                        type="submit" 
                        className="w-full py-2 bg-slate-800 hover:bg-slate-900 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 text-white rounded font-bold"
                    >
                        Save & Connect
                    </button>
               </form>

            ) : !session ? (
                // VIEW 1: LOGIN FORM
                <form onSubmit={handleLogin} className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Sign in to save your projects.</p>
                    <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold"
                    >
                        {loading ? 'Sending Link...' : 'Send Magic Link'}
                    </button>
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                         <button 
                            type="button"
                            onClick={() => {
                                // Clear config to allow re-entry
                                localStorage.removeItem('dt_supabase_url');
                                localStorage.removeItem('dt_supabase_key');
                                setIsConfigured(false);
                            }}
                            className="text-xs text-slate-400 hover:text-slate-600 underline"
                        >
                            Reset Configuration
                        </button>
                    </div>
                </form>
            ) : (
                // VIEW 2: SYNC ACTIONS
                <div className="space-y-6">
                    <div className="text-center">
                        <p className="text-sm text-slate-500">Logged in as {session.user.email}</p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-2">Current Project</div>
                        <div className="font-bold text-slate-800 dark:text-slate-100 mb-4 truncate">{projectData.smart_goal}</div>
                        
                        <button 
                            onClick={handleSaveToN8n}
                            disabled={loading}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold shadow-sm"
                        >
                            {loading ? 'Syncing...' : 'Push to n8n (Secure)'}
                        </button>
                    </div>

                    <button onClick={() => {
                        const client = getSupabase();
                        client?.auth.signOut();
                    }} className="text-xs text-slate-400 hover:text-slate-600 underline w-full text-center">
                        Sign Out
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};