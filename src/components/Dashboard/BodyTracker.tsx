import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Calendar, 
  Plus, 
  TrendingUp, 
  Activity, 
  Heart, 
  Target,
  User,
  Scale,
  Clock,
  Utensils,
  Dumbbell,
  Moon,
  ChevronLeft,
  ChevronRight,
  Award,
  BarChart3,
  Settings,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { supabase, testSupabaseConnection } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameWeek } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Import form components
import CalorieForm from './forms/CalorieForm';
import WorkoutForm from './forms/WorkoutForm';
import WeightForm from './forms/WeightForm';
import SleepForm from './forms/SleepForm';
import ProfileForm from './forms/ProfileForm';

// Types
interface UserProfile {
  id: string;
  age?: number;
  gender: 'male' | 'female';
  height?: number;
  activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
  target_weight?: number;
  target_calories?: number;
  target_workouts_per_week: number;
}

interface CalorieEntry {
  id: string;
  food_name: string;
  calories: number;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  description?: string;
  date: string;
  created_at: string;
}

interface WorkoutEntry {
  id: string;
  exercise_name: string;
  type: 'duration' | 'reps';
  duration_minutes?: number;
  repetitions?: number;
  calories_burned: number;
  date: string;
  created_at: string;
}

interface WeightEntry {
  id: string;
  weight: number;
  body_fat?: number;
  date: string;
  created_at: string;
}

interface SleepEntry {
  id: string;
  sleep_time: string;
  wake_time: string;
  duration_hours: number;
  date: string;
  created_at: string;
}

interface WeeklyStats {
  totalCaloriesIn: number;
  totalCaloriesOut: number;
  calorieBalance: number; // TDEE - Intake + Workout calories
  avgCaloriesPerDay: number;
  weightChange: number;
  workoutDays: number;
  avgSleepHours: number;
  totalSleepHours: number;
  currentWeight: number;
  bmr: number;
  tdee: number;
  daysWithData: number; // New field to track days with actual data
}

interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number;
  target: number;
  dateAchieved?: string;
}

