import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Optimized Supabase client configuration for faster loading
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Faster initial load
    flowType: 'pkce'
  },
  realtime: {
    params: {
      eventsPerSecond: 2 // Reduced for better performance
    }
  },
  global: {
    headers: {
      'x-client-info': 'flexboard-app'
    },
    fetch: (url, options = {}) => {
      // Optimized fetch with increased timeout for better reliability
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // Increased to 60 seconds
      
      return fetch(url, {
        ...options,
        signal: controller.signal,
        // Add performance optimizations
        keepalive: true,
        cache: 'no-cache'
      }).finally(() => {
        clearTimeout(timeoutId);
      });
    }
  },
  db: {
    schema: 'public'
  }
});