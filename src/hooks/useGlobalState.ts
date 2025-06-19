import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface GlobalState {
  profile: any;
  todos: any[];
  journalEntries: any[];
  contentItems: any[];
  learningGoals: any[];
  quickLinks: any[];
  prompts: any[];
  calorieEntries: any[];
  workoutEntries: any[];
  weightEntries: any[];
  sleepEntries: any[];
  channels: any[];
}

interface GlobalStateHook {
  state: GlobalState;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  refreshTodos: () => Promise<void>;
  refreshJournalEntries: () => Promise<void>;
  refreshContentItems: () => Promise<void>;
  refreshLearningGoals: () => Promise<void>;
  refreshQuickLinks: () => Promise<void>;
  refreshPrompts: () => Promise<void>;
  refreshCalorieEntries: () => Promise<void>;
  refreshWorkoutEntries: () => Promise<void>;
  refreshWeightEntries: () => Promise<void>;
  refreshSleepEntries: () => Promise<void>;
  refreshChannels: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const initialState: GlobalState = {
  profile: null,
  todos: [],
  journalEntries: [],
  contentItems: [],
  learningGoals: [],
  quickLinks: [],
  prompts: [],
  calorieEntries: [],
  workoutEntries: [],
  weightEntries: [],
  sleepEntries: [],
  channels: []
};

export const useGlobalState = (): GlobalStateHook => {
  const [state, setState] = useState<GlobalState>(initialState);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  // Use refs to prevent unnecessary re-renders
  const isInitializedRef = useRef(false);
  const refreshingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  // Enhanced error handling wrapper with debouncing
  const withErrorHandling = async <T>(
    operation: () => Promise<T>,
    fallbackValue: T,
    operationName: string
  ): Promise<T> => {
    try {
      return await operation();
    } catch (error: any) {
      console.error(`Error in ${operationName}:`, error);
      
      // Handle specific error types
      if (error.name === 'AbortError') {
        console.warn(`${operationName} was aborted`);
      } else if (error.message?.includes('Failed to fetch')) {
        console.warn(`Network error in ${operationName}, using fallback`);
      }
      
      return fallbackValue;
    }
  };

  // Optimized state update function to prevent unnecessary re-renders
  const updateState = useCallback((updater: (prev: GlobalState) => GlobalState) => {
    setState(prev => {
      const newState = updater(prev);
      // Only update if there's actually a change
      if (JSON.stringify(newState) === JSON.stringify(prev)) {
        return prev;
      }
      return newState;
    });
  }, []);

  // Profile refresh with memoization
  const refreshProfile = useCallback(async () => {
    if (!user?.id || refreshingRef.current) return;
    
    await withErrorHandling(
      async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        
        updateState(prev => ({ ...prev, profile: data }));
      },
      undefined,
      'refreshProfile'
    );
  }, [user?.id, updateState]);

  // Todos refresh with memoization
  const refreshTodos = useCallback(async () => {
    if (!user?.id || refreshingRef.current) return;
    
    await withErrorHandling(
      async () => {
        const { data, error } = await supabase
          .from('todos')
          .select('*')
          .eq('user_id', user.id)
          .order('priority_score', { ascending: false });

        if (error) throw error;
        updateState(prev => ({ ...prev, todos: data || [] }));
      },
      undefined,
      'refreshTodos'
    );
  }, [user?.id, updateState]);