const BodyTracker: React.FC = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'calories' | 'workout' | 'weight' | 'sleep'>('dashboard');
  const [showForm, setShowForm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Data states
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [calorieEntries, setCalorieEntries] = useState<CalorieEntry[]>([]);
  const [workoutEntries, setWorkoutEntries] = useState<WorkoutEntry[]>([]);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [sleepEntries, setSleepEntries] = useState<SleepEntry[]>([]);
  const [allWeightEntries, setAllWeightEntries] = useState<WeightEntry[]>([]); // For getting current weight

  // Memoized calculations
  const weekStart = useMemo(() => startOfWeek(selectedWeek, { weekStartsOn: 1 }), [selectedWeek]);
  const weekEnd = useMemo(() => endOfWeek(selectedWeek, { weekStartsOn: 1 }), [selectedWeek]);
  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd]);

  // Get current weight from latest weight entry
  const getCurrentWeight = useCallback((): number => {
    if (allWeightEntries.length === 0) {
      // Fallback to target weight if no weight entries exist
      return profile?.target_weight || 70;
    }
    
    // Sort by date and get the most recent entry
    const sortedEntries = [...allWeightEntries].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    return sortedEntries[0].weight;
  }, [allWeightEntries, profile?.target_weight]);

  // BMR & TDEE Calculations using current weight
  const calculateBMR = useCallback((profile: UserProfile, currentWeight: number): number => {
    if (!profile.age || !profile.height || !currentWeight) return 0;
    
    if (profile.gender === 'male') {
      return (10 * currentWeight) + (6.25 * profile.height) - (5 * profile.age) + 5;
    } else {
      return (10 * currentWeight) + (6.25 * profile.height) - (5 * profile.age) - 161;
    }
  }, []);

  const calculateTDEE = useCallback((bmr: number, activityLevel: string): number => {
    const activityMultipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extremely_active: 1.9
    };
    return bmr * (activityMultipliers[activityLevel as keyof typeof activityMultipliers] || 1.55);
  }, []);

  // Weekly Statistics Calculation
  const weeklyStats = useMemo((): WeeklyStats => {
    if (!profile) {
      return {
        totalCaloriesIn: 0,
        totalCaloriesOut: 0,
        calorieBalance: 0,
        avgCaloriesPerDay: 0,
        weightChange: 0,
        workoutDays: 0,
        avgSleepHours: 0,
        totalSleepHours: 0,
        currentWeight: 0,
        bmr: 0,
        tdee: 0,
        daysWithData: 0
      };
    }

    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

    // Filter entries for current week
    const weekCalories = calorieEntries.filter(entry => 
      entry.date >= weekStartStr && entry.date <= weekEndStr
    );
    const weekWorkouts = workoutEntries.filter(entry => 
      entry.date >= weekStartStr && entry.date <= weekEndStr
    );
    const weekSleep = sleepEntries.filter(entry => 
      entry.date >= weekStartStr && entry.date <= weekEndStr
    );
    const weekWeights = weightEntries.filter(entry => 
      entry.date >= weekStartStr && entry.date <= weekEndStr
    );

    // Get unique dates that have either calorie or workout data
    const datesWithCalorieData = new Set(weekCalories.map(entry => entry.date));
    const datesWithWorkoutData = new Set(weekWorkouts.map(entry => entry.date));
    const allDatesWithData = new Set([...datesWithCalorieData, ...datesWithWorkoutData]);
    const daysWithData = allDatesWithData.size;

    // Calculate totals
    const totalCaloriesIn = weekCalories.reduce((sum, entry) => sum + entry.calories, 0);
    const totalCaloriesOut = weekWorkouts.reduce((sum, entry) => sum + entry.calories_burned, 0);
    
    // Get current weight (latest weight entry from all data)
    const currentWeight = getCurrentWeight();

    // Calculate BMR and TDEE using current weight
    const bmr = calculateBMR(profile, currentWeight);
    const tdee = calculateTDEE(bmr, profile.activity_level);
    
    // Calculate TDEE only for days with data (not full 7 days)
    const weeklyTDEE = tdee * daysWithData;

    // CORRECTED FORMULA: TDEE - Calorie Intake + Calories Burned from Workout
    // Only calculate for days with actual data
    const calorieBalance = weeklyTDEE - totalCaloriesIn + totalCaloriesOut;

    // Weight change calculation
    let weightChange = 0;
    if (weekWeights.length >= 2) {
      // Compare first and last weight in the week
      const sortedWeekWeights = [...weekWeights].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      weightChange = sortedWeekWeights[sortedWeekWeights.length - 1].weight - sortedWeekWeights[0].weight;
    } else if (weekWeights.length === 1) {
      // Compare with previous week's last entry
      const prevWeekStart = format(subWeeks(weekStart, 1), 'yyyy-MM-dd');
      const prevWeekEnd = format(subWeeks(weekEnd, 1), 'yyyy-MM-dd');
      const prevWeekWeights = allWeightEntries.filter(entry => 
        entry.date >= prevWeekStart && entry.date <= prevWeekEnd
      );
      if (prevWeekWeights.length > 0) {
        const sortedPrevWeights = [...prevWeekWeights].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        weightChange = weekWeights[0].weight - sortedPrevWeights[sortedPrevWeights.length - 1].weight;
      }
    }

    // Workout days (unique dates)
    const workoutDays = new Set(weekWorkouts.map(entry => entry.date)).size;

    // Sleep calculations
    const totalSleepHours = weekSleep.reduce((sum, entry) => sum + entry.duration_hours, 0);
    const avgSleepHours = weekSleep.length > 0 ? totalSleepHours / weekSleep.length : 0;

    return {
      totalCaloriesIn,
      totalCaloriesOut,
      calorieBalance: Math.round(calorieBalance),
      avgCaloriesPerDay: daysWithData > 0 ? Math.round(totalCaloriesIn / daysWithData) : 0,
      weightChange: Math.round(weightChange * 10) / 10,
      workoutDays,
      avgSleepHours: Math.round(avgSleepHours * 10) / 10,
      totalSleepHours: Math.round(totalSleepHours * 10) / 10,
      currentWeight: Math.round(currentWeight * 10) / 10,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      daysWithData
    };
  }, [profile, calorieEntries, workoutEntries, sleepEntries, weightEntries, allWeightEntries, weekStart, weekEnd, calculateBMR, calculateTDEE, getCurrentWeight]);

  // Achievement System
  const achievements = useMemo((): Achievement[] => {
    const targetWorkouts = profile?.target_workouts_per_week || 3;
    
    return [
      {
        id: 'calorie_deficit',
        icon: '🔥',
        title: 'Kalori Defisit',
        description: 'Defisit ≥500 kalori minggu ini',
        unlocked: weeklyStats.calorieBalance >= 500,
        progress: Math.min(weeklyStats.calorieBalance, 500),
        target: 500,
        dateAchieved: weeklyStats.calorieBalance >= 500 ? format(new Date(), 'yyyy-MM-dd') : undefined
      },
      {
        id: 'target_workout',
        icon: '🎯',
        title: 'Target Workout',
        description: `${targetWorkouts} workout minggu ini`,
        unlocked: weeklyStats.workoutDays >= targetWorkouts,
        progress: weeklyStats.workoutDays,
        target: targetWorkouts,
        dateAchieved: weeklyStats.workoutDays >= targetWorkouts ? format(new Date(), 'yyyy-MM-dd') : undefined
      },
      {
        id: 'weight_loss',
        icon: '⚖️',
        title: 'Penurunan Berat Ideal',
        description: 'Turun 0.5-1kg minggu ini',
        unlocked: weeklyStats.weightChange <= -0.5 && weeklyStats.weightChange >= -1,
        progress: Math.abs(Math.min(weeklyStats.weightChange, 0)),
        target: 0.5,
        dateAchieved: (weeklyStats.weightChange <= -0.5 && weeklyStats.weightChange >= -1) ? format(new Date(), 'yyyy-MM-dd') : undefined
      },
      {
        id: 'sleep_quality',
        icon: '😴',
        title: 'Tidur Berkualitas',
        description: 'Rata-rata 7+ jam per malam',
        unlocked: weeklyStats.avgSleepHours >= 7,
        progress: weeklyStats.avgSleepHours,
        target: 7,
        dateAchieved: weeklyStats.avgSleepHours >= 7 ? format(new Date(), 'yyyy-MM-dd') : undefined
      },
      {
        id: 'perfect_week',
        icon: '🏆',
        title: 'Minggu Sempurna',
        description: 'Semua target tercapai',
        unlocked: weeklyStats.calorieBalance >= 500 && 
                  weeklyStats.workoutDays >= targetWorkouts && 
                  weeklyStats.avgSleepHours >= 7 &&
                  (weeklyStats.weightChange <= -0.5 && weeklyStats.weightChange >= -1),
        progress: [
          weeklyStats.calorieBalance >= 500,
          weeklyStats.workoutDays >= targetWorkouts,
          weeklyStats.avgSleepHours >= 7,
          (weeklyStats.weightChange <= -0.5 && weeklyStats.weightChange >= -1)
        ].filter(Boolean).length,
        target: 4,
        dateAchieved: undefined
      }
    ];
  }, [weeklyStats, profile]);

  // Enhanced error handling function
  const handleError = useCallback((error: any, context: string) => {
    console.error(`Error in ${context}:`, error);
    
    let errorMessage = `Failed to ${context.toLowerCase()}`;
    
    if (error.name === 'AbortError') {
      errorMessage = 'Request timed out. Please check your internet connection.';
    } else if (error.message?.includes('Failed to fetch')) {
      errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
    } else if (error.message?.includes('NetworkError')) {
      errorMessage = 'Network error. Please check your internet connection.';
    } else if (error.code) {
      errorMessage = `Database error: ${error.message}`;
    }
    
    setConnectionError(errorMessage);
  }, []);

  // Data fetching functions with enhanced error handling
  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setConnectionError(null);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setProfile(data);
    } catch (error) {
      handleError(error, 'fetch profile');
    }
  }, [user?.id, handleError]);

  const fetchAllWeightEntries = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setConnectionError(null);
      // Fetch all weight entries to get current weight
      const { data, error } = await supabase
        .from('weight_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(50); // Get recent entries

      if (error) throw error;
      setAllWeightEntries(data || []);
    } catch (error) {
      handleError(error, 'fetch weight entries');
    }
  }, [user?.id, handleError]);

  const fetchWeeklyData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setConnectionError(null);
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

      // Fetch all data for the week
      const [caloriesRes, workoutsRes, weightsRes, sleepRes] = await Promise.all([
        supabase
          .from('calorie_entries')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', weekStartStr)
          .lte('date', weekEndStr)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('workout_entries')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', weekStartStr)
          .lte('date', weekEndStr)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('weight_entries')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', weekStartStr)
          .lte('date', weekEndStr)
          .order('date', { ascending: true }),
        
        supabase
          .from('sleep_entries')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', weekStartStr)
          .lte('date', weekEndStr)
          .order('date', { ascending: true })
      ]);

      if (caloriesRes.error) throw caloriesRes.error;
      if (workoutsRes.error) throw workoutsRes.error;
      if (weightsRes.error) throw weightsRes.error;
      if (sleepRes.error) throw sleepRes.error;

      setCalorieEntries(caloriesRes.data || []);
      setWorkoutEntries(workoutsRes.data || []);
      setWeightEntries(weightsRes.data || []);
      setSleepEntries(sleepRes.data || []);
    } catch (error) {
      handleError(error, 'fetch weekly data');
    }
  }, [user?.id, weekStart, weekEnd, handleError]);

  // Retry function
  const retryConnection = useCallback(async () => {
    setLoading(true);
    setConnectionError(null);
    setRetryCount(prev => prev + 1);
    
    // Test connection first
    const isConnected = await testSupabaseConnection();
    if (!isConnected) {
      setConnectionError('Unable to connect to the database. Please check your internet connection and try again.');
      setLoading(false);
      return;
    }
    
    try {
      await Promise.all([fetchProfile(), fetchAllWeightEntries(), fetchWeeklyData()]);
    } finally {
      setLoading(false);
    }
  }, [fetchProfile, fetchAllWeightEntries, fetchWeeklyData]);

  // Effects
  useEffect(() => {
    if (user) {
      Promise.all([fetchProfile(), fetchAllWeightEntries(), fetchWeeklyData()]).finally(() => {
        setLoading(false);
      });
    }
  }, [user, fetchProfile, fetchAllWeightEntries, fetchWeeklyData]);

  // Navigation functions
  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedWeek(prev => subWeeks(prev, 1));
    } else {
      setSelectedWeek(prev => addWeeks(prev, 1));
    }
  };

  const goToCurrentWeek = () => {
    setSelectedWeek(new Date());
  };

  // Utility functions
  const getStatColor = (type: string, value: number) => {
    switch (type) {
      case 'balance':
        return value >= 500 ? 'text-green-600' : value >= 0 ? 'text-yellow-600' : 'text-red-600';
      case 'weight':
        return value <= -0.5 ? 'text-green-600' : value >= 0.5 ? 'text-red-600' : 'text-yellow-600';
      case 'workout':
        const target = profile?.target_workouts_per_week || 3;
        return value >= target ? 'text-green-600' : value >= Math.ceil(target/2) ? 'text-yellow-600' : 'text-red-600';
      case 'sleep':
        return value >= 7 ? 'text-green-600' : value >= 6 ? 'text-yellow-600' : 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatBgColor = (type: string, value: number) => {
    switch (type) {
      case 'balance':
        return value >= 500 ? 'bg-green-50 border-green-200' : value >= 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';
      case 'weight':
        return value <= -0.5 ? 'bg-green-50 border-green-200' : value >= 0.5 ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200';
      case 'workout':
        const target = profile?.target_workouts_per_week || 3;
        return value >= target ? 'bg-green-50 border-green-200' : value >= Math.ceil(target/2) ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';
      case 'sleep':
        return value >= 7 ? 'bg-green-50 border-green-200' : value >= 6 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const generateWeeklySummary = () => {
    const balanceText = weeklyStats.calorieBalance >= 500 
      ? `defisit ${weeklyStats.calorieBalance.toLocaleString()} kalori` 
      : weeklyStats.calorieBalance >= 0 
      ? `defisit kecil ${weeklyStats.calorieBalance.toLocaleString()} kalori`
      : `surplus ${Math.abs(weeklyStats.calorieBalance).toLocaleString()} kalori`;
    
    const weightText = weeklyStats.weightChange <= -0.5 
      ? `menurunkan ${Math.abs(weeklyStats.weightChange)} kg` 
      : weeklyStats.weightChange >= 0.5 
      ? `menaikkan ${weeklyStats.weightChange} kg` 
      : 'mempertahankan berat badan';
    
    const workoutTarget = profile?.target_workouts_per_week || 3;
    const workoutText = weeklyStats.workoutDays >= workoutTarget 
      ? 'Latihanmu konsisten!' 
      : weeklyStats.workoutDays >= Math.ceil(workoutTarget/2) 
      ? 'Latihan cukup baik!' 
      : 'Perlu lebih banyak latihan!';
    
    return `🔥 Minggu ini kamu ${balanceText} dan berhasil ${weightText}. ${workoutText} 💪`;
  };

  // Connection error display
  if (connectionError && !loading) {
    return (
      <div className="space-y-6">
        <div className="card animate-fadeIn">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Connection Error</h3>
            <p className="text-gray-600 mb-4 max-w-md mx-auto">{connectionError}</p>
            <div className="space-y-2">
              <button
                onClick={retryConnection}
                className="btn-primary inline-flex items-center space-x-2"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Retry Connection</span>
              </button>
              {retryCount > 0 && (
                <p className="text-xs text-gray-500">Retry attempt: {retryCount}</p>
              )}
            </div>
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left max-w-md mx-auto">
              <h4 className="font-medium text-blue-900 mb-2">Troubleshooting Tips:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Check your internet connection</li>
                <li>• Refresh the page</li>
                <li>• Try again in a few moments</li>
                <li>• Contact support if the issue persists</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="card animate-fadeIn">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Week Navigation */}
      <div className="card animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
          <div className="flex items-center space-x-3 mb-4 sm:mb-0">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Body Tracker</h1>
          </div>
          
          {/* Week Navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateWeek('prev')}
              className="btn-icon-secondary"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="text-center px-4 py-2 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-900">
                {format(weekStart, 'd MMM', { locale: localeId })} - {format(weekEnd, 'd MMM yyyy', { locale: localeId })}
              </div>
              <div className="text-xs text-gray-500">
                {isSameWeek(selectedWeek, new Date()) ? 'Minggu ini' : 'Minggu terpilih'}
              </div>
            </div>
            
            <button
              onClick={() => navigateWeek('next')}
              className="btn-icon-secondary"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            
            {!isSameWeek(selectedWeek, new Date()) && (
              <button
                onClick={goToCurrentWeek}
                className="btn-secondary text-xs ml-2"
              >
                Minggu Ini
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-6">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'profile', label: 'Profile', icon: User },
              { id: 'calories', label: 'Kalori', icon: Utensils },
              { id: 'workout', label: 'Workout', icon: Dumbbell },
              { id: 'weight', label: 'Berat', icon: Scale },
              { id: 'sleep', label: 'Tidur', icon: Moon }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Weekly Report Summary */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <h2 className="card-title">Weekly Report Summary</h2>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Calorie Balance */}
              <div className={`stat-card ${getStatBgColor('balance', weeklyStats.calorieBalance)} stagger-item`}>
                <div className="flex items-center justify-between mb-2">
                  <Target className="w-4 h-4 text-blue-500" />
                  <span className={`text-xs font-medium ${getStatColor('balance', weeklyStats.calorieBalance)}`}>
                    {weeklyStats.calorieBalance >= 500 ? 'Defisit Baik' : weeklyStats.calorieBalance >= 0 ? 'Defisit Kecil' : 'Surplus'}
                  </span>
                </div>
                <div className={`stat-value ${getStatColor('balance', weeklyStats.calorieBalance)}`}>
                  {weeklyStats.calorieBalance >= 0 ? '' : '+'}{Math.abs(weeklyStats.calorieBalance).toLocaleString()}
                </div>
                <div className="stat-label">Kalori Balance</div>
              </div>

              {/* Weight Change */}
              <div className={`stat-card ${getStatBgColor('weight', weeklyStats.weightChange)} stagger-item`}>
                <div className="flex items-center justify-between mb-2">
                  <Scale className="w-4 h-4 text-green-500" />
                  <span className={`text-xs font-medium ${getStatColor('weight', weeklyStats.weightChange)}`}>
                    {weeklyStats.weightChange <= -0.5 ? 'Ideal' : weeklyStats.weightChange >= 0.5 ? 'Naik' : 'Stabil'}
                  </span>
                </div>
                <div className={`stat-value ${getStatColor('weight', weeklyStats.weightChange)}`}>
                  {weeklyStats.weightChange > 0 ? '+' : ''}{weeklyStats.weightChange}
                </div>
                <div className="stat-label">kg</div>
              </div>

              {/* Workouts Completed */}
              <div className={`stat-card ${getStatBgColor('workout', weeklyStats.workoutDays)} stagger-item`}>
                <div className="flex items-center justify-between mb-2">
                  <Activity className="w-4 h-4 text-orange-500" />
                  <span className={`text-xs font-medium ${getStatColor('workout', weeklyStats.workoutDays)}`}>
                    {weeklyStats.workoutDays >= (profile?.target_workouts_per_week || 3) ? 'Target' : 'Progress'}
                  </span>
                </div>
                <div className={`stat-value ${getStatColor('workout', weeklyStats.workoutDays)}`}>
                  {weeklyStats.workoutDays}
                </div>
                <div className="stat-label">Hari Workout</div>
              </div>

              {/* Average Sleep */}
              <div className={`stat-card ${getStatBgColor('sleep', weeklyStats.avgSleepHours)} stagger-item`}>
                <div className="flex items-center justify-between mb-2">
                  <Heart className="w-4 h-4 text-purple-500" />
                  <span className={`text-xs font-medium ${getStatColor('sleep', weeklyStats.avgSleepHours)}`}>
                    {weeklyStats.avgSleepHours >= 7 ? 'Baik' : weeklyStats.avgSleepHours >= 6 ? 'Cukup' : 'Kurang'}
                  </span>
                </div>
                <div className={`stat-value ${getStatColor('sleep', weeklyStats.avgSleepHours)}`}>
                  {weeklyStats.avgSleepHours}
                </div>
                <div className="stat-label">Jam Tidur</div>
              </div>
            </div>

            {/* Current Weight & Metabolism Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <h3 className="font-medium text-gray-900 mb-2">Berat Badan Saat Ini</h3>
                <div className="text-2xl font-bold text-gray-900">{weeklyStats.currentWeight} kg</div>
                <p className="text-xs text-gray-600 mt-1">
                  {allWeightEntries.length > 0 
                    ? `Berdasarkan entry terakhir: ${format(new Date(allWeightEntries[0]?.date || new Date()), 'd MMM yyyy')}`
                    : 'Menggunakan target berat badan'
                  }
                </p>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <h3 className="font-medium text-blue-900 mb-2">Metabolisme</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-blue-700">BMR:</span>
                    <span className="font-medium text-blue-900 ml-1">{weeklyStats.bmr} kal/hari</span>
                  </div>
                  <div>
                    <span className="text-blue-700">TDEE:</span>
                    <span className="font-medium text-blue-900 ml-1">{weeklyStats.tdee} kal/hari</span>
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  Berdasarkan berat badan saat ini: {weeklyStats.currentWeight} kg
                </p>
              </div>
            </div>

            {/* Weekly Summary Highlight */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl animate-fadeIn">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Target className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-blue-900 mb-1 text-sm">Ringkasan Minggu Ini</h3>
                  <p className="text-blue-700 text-sm leading-relaxed">
                    {generateWeeklySummary()}
                  </p>
                  <div className="mt-2 text-xs text-blue-600">
                    <strong>Formula:</strong> TDEE ({weeklyStats.tdee} × {weeklyStats.daysWithData} hari) - Kalori Intake + Kalori Workout = {weeklyStats.calorieBalance >= 0 ? 'Defisit' : 'Surplus'} {Math.abs(weeklyStats.calorieBalance)} kalori
                  </div>
                  {weeklyStats.daysWithData < 7 && (
                    <div className="mt-1 text-xs text-blue-600">
                      <strong>Catatan:</strong> Perhitungan berdasarkan {weeklyStats.daysWithData} hari dengan data (bukan 7 hari penuh)
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Achievement System */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <Award className="w-4 h-4 text-white" />
                </div>
                <h2 className="card-title">Achievements</h2>
              </div>
              <div className="text-xs text-gray-500">
                {achievements.filter(a => a.unlocked).length}/{achievements.length} unlocked
              </div>
            </div>

            {/* Achievements Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((achievement, index) => (
                <div
                  key={achievement.id}
                  className={`p-4 rounded-xl border transition-all duration-300 hover-lift stagger-item ${
                    achievement.unlocked 
                      ? 'bg-green-50 border-green-200 hover:shadow-md' 
                      : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-start space-x-3">
                    {/* Achievement Icon */}
                    <div className={`text-2xl ${achievement.unlocked ? '' : 'grayscale'}`}>
                      {achievement.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {/* Achievement Title */}
                      <h3 className={`font-medium mb-1 text-sm ${
                        achievement.unlocked ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {achievement.title}
                      </h3>
                      
                      {/* Achievement Description */}
                      <p className={`text-xs mb-2 ${
                        achievement.unlocked ? 'text-gray-600' : 'text-gray-400'
                      }`}>
                        {achievement.description}
                      </p>
                      
                      {/* Progress Bar */}
                      <div className="mb-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500">Progress</span>
                          <span className="text-gray-600">
                            {Math.min(achievement.progress, achievement.target)}/{achievement.target}
                          </span>
                        </div>
                        <div className="progress-bar h-1.5">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              achievement.unlocked ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                            style={{ 
                              width: `${Math.min((achievement.progress / achievement.target) * 100, 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                      
                      {/* Achievement Date */}
                      {achievement.unlocked && achievement.dateAchieved && (
                        <div className="text-xs text-green-600">
                          Achieved: {format(new Date(achievement.dateAchieved), 'd MMM yyyy')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <ProfileForm 
          profile={profile} 
          onSave={() => {
            fetchProfile();
            fetchAllWeightEntries(); // Refresh weight data when profile changes
          }}
        />
      )}

      {/* Calories Tab */}
      {activeTab === 'calories' && (
        <CalorieForm 
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          entries={calorieEntries}
          onRefresh={fetchWeeklyData}
        />
      )}

      {/* Workout Tab */}
      {activeTab === 'workout' && (
        <WorkoutForm 
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          entries={workoutEntries}
          onRefresh={fetchWeeklyData}
        />
      )}

      {/* Weight Tab */}
      {activeTab === 'weight' && (
        <WeightForm 
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          entries={weightEntries}
          onRefresh={() => {
            fetchWeeklyData();
            fetchAllWeightEntries(); // Refresh all weight data when weight changes
          }}
        />
      )}

      {/* Sleep Tab */}
      {activeTab === 'sleep' && (
        <SleepForm 
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          entries={sleepEntries}
          onRefresh={fetchWeeklyData}
        />
      )}

      {/* Floating Action Button */}
      {activeTab !== 'dashboard' && activeTab !== 'profile' && (
        <button
          onClick={() => setShowForm(activeTab)}
          className="fab"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};

export default BodyTracker;