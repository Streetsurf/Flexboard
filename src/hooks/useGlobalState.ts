import { useState, useEffect, useCallback } from 'react';
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

  // Enhanced error handling wrapper
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

  // Profile refresh
  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    
    await withErrorHandling(
      async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        
        setState(prev => ({ ...prev, profile: data }));
      },
      undefined,
      'refreshProfile'
    );
  }, [user?.id]);

  // Todos refresh
  const refreshTodos = useCallback(async () => {
    if (!user?.id) return;
    
    await withErrorHandling(
      async () => {
        const { data, error } = await supabase
          .from('todos')
          .select('*')
          .eq('user_id', user.id)
          .order('priority_score', { ascending: false });

        if (error) throw error;
        setState(prev => ({ ...prev, todos: data || [] }));
      },
      undefined,
      'refreshTodos'
    );
  }, [user?.id]);

  // Journal entries refresh
  const refreshJournalEntries = useCallback(async () => {
    if (!user?.id) return;
    
    await withErrorHandling(
      async () => {
        const { data, error } = await supabase
          .from('journal_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });

        if (error) throw error;
        setState(prev => ({ ...prev, journalEntries: data || [] }));
      },
      undefined,
      'refreshJournalEntries'
    );
  }, [user?.id]);

  // Content items refresh
  const refreshContentItems = useCallback(async () => {
    if (!user?.id) return;
    
    await withErrorHandling(
      async () => {
        const { data, error } = await supabase
          .from('content_items')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setState(prev => ({ ...prev, contentItems: data || [] }));
      },
      undefined,
      'refreshContentItems'
    );
  }, [user?.id]);

  // Learning goals refresh
  const refreshLearningGoals = useCallback(async () => {
    if (!user?.id) return;
    
    await withErrorHandling(
      async () => {
        const { data, error } = await supabase
          .from('learning_goals')
          .select('*')
          .eq('user_id', user.id)
          .order('target_date', { ascending: true });

        if (error) throw error;
        setState(prev => ({ ...prev, learningGoals: data || [] }));
      },
      undefined,
      'refreshLearningGoals'
    );
  }, [user?.id]);

  // Quick links refresh
  const refreshQuickLinks = useCallback(async () => {
    if (!user?.id) return;
    
    await withErrorHandling(
      async () => {
        const { data, error } = await supabase
          .from('quick_links')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setState(prev => ({ ...prev, quickLinks: data || [] }));
      },
      undefined,
      'refreshQuickLinks'
    );
  }, [user?.id]);

  // Prompts refresh
  const refreshPrompts = useCallback(async () => {
    if (!user?.id) return;
    
    await withErrorHandling(
      async () => {
        const { data, error } = await supabase
          .from('prompts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setState(prev => ({ ...prev, prompts: data || [] }));
      },
      undefined,
      'refreshPrompts'
    );
  }, [user?.id]);

  // Calorie entries refresh
  const refreshCalorieEntries = useCallback(async () => {
    if (!user?.id) return;
    
    await withErrorHandling(
      async () => {
        const { data, error } = await supabase
          .from('calorie_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });

        if (error) throw error;
        setState(prev => ({ ...prev, calorieEntries: data || [] }));
      },
      undefined,
      'refreshCalorieEntries'
    );
  }, [user?.id]);

  // Workout entries refresh
  const refreshWorkoutEntries = useCallback(async () => {
    if (!user?.id) return;
    
    await withErrorHandling(
      async () => {
        const { data, error } = await supabase
          .from('workout_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });

        if (error) throw error;
        setState(prev => ({ ...prev, workoutEntries: data || [] }));
      },
      undefined,
      'refreshWorkoutEntries'
    );
  }, [user?.id]);

  // Weight entries refresh
  const refreshWeightEntries = useCallback(async () => {
    if (!user?.id) return;
    
    await withErrorHandling(
      async () => {
        const { data, error } = await supabase
          .from('weight_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });

        if (error) throw error;
        setState(prev => ({ ...prev, weightEntries: data || [] }));
      },
      undefined,
      'refreshWeightEntries'
    );
  }, [user?.id]);

  // Sleep entries refresh
  const refreshSleepEntries = useCallback(async () => {
    if (!user?.id) return;
    
    await withErrorHandling(
      async () => {
        const { data, error } = await supabase
          .from('sleep_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });

        if (error) throw error;
        setState(prev => ({ ...prev, sleepEntries: data || [] }));
      },
      undefined,
      'refreshSleepEntries'
    );
  }, [user?.id]);

  // Channels refresh
  const refreshChannels = useCallback(async () => {
    if (!user?.id) return;
    
    await withErrorHandling(
      async () => {
        const { data, error } = await supabase
          .from('channels')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setState(prev => ({ ...prev, channels: data || [] }));
      },
      undefined,
      'refreshChannels'
    );
  }, [user?.id]);

  // Refresh all data with better error handling
  const refreshAll = useCallback(async () => {
    if (!user?.id) return;
    
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
    } catch (error) {
      console.error('Error refreshing all data:', error);
    } finally {
      setLoading(false);
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

  // Initial data load
  useEffect(() => {
    if (user?.id) {
      refreshAll();
    } else {
      setState(initialState);
      setLoading(false);
    }
  }, [user?.id, refreshAll]);

  // Listen for global data updates
  useEffect(() => {
    const handleDataUpdate = (event: CustomEvent) => {
      const { type } = event.detail;
      
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
    };

    window.addEventListener('dataUpdated', handleDataUpdate as EventListener);
    window.addEventListener('profileUpdated', () => refreshProfile());

    return () => {
      window.removeEventListener('dataUpdated', handleDataUpdate as EventListener);
      window.removeEventListener('profileUpdated', () => refreshProfile());
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

// Helper function to trigger data updates
export const triggerDataUpdate = (type: string) => {
  window.dispatchEvent(new CustomEvent('dataUpdated', { detail: { type } }));
};