  // Journal entries refresh with memoization
  const refreshJournalEntries = useCallback(async () => {
    if (!user?.id || refreshingRef.current) return;
    
    await withErrorHandling(
      async () => {
        const { data, error } = await supabase
          .from('journal_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });

        if (error) throw error;
        updateState(prev => ({ ...prev, journalEntries: data || [] }));
      },
      undefined,
      'refreshJournalEntries'
    );
  }, [user?.id, updateState]);

  // Content items refresh with memoization
  const refreshContentItems = useCallback(async () => {
    if (!user?.id || refreshingRef.current) return;
    
    await withErrorHandling(
      async () => {
        const { data, error } = await supabase
          .from('content_items')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        updateState(prev => ({ ...prev, contentItems: data || [] }));
      },
      undefined,
      'refreshContentItems'
    );
  }, [user?.id, updateState]);

  // Learning goals refresh with memoization
  const refreshLearningGoals = useCallback(async () => {
    if (!user?.id || refreshingRef.current) return;
    
    await withErrorHandling(
      async () => {
        const { data, error } = await supabase
          .from('learning_goals')
          .select('*')
          .eq('user_id', user.id)
          .order('target_date', { ascending: true });

        if (error) throw error;
        updateState(prev => ({ ...prev, learningGoals: data || [] }));
      },
      undefined,
      'refreshLearningGoals'
    );
  }, [user?.id, updateState]);

  // Quick links refresh with memoization
  const refreshQuickLinks = useCallback(async () => {
    if (!user?.id || refreshingRef.current) return;
    
    await withErrorHandling(
      async () => {
        const { data, error } = await supabase
          .from('quick_links')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (error) throw error;
        updateState(prev => ({ ...prev, quickLinks: data || [] }));
      },
      undefined,
      'refreshQuickLinks'
    );
  }, [user?.id, updateState]);

  // Prompts refresh with memoization
  const refreshPrompts = useCallback(async () => {
    if (!user?.id || refreshingRef.current) return;
    
    await withErrorHandling(
      async () => {
        const { data, error } = await supabase
          .from('prompts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        updateState(prev => ({ ...prev, prompts: data || [] }));
      },
      undefined,
      'refreshPrompts'
    );
  }, [user?.id, updateState]);

  // Calorie entries refresh with memoization
  const refreshCalorieEntries = useCallback(async () => {
    if (!user?.id || refreshingRef.current) return;
    
    await withErrorHandling(
      async () => {
        const { data, error } = await supabase
          .from('calorie_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });

        if (error) throw error;
        updateState(prev => ({ ...prev, calorieEntries: data || [] }));
      },
      undefined,
      'refreshCalorieEntries'
    );
  }, [user?.id, updateState]);

  // Workout entries refresh with memoization
  const refreshWorkoutEntries = useCallback(async () => {
    if (!user?.id || refreshingRef.current) return;
    
    await withErrorHandling(
      async () => {
        const { data, error } = await supabase
          .from('workout_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });

        if (error) throw error;
        updateState(prev => ({ ...prev, workoutEntries: data || [] }));
      },
      undefined,
      'refreshWorkoutEntries'
    );
  }, [user?.id, updateState]);

  // Weight entries refresh with memoization
  const refreshWeightEntries = useCallback(async () => {
    if (!user?.id || refreshingRef.current) return;
    
    await withErrorHandling(
      async () => {
        const { data, error } = await supabase
          .from('weight_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });

        if (error) throw error;
        updateState(prev => ({ ...prev, weightEntries: data || [] }));
      },
      undefined,
      'refreshWeightEntries'
    );
  }, [user?.id, updateState]);

  // Sleep entries refresh with memoization
  const refreshSleepEntries = useCallback(async () => {
    if (!user?.id || refreshingRef.current) return;
    
    await withErrorHandling(
      async () => {
        const { data, error } = await supabase
          .from('sleep_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });

        if (error) throw error;
        updateState(prev => ({ ...prev, sleepEntries: data || [] }));
      },
      undefined,
      'refreshSleepEntries'
    );
  }, [user?.id, updateState]);

  // Channels refresh with memoization
  const refreshChannels = useCallback(async () => {
    if (!user?.id || refreshingRef.current) return;
    
    await withErrorHandling(
      async () => {
        const { data, error } = await supabase
          .from('channels')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        updateState(prev => ({ ...prev, channels: data || [] }));
      },
      undefined,
      'refreshChannels'
    );
  }, [user?.id, updateState]);

  // Optimized refresh all with debouncing
  const refreshAll = useCallback(async () => {
    if (!user?.id || refreshingRef.current) return;
    
    refreshingRef.current = true;
    setLoading(true);
    
    try {
      // Use Promise.allSettled to prevent one failure from stopping others
      const results = await Promise.allSettled([
        refreshProfile(),
        refreshTodos(),
        refreshJournalEntries(),
        refreshContentItems(),
        refreshLearningGoals(),
        refreshQuickLinks(),
        refreshPrompts(),
        refreshCalorieEntries(),
        refreshWorkoutEntries(),
        refreshWeightEntries(),
        refreshSleepEntries(),
        refreshChannels()
      ]);

      // Log any failures for debugging
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const operations = [
            'profile', 'todos', 'journal', 'content', 'learning',
            'quickLinks', 'prompts', 'calories', 'workouts', 'weight',
            'sleep', 'channels'
          ];
          console.warn(`Failed to refresh ${operations[index]}:`, result.reason);
        }
      });
      
      isInitializedRef.current = true;
    } catch (error) {
      console.error('Error refreshing all data:', error);
    } finally {
      setLoading(false);
      refreshingRef.current = false;
    }
  }, [
    user?.id,
    refreshProfile,
    refreshTodos,
    refreshJournalEntries,
    refreshContentItems,
    refreshLearningGoals,
    refreshQuickLinks,
    refreshPrompts,
    refreshCalorieEntries,
    refreshWorkoutEntries,
    refreshWeightEntries,
    refreshSleepEntries,
    refreshChannels
  ]);

  // Optimized initial data load with user change detection
  useEffect(() => {
    const currentUserId = user?.id;
    
    // Only refresh if user changed or not initialized
    if (currentUserId && (currentUserId !== lastUserIdRef.current || !isInitializedRef.current)) {
      lastUserIdRef.current = currentUserId;
      refreshAll();
    } else if (!currentUserId) {
      // Reset state when user logs out
      setState(initialState);
      setLoading(false);
      isInitializedRef.current = false;
      lastUserIdRef.current = null;
    }
  }, [user?.id, refreshAll]);

  // Debounced data update listener
  useEffect(() => {
    let updateTimeout: NodeJS.Timeout;
    
    const handleDataUpdate = (event: CustomEvent) => {
      const { type } = event.detail;
      
      // Debounce updates to prevent rapid re-renders
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        if (refreshingRef.current) return;
        
        switch (type) {
          case 'profile':
            refreshProfile();
            break;
          case 'todos':
            refreshTodos();
            break;
          case 'journal':
            refreshJournalEntries();
            break;
          case 'content':
            refreshContentItems();
            break;
          case 'learning':
            refreshLearningGoals();
            break;
          case 'links':
            refreshQuickLinks();
            break;
          case 'prompts':
            refreshPrompts();
            break;
          case 'calories':
            refreshCalorieEntries();
            break;
          case 'workouts':
            refreshWorkoutEntries();
            break;
          case 'weight':
            refreshWeightEntries();
            break;
          case 'sleep':
            refreshSleepEntries();
            break;
          case 'channels':
            refreshChannels();
            break;
          case 'all':
            refreshAll();
            break;
          default:
            break;
        }
      }, 100); // 100ms debounce
    };

    const handleProfileUpdate = () => {
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        if (!refreshingRef.current) {
          refreshProfile();
        }
      }, 100);
    };

    window.addEventListener('dataUpdated', handleDataUpdate as EventListener);
    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      clearTimeout(updateTimeout);
      window.removeEventListener('dataUpdated', handleDataUpdate as EventListener);
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [
    refreshProfile,
    refreshTodos,
    refreshJournalEntries,
    refreshContentItems,
    refreshLearningGoals,
    refreshQuickLinks,
    refreshPrompts,
    refreshCalorieEntries,
    refreshWorkoutEntries,
    refreshWeightEntries,
    refreshSleepEntries,
    refreshChannels,
    refreshAll
  ]);

  return {
    state,
    loading,
    refreshProfile,
    refreshTodos,
    refreshJournalEntries,
    refreshContentItems,
    refreshLearningGoals,
    refreshQuickLinks,
    refreshPrompts,
    refreshCalorieEntries,
    refreshWorkoutEntries,
    refreshWeightEntries,
    refreshSleepEntries,
    refreshChannels,
    refreshAll
  };
};

// Debounced helper function to trigger data updates
let triggerTimeout: NodeJS.Timeout;
export const triggerDataUpdate = (type: string) => {
  clearTimeout(triggerTimeout);
  triggerTimeout = setTimeout(() => {
    window.dispatchEvent(new CustomEvent('dataUpdated', { detail: { type } }));
  }, 50); // 50ms debounce for triggers
};