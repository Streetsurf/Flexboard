import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error(`Invalid Supabase URL format: ${supabaseUrl}`);
}

// Ultra-optimized Supabase client for maximum speed
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce'
  },
  realtime: {
    params: {
      eventsPerSecond: 10 // Increased for faster updates
    }
  },
  global: {
    headers: {
      'x-client-info': 'flexboard-app',
      'Cache-Control': 'max-age=300', // 5 minute cache
      'Prefer': 'return=minimal' // Reduce response size
    },
    fetch: (url, options = {}) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // Reduced to 10 seconds
      
      return fetch(url, {
        ...options,
        signal: controller.signal,
        // Ultra-fast fetch optimizations
        keepalive: false, // Disable keepalive for faster requests
        cache: 'force-cache', // Aggressive caching
        priority: 'high' // High priority requests
      }).finally(() => {
        clearTimeout(timeoutId);
      });
    }
  },
  db: {
    schema: 'public'
  }
});

// In-memory cache for ultra-fast access
const dataCache = new Map();
const cacheExpiry = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Ultra-fast cache functions
export const getCachedData = (key: string) => {
  const expiry = cacheExpiry.get(key);
  if (expiry && Date.now() > expiry) {
    dataCache.delete(key);
    cacheExpiry.delete(key);
    return null;
  }
  return dataCache.get(key);
};

export const setCachedData = (key: string, data: any) => {
  dataCache.set(key, data);
  cacheExpiry.set(key, Date.now() + CACHE_DURATION);
};

export const clearCache = () => {
  dataCache.clear();
  cacheExpiry.clear();
};

// Ultra-fast query builder with caching
export const fastQuery = async (table: string, options: any = {}) => {
  const cacheKey = `${table}_${JSON.stringify(options)}`;
  
  // Try cache first
  const cached = getCachedData(cacheKey);
  if (cached) {
    return { data: cached, error: null, fromCache: true };
  }
  
  try {
    let query = supabase.from(table);
    
    // Apply options
    if (options.select) query = query.select(options.select);
    if (options.eq) {
      Object.entries(options.eq).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    if (options.gte) {
      Object.entries(options.gte).forEach(([key, value]) => {
        query = query.gte(key, value);
      });
    }
    if (options.lte) {
      Object.entries(options.lte).forEach(([key, value]) => {
        query = query.lte(key, value);
      });
    }
    if (options.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending });
    }
    if (options.limit) query = query.limit(options.limit);
    
    const { data, error } = await query;
    
    if (!error && data) {
      setCachedData(cacheKey, data);
    }
    
    return { data, error, fromCache: false };
  } catch (error) {
    return { data: null, error, fromCache: false };
  }
};

// Test connection function with caching
export const testSupabaseConnection = async (): Promise<boolean> => {
  const cached = getCachedData('connection_test');
  if (cached) return cached;
  
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    const isConnected = !error;
    setCachedData('connection_test', isConnected);
    return isConnected;
  } catch (error) {
    console.error('Supabase connection test error:', error);
    return false;
  }
};

// Preload critical data
export const preloadCriticalData = async (userId: string) => {
  if (!userId) return;
  
  const today = new Date();
  const startDate = new Date(today);
  startDate.setMonth(startDate.getMonth() - 1);
  const endDate = new Date(today);
  endDate.setMonth(endDate.getMonth() + 1);
  
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  
  // Preload in parallel for maximum speed
  const preloadPromises = [
    fastQuery('todos', {
      select: 'id, title, completed, priority_score, date, actual_minutes, is_timer_active',
      eq: { user_id: userId },
      gte: { date: startDateStr },
      lte: { date: endDateStr },
      order: { column: 'priority_score', ascending: false }
    }),
    fastQuery('journal_entries', {
      select: '*',
      eq: { user_id: userId },
      gte: { date: startDateStr },
      lte: { date: endDateStr },
      order: { column: 'date', ascending: false }
    }),
    fastQuery('quick_links', {
      select: 'id, title, url, icon, open_in_app',
      eq: { user_id: userId },
      order: { column: 'created_at', ascending: true },
      limit: 10
    }),
    fastQuery('profiles', {
      select: '*',
      eq: { id: userId }
    })
  ];
  
  try {
    await Promise.all(preloadPromises);
    console.log('Critical data preloaded successfully');
  } catch (error) {
    console.error('Error preloading critical data:', error);
  }
};