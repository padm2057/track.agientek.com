import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Singleton instance management
let supabaseInstance: SupabaseClient | null = null;
let currentConfig: { url: string; key: string } | null = null;

export const getSupabase = (url?: string, key?: string): SupabaseClient | null => {
    // 1. If arguments provided, attempt to initialize/overwrite
    if (url && key) {
        // Only recreate if config changed or instance missing
        if (!supabaseInstance || currentConfig?.url !== url || currentConfig?.key !== key) {
            try {
                supabaseInstance = createClient(url, key);
                currentConfig = { url, key };
                // Persist for convenience in this session
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('dt_supabase_url', url);
                    localStorage.setItem('dt_supabase_key', key);
                }
            } catch (e) {
                console.error("Failed to init supabase manually", e);
                return null;
            }
        }
        return supabaseInstance;
    }

    // 2. If already initialized, return it
    if (supabaseInstance) return supabaseInstance;

    // 3. Try to initialize from environment or storage
    let envUrl: string | undefined;
    let envKey: string | undefined;

    // Try Import Meta (Vite default)
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            // @ts-ignore
            envUrl = import.meta.env.VITE_SUPABASE_URL;
            // @ts-ignore
            envKey = import.meta.env.VITE_SUPABASE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
        }
    } catch (e) {}

    // Try Process Env (Node/Next/Polyfilled compat)
    try {
        if (!envUrl && typeof process !== 'undefined' && process && process.env) {
            envUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
            envKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
        }
    } catch (e) {}

    // Check Local Storage (User previous session override)
    if (typeof localStorage !== 'undefined') {
        const storedUrl = localStorage.getItem('dt_supabase_url');
        const storedKey = localStorage.getItem('dt_supabase_key');
        if (storedUrl && storedKey) {
            envUrl = storedUrl;
            envKey = storedKey;
        }
    }

    if (envUrl && envKey) {
        try {
            supabaseInstance = createClient(envUrl, envKey);
            currentConfig = { url: envUrl, key: envKey };
            return supabaseInstance;
        } catch (e) {
            console.warn("Invalid Supabase Config", e);
        }
    }

    return null;
};

export const clearSupabaseConfig = () => {
    supabaseInstance = null;
    currentConfig = null;
    if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('dt_supabase_url');
        localStorage.removeItem('dt_supabase_key');
    }
};

export const hasSupabaseConfig = (): boolean => {
    return !!getSupabase();
};

// Default export mainly for types or initial check, 
// but components should use getSupabase() to ensure they get the lazy-loaded instance.
let client: SupabaseClient | null = null;
try {
    client = getSupabase();
} catch (e) {
    console.warn("Supabase auto-init failed");
}

export const supabase = client;
