import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  Plus, 
  X, 
  Save, 
  User, 
  Target, 
  Activity, 
  Utensils, 
  Moon, 
  TrendingUp,
  Upload,
  Image,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { format, addDays, subDays, startOfWeek, endOfWeek, isSameDay, isToday } from 'date-fns';
import { id } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Types
interface Profile {
  id: string;
  age?: number;
  gender: 'male' | 'female';
  height?: number;
  activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
  target_weight?: number;
  target_calories?: number;
  target_workouts_per_week?: number;
  avatar_url?: string;
  full_name?: string;
}

interface CalorieEntry {
  id: string;
  food_name: string;
  calories: number;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  description: string;
  date: string;
  user_id: string;
}

interface WorkoutEntry {
  id: string;
  exercise_name: string;
  type: 'duration' | 'reps';
  duration_minutes?: number;
  repetitions?: number;
  calories_burned: number;
  date: string;
  user_id: string;
}

interface WeightEntry {
  id: string;
  weight: number;
  body_fat?: number;
  date: string;
  user_id: string;
}

interface SleepEntry {
  id: string;
  sleep_time: string;
  wake_time: string;
  duration_hours: number;
  date: string;
  user_id: string;
}

interface WeeklyStats {
  totalCaloriesIn: number;
  totalCaloriesOut: number;
  calorieDeficit: number;
  weightChange: number;
  workoutsCompleted: number;
  avgSleep: number;
  totalSleepHours: number;
  avgCaloriesPerDay: number;
  avgCaloriesBurnedPerDay: number;
}

interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  dateAchieved?: string;
  color: string;
  unlocked: boolean;
  progress?: number;
  target?: number;
}

const BodyTracker: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'progress' | 'calories' | 'workout' | 'sleep'>('dashboard');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'calorie' | 'workout' | 'weight' | 'sleep'>('calorie');

  // Data states
  const [profile, setProfile] = useState<Profile | null>(null);
  const [calorieEntries, setCalorieEntries] = useState<CalorieEntry[]>([]);
  const [workoutEntries, setWorkoutEntries] = useState<WorkoutEntry[]>([]);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [sleepEntries, setSleepEntries] = useState<SleepEntry[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    totalCaloriesIn: 0,
    totalCaloriesOut: 0,
    calorieDeficit: 0,
    weightChange: 0,
    workoutsCompleted: 0,
    avgSleep: 0,
    totalSleepHours: 0,
    avgCaloriesPerDay: 0,
    avgCaloriesBurnedPerDay: 0
  });
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  // Form states
  const [profileForm, setProfileForm] = useState({
    age: '',
    gender: 'male' as 'male' | 'female',
    height: '',
    activity_level: 'moderately_active' as Profile['activity_level'],
    target_weight: '',
    target_calories: '',
    target_workouts_per_week: '3',
    avatar_url: '',
    full_name: ''
  });

  const [calorieForm, setCalorieForm] = useState({
    food_name: '',
    calories: '',
    category: 'breakfast' as CalorieEntry['category'],
    description: ''
  });

  const [workoutForm, setWorkoutForm] = useState({
    exercise_name: '',
    type: 'duration' as 'duration' | 'reps',
    duration_minutes: '',
    repetitions: '',
    calories_burned: ''
  });

  const [weightForm, setWeightForm] = useState({
    weight: '',
    body_fat: ''
  });

  const [sleepForm, setSleepForm] = useState({
    sleep_time: '',
    wake_time: ''
  });

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      await Promise.all([
        fetchProfile(),
        fetchCalorieEntries(),
        fetchWorkoutEntries(),
        fetchWeightEntries(),
        fetchSleepEntries()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedDate, selectedWeek]);

  // Calculate weekly stats
  const calculateWeeklyStats = useCallback(() => {
    const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });
    
    // Filter entries for the selected week
    const weekCalories = calorieEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= weekStart && entryDate <= weekEnd;
    });
    
    const weekWorkouts = workoutEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= weekStart && entryDate <= weekEnd;
    });
    
    const weekSleep = sleepEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= weekStart && entryDate <= weekEnd;
    });
    
    const weekWeights = weightEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= weekStart && entryDate <= weekEnd;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate totals
    const totalCaloriesIn = weekCalories.reduce((sum, entry) => sum + entry.calories, 0);
    const totalCaloriesOut = weekWorkouts.reduce((sum, entry) => sum + entry.calories_burned, 0);
    const totalSleepHours = weekSleep.reduce((sum, entry) => sum + entry.duration_hours, 0);
    
    // Calculate averages (7 days in a week)
    const avgCaloriesPerDay = totalCaloriesIn / 7;
    const avgCaloriesBurnedPerDay = totalCaloriesOut / 7;
    const avgSleep = weekSleep.length > 0 ? totalSleepHours / weekSleep.length : 0;
    
    // Calculate weight change (first vs last entry of the week)
    let weightChange = 0;
    if (weekWeights.length >= 2) {
      const firstWeight = weekWeights[0].weight;
      const lastWeight = weekWeights[weekWeights.length - 1].weight;
      weightChange = lastWeight - firstWeight;
    } else if (weekWeights.length === 1) {
      // Compare with previous week's last entry
      const prevWeekStart = addDays(weekStart, -7);
      const prevWeekEnd = addDays(weekEnd, -7);
      const prevWeekWeights = weightEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= prevWeekStart && entryDate <= prevWeekEnd;
      }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      if (prevWeekWeights.length > 0) {
        const prevWeight = prevWeekWeights[prevWeekWeights.length - 1].weight;
        weightChange = weekWeights[0].weight - prevWeight;
      }
    }

    // Calculate calorie deficit/surplus
    const calorieDeficit = totalCaloriesOut - totalCaloriesIn;
    
    // Count unique workout days
    const workoutDays = new Set(weekWorkouts.map(entry => entry.date));
    const workoutsCompleted = workoutDays.size;

    const stats: WeeklyStats = {
      totalCaloriesIn,
      totalCaloriesOut,
      calorieDeficit,
      weightChange: Math.round(weightChange * 10) / 10, // Round to 1 decimal
      workoutsCompleted,
      avgSleep: Math.round(avgSleep * 10) / 10, // Round to 1 decimal
      totalSleepHours: Math.round(totalSleepHours * 10) / 10,
      avgCaloriesPerDay: Math.round(avgCaloriesPerDay),
      avgCaloriesBurnedPerDay: Math.round(avgCaloriesBurnedPerDay)
    };

    setWeeklyStats(stats);
    calculateAchievements(stats, weekCalories, weekWorkouts, weekSleep);
  }, [calorieEntries, workoutEntries, sleepEntries, weightEntries, selectedWeek]);

  // Calculate achievements based on weekly stats
  const calculateAchievements = useCallback((stats: WeeklyStats, calories: CalorieEntry[], workouts: WorkoutEntry[], sleep: SleepEntry[]) => {
    const newAchievements: Achievement[] = [
      {
        id: '1',
        icon: '🔥',
        title: 'Kalori Defisit Konsisten',
        description: 'Defisit kalori 7 hari berturut-turut',
        color: 'bg-red-50 border-red-200',
        unlocked: stats.calorieDeficit > 0 && stats.calorieDeficit >= 500,
        dateAchieved: stats.calorieDeficit > 0 && stats.calorieDeficit >= 500 ? format(new Date(), 'yyyy-MM-dd') : undefined,
        progress: Math.min(stats.calorieDeficit, 3500),
        target: 3500 // 1 pound of fat = ~3500 calories
      },
      {
        id: '2',
        icon: '🎯',
        title: 'Target Workout',
        description: `Selesaikan ${profile?.target_workouts_per_week || 3} workout minggu ini`,
        color: 'bg-blue-50 border-blue-200',
        unlocked: stats.workoutsCompleted >= (profile?.target_workouts_per_week || 3),
        dateAchieved: stats.workoutsCompleted >= (profile?.target_workouts_per_week || 3) ? format(new Date(), 'yyyy-MM-dd') : undefined,
        progress: stats.workoutsCompleted,
        target: profile?.target_workouts_per_week || 3
      },
      {
        id: '3',
        icon: '🏆',
        title: 'Penurunan Berat Ideal',
        description: 'Turun 0.5-1kg dalam seminggu',
        color: 'bg-yellow-50 border-yellow-200',
        unlocked: stats.weightChange <= -0.5 && stats.weightChange >= -1.0,
        dateAchieved: stats.weightChange <= -0.5 && stats.weightChange >= -1.0 ? format(new Date(), 'yyyy-MM-dd') : undefined,
        progress: Math.abs(Math.min(stats.weightChange, 0)),
        target: 1.0
      },
      {
        id: '4',
        icon: '💪',
        title: 'Konsistensi Latihan',
        description: 'Latihan 3 hari berturut-turut',
        color: 'bg-green-50 border-green-200',
        unlocked: stats.workoutsCompleted >= 3,
        dateAchieved: stats.workoutsCompleted >= 3 ? format(new Date(), 'yyyy-MM-dd') : undefined,
        progress: stats.workoutsCompleted,
        target: 3
      },
      {
        id: '5',
        icon: '⭐',
        title: 'Tidur Berkualitas',
        description: 'Rata-rata tidur 7+ jam',
        color: 'bg-purple-50 border-purple-200',
        unlocked: stats.avgSleep >= 7.0,
        dateAchieved: stats.avgSleep >= 7.0 ? format(new Date(), 'yyyy-MM-dd') : undefined,
        progress: stats.avgSleep,
        target: 8.0
      },
      {
        id: '6',
        icon: '🎖️',
        title: 'Minggu Sempurna',
        description: 'Semua target tercapai',
        color: 'bg-indigo-50 border-indigo-200',
        unlocked: stats.calorieDeficit > 0 && 
                  stats.workoutsCompleted >= (profile?.target_workouts_per_week || 3) && 
                  stats.avgSleep >= 7.0 &&
                  stats.weightChange <= -0.2,
        dateAchieved: stats.calorieDeficit > 0 && 
                     stats.workoutsCompleted >= (profile?.target_workouts_per_week || 3) && 
                     stats.avgSleep >= 7.0 &&
                     stats.weightChange <= -0.2 ? format(new Date(), 'yyyy-MM-dd') : undefined,
        progress: [
          stats.calorieDeficit > 0 ? 1 : 0,
          stats.workoutsCompleted >= (profile?.target_workouts_per_week || 3) ? 1 : 0,
          stats.avgSleep >= 7.0 ? 1 : 0,
          stats.weightChange <= -0.2 ? 1 : 0
        ].reduce((sum, val) => sum + val, 0),
        target: 4
      }
    ];

    setAchievements(newAchievements);
  }, [profile]);

  // Fetch functions
  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setProfile(data);
        setProfileForm({
          age: data.age?.toString() || '',
          gender: data.gender || 'male',
          height: data.height?.toString() || '',
          activity_level: data.activity_level || 'moderately_active',
          target_weight: data.target_weight?.toString() || '',
          target_calories: data.target_calories?.toString() || '',
          target_workouts_per_week: data.target_workouts_per_week?.toString() || '3',
          avatar_url: data.avatar_url || '',
          full_name: data.full_name || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchCalorieEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('calorie_entries')
        .select('*')
        .eq('user_id', user?.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setCalorieEntries(data || []);
    } catch (error) {
      console.error('Error fetching calorie entries:', error);
    }
  };

  const fetchWorkoutEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('workout_entries')
        .select('*')
        .eq('user_id', user?.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setWorkoutEntries(data || []);
    } catch (error) {
      console.error('Error fetching workout entries:', error);
    }
  };

  const fetchWeightEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('weight_entries')
        .select('*')
        .eq('user_id', user?.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setWeightEntries(data || []);
    } catch (error) {
      console.error('Error fetching weight entries:', error);
    }
  };

  const fetchSleepEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('sleep_entries')
        .select('*')
        .eq('user_id', user?.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setSleepEntries(data || []);
    } catch (error) {
      console.error('Error fetching sleep entries:', error);
    }
  };

  // Calculate BMR and TDEE
  const calculateBMR = useCallback(() => {
    if (!profile?.age || !profile?.height || !weightEntries.length) return 0;
    
    const currentWeight = weightEntries[0]?.weight || 0;
    const { age, height, gender } = profile;
    
    if (gender === 'male') {
      return (10 * currentWeight) + (6.25 * height) - (5 * age) + 5;
    } else {
      return (10 * currentWeight) + (6.25 * height) - (5 * age) - 161;
    }
  }, [profile, weightEntries]);

  const calculateTDEE = useCallback(() => {
    const bmr = calculateBMR();
    if (!bmr || !profile?.activity_level) return 0;
    
    const activityMultipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extremely_active: 1.9
    };
    
    return bmr * activityMultipliers[profile.activity_level];
  }, [calculateBMR, profile]);

  // Save functions
  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const profileData = {
        age: profileForm.age ? parseInt(profileForm.age) : null,
        gender: profileForm.gender,
        height: profileForm.height ? parseFloat(profileForm.height) : null,
        activity_level: profileForm.activity_level,
        target_weight: profileForm.target_weight ? parseFloat(profileForm.target_weight) : null,
        target_calories: profileForm.target_calories ? parseInt(profileForm.target_calories) : null,
        target_workouts_per_week: profileForm.target_workouts_per_week ? parseInt(profileForm.target_workouts_per_week) : 3,
        avatar_url: profileForm.avatar_url,
        full_name: profileForm.full_name,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .upsert([{ id: user?.id, ...profileData }]);

      if (error) throw error;
      
      await fetchProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const saveCalorieEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('calorie_entries')
        .insert([{
          food_name: calorieForm.food_name,
          calories: parseInt(calorieForm.calories),
          category: calorieForm.category,
          description: calorieForm.description,
          date: format(selectedDate, 'yyyy-MM-dd'),
          user_id: user?.id
        }]);

      if (error) throw error;
      
      setCalorieForm({
        food_name: '',
        calories: '',
        category: 'breakfast',
        description: ''
      });
      setShowModal(false);
      await fetchCalorieEntries();
    } catch (error) {
      console.error('Error saving calorie entry:', error);
    } finally {
      setSaving(false);
    }
  };

  const saveWorkoutEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('workout_entries')
        .insert([{
          exercise_name: workoutForm.exercise_name,
          type: workoutForm.type,
          duration_minutes: workoutForm.type === 'duration' ? parseInt(workoutForm.duration_minutes) : null,
          repetitions: workoutForm.type === 'reps' ? parseInt(workoutForm.repetitions) : null,
          calories_burned: parseInt(workoutForm.calories_burned),
          date: format(selectedDate, 'yyyy-MM-dd'),
          user_id: user?.id
        }]);

      if (error) throw error;
      
      setWorkoutForm({
        exercise_name: '',
        type: 'duration',
        duration_minutes: '',
        repetitions: '',
        calories_burned: ''
      });
      setShowModal(false);
      await fetchWorkoutEntries();
    } catch (error) {
      console.error('Error saving workout entry:', error);
    } finally {
      setSaving(false);
    }
  };

  const saveWeightEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('weight_entries')
        .upsert([{
          weight: parseFloat(weightForm.weight),
          body_fat: weightForm.body_fat ? parseFloat(weightForm.body_fat) : null,
          date: format(selectedDate, 'yyyy-MM-dd'),
          user_id: user?.id
        }]);

      if (error) throw error;
      
      setWeightForm({
        weight: '',
        body_fat: ''
      });
      setShowModal(false);
      await fetchWeightEntries();
    } catch (error) {
      console.error('Error saving weight entry:', error);
    } finally {
      setSaving(false);
    }
  };

  const saveSleepEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Calculate duration
      const sleepTime = new Date(`2000-01-01 ${sleepForm.sleep_time}`);
      const wakeTime = new Date(`2000-01-01 ${sleepForm.wake_time}`);
      
      // Handle overnight sleep
      if (wakeTime < sleepTime) {
        wakeTime.setDate(wakeTime.getDate() + 1);
      }
      
      const durationMs = wakeTime.getTime() - sleepTime.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);

      const { error } = await supabase
        .from('sleep_entries')
        .upsert([{
          sleep_time: sleepForm.sleep_time,
          wake_time: sleepForm.wake_time,
          duration_hours: Math.round(durationHours * 10) / 10,
          date: format(selectedDate, 'yyyy-MM-dd'),
          user_id: user?.id
        }]);

      if (error) throw error;
      
      setSleepForm({
        sleep_time: '',
        wake_time: ''
      });
      setShowModal(false);
      await fetchSleepEntries();
    } catch (error) {
      console.error('Error saving sleep entry:', error);
    } finally {
      setSaving(false);
    }
  };

  // Effects
  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [fetchAllData]);

  useEffect(() => {
    calculateWeeklyStats();
  }, [calculateWeeklyStats]);

  // Helper functions
  const openModal = (type: typeof modalType) => {
    setModalType(type);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setCalorieForm({
      food_name: '',
      calories: '',
      category: 'breakfast',
      description: ''
    });
    setWorkoutForm({
      exercise_name: '',
      type: 'duration',
      duration_minutes: '',
      repetitions: '',
      calories_burned: ''
    });
    setWeightForm({
      weight: '',
      body_fat: ''
    });
    setSleepForm({
      sleep_time: '',
      wake_time: ''
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedWeek(prev => subDays(prev, 7));
    } else {
      setSelectedWeek(prev => addDays(prev, 7));
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedDate(prev => subDays(prev, 1));
    } else {
      setSelectedDate(prev => addDays(prev, 1));
    }
  };

  const getWeeklyCalorieData = () => {
    const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
    const data = [];
    
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const dayCalories = calorieEntries
        .filter(entry => entry.date === dateStr)
        .reduce((sum, entry) => sum + entry.calories, 0);
      
      const dayWorkouts = workoutEntries
        .filter(entry => entry.date === dateStr)
        .reduce((sum, entry) => sum + entry.calories_burned, 0);
      
      data.push({
        day: format(date, 'EEE', { locale: id }),
        date: format(date, 'dd/MM'),
        calories_in: dayCalories,
        calories_out: dayWorkouts,
        net: dayCalories - dayWorkouts
      });
    }
    
    return data;
  };

  const getWeightChartData = () => {
    return weightEntries
      .slice(0, 30) // Last 30 entries
      .reverse()
      .map(entry => ({
        date: format(new Date(entry.date), 'dd/MM'),
        weight: entry.weight,
        body_fat: entry.body_fat
      }));
  };

  const getTodayEntries = (type: 'calorie' | 'workout' | 'weight' | 'sleep') => {
    const today = format(selectedDate, 'yyyy-MM-dd');
    
    switch (type) {
      case 'calorie':
        return calorieEntries.filter(entry => entry.date === today);
      case 'workout':
        return workoutEntries.filter(entry => entry.date === today);
      case 'weight':
        return weightEntries.filter(entry => entry.date === today);
      case 'sleep':
        return sleepEntries.filter(entry => entry.date === today);
      default:
        return [];
    }
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5); // HH:MM format
  };

  const getStatColor = (type: string, value: number) => {
    switch (type) {
      case 'deficit':
        return value > 0 ? 'text-green-600' : value < -500 ? 'text-red-600' : 'text-yellow-600';
      case 'weight':
        return value < 0 ? 'text-green-600' : value > 0.5 ? 'text-red-600' : 'text-yellow-600';
      case 'workout':
        return value >= (profile?.target_workouts_per_week || 3) ? 'text-green-600' : value >= 2 ? 'text-yellow-600' : 'text-red-600';
      case 'sleep':
        return value >= 7 ? 'text-green-600' : value >= 6 ? 'text-yellow-600' : 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatBgColor = (type: string, value: number) => {
    switch (type) {
      case 'deficit':
        return value > 0 ? 'bg-green-50 border-green-200' : value < -500 ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200';
      case 'weight':
        return value < 0 ? 'bg-green-50 border-green-200' : value > 0.5 ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200';
      case 'workout':
        return value >= (profile?.target_workouts_per_week || 3) ? 'bg-green-50 border-green-200' : value >= 2 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';
      case 'sleep':
        return value >= 7 ? 'bg-green-50 border-green-200' : value >= 6 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const generateWeeklySummary = () => {
    const deficitText = weeklyStats.calorieDeficit > 0 
      ? `defisit ${weeklyStats.calorieDeficit.toLocaleString()} kalori` 
      : `surplus ${Math.abs(weeklyStats.calorieDeficit).toLocaleString()} kalori`;
    
    const weightText = weeklyStats.weightChange < 0 
      ? `menurunkan ${Math.abs(weeklyStats.weightChange)} kg` 
      : weeklyStats.weightChange > 0 
      ? `menaikkan ${weeklyStats.weightChange} kg` 
      : 'mempertahankan berat badan';
    
    const workoutText = weeklyStats.workoutsCompleted >= (profile?.target_workouts_per_week || 3)
      ? 'Latihanmu konsisten!' 
      : weeklyStats.workoutsCompleted >= 2 
      ? 'Latihan cukup baik!' 
      : 'Perlu lebih banyak latihan!';
    
    return `🔥 Minggu ini kamu ${deficitText} dan berhasil ${weightText}. ${workoutText} 💪`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="card animate-fadeIn">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="card animate-fadeIn">
        <div className="flex flex-wrap gap-2 p-1 bg-gray-100 rounded-xl">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'progress', label: 'Progress', icon: Target },
            { id: 'calories', label: 'Calories', icon: Utensils },
            { id: 'workout', label: 'Workout', icon: Activity },
            { id: 'sleep', label: 'Sleep', icon: Moon }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:block">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Week Navigation */}
          <div className="card animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => navigateWeek('prev')}
                  className="btn-icon-secondary"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-center">
                  <h3 className="font-semibold text-gray-900">
                    {format(startOfWeek(selectedWeek, { weekStartsOn: 1 }), 'dd MMM', { locale: id })} - {format(endOfWeek(selectedWeek, { weekStartsOn: 1 }), 'dd MMM yyyy', { locale: id })}
                  </h3>
                  <p className="text-sm text-gray-500">Weekly Report</p>
                </div>
                <button
                  onClick={() => navigateWeek('next')}
                  className="btn-icon-secondary"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setSelectedWeek(new Date())}
                className="btn-secondary text-sm"
              >
                This Week
              </button>
            </div>
          </div>

          {/* Weekly Stats */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h2 className="card-title">Weekly Summary</h2>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Calorie Deficit */}
              <div className={`stat-card ${getStatBgColor('deficit', weeklyStats.calorieDeficit)} stagger-item`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">
                    {weeklyStats.calorieDeficit > 0 ? '🔥 Defisit' : '📈 Surplus'}
                  </span>
                </div>
                <div className={`stat-value ${getStatColor('deficit', weeklyStats.calorieDeficit)}`}>
                  {Math.abs(weeklyStats.calorieDeficit).toLocaleString()}
                </div>
                <div className="stat-label">Kalori</div>
              </div>

              {/* Weight Change */}
              <div className={`stat-card ${getStatBgColor('weight', weeklyStats.weightChange)} stagger-item`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">
                    {weeklyStats.weightChange < 0 ? '⬇️ Turun' : weeklyStats.weightChange > 0 ? '⬆️ Naik' : '➡️ Stabil'}
                  </span>
                </div>
                <div className={`stat-value ${getStatColor('weight', weeklyStats.weightChange)}`}>
                  {weeklyStats.weightChange > 0 ? '+' : ''}{weeklyStats.weightChange}
                </div>
                <div className="stat-label">kg</div>
              </div>

              {/* Workouts Completed */}
              <div className={`stat-card ${getStatBgColor('workout', weeklyStats.workoutsCompleted)} stagger-item`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">
                    💪 Workout
                  </span>
                </div>
                <div className={`stat-value ${getStatColor('workout', weeklyStats.workoutsCompleted)}`}>
                  {weeklyStats.workoutsCompleted}
                </div>
                <div className="stat-label">Hari</div>
              </div>

              {/* Average Sleep */}
              <div className={`stat-card ${getStatBgColor('sleep', weeklyStats.avgSleep)} stagger-item`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">
                    😴 Tidur
                  </span>
                </div>
                <div className={`stat-value ${getStatColor('sleep', weeklyStats.avgSleep)}`}>
                  {weeklyStats.avgSleep}
                </div>
                <div className="stat-label">Jam/Hari</div>
              </div>
            </div>

            {/* Weekly Summary */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <h3 className="font-medium text-blue-900 mb-2 text-sm">Ringkasan Minggu Ini</h3>
              <p className="text-blue-700 text-sm leading-relaxed">
                {generateWeeklySummary()}
              </p>
            </div>
          </div>

          {/* Achievements */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h2 className="card-title">Achievements</h2>
              <div className="text-xs text-gray-500">
                {achievements.filter(a => a.unlocked).length}/{achievements.length} unlocked
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((achievement, index) => (
                <div
                  key={achievement.id}
                  className={`p-4 rounded-xl border transition-all duration-300 hover-lift stagger-item ${
                    achievement.unlocked 
                      ? `${achievement.color} hover:shadow-md` 
                      : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="text-center">
                    <div className={`text-2xl mb-2 ${achievement.unlocked ? '' : 'grayscale'}`}>
                      {achievement.icon}
                    </div>
                    <h3 className={`font-medium mb-1 text-sm ${
                      achievement.unlocked ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {achievement.title}
                    </h3>
                    <p className={`text-xs mb-2 ${
                      achievement.unlocked ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                      {achievement.description}
                    </p>
                    
                    {/* Progress Bar */}
                    {achievement.progress !== undefined && achievement.target && (
                      <div className="mt-2">
                        <div className="progress-bar h-1">
                          <div
                            className="progress-fill h-1"
                            style={{ 
                              width: `${Math.min((achievement.progress / achievement.target) * 100, 100)}%` 
                            }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {achievement.progress}/{achievement.target}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card animate-fadeIn">
          <div className="card-header">
            <h2 className="card-title">Profile Settings</h2>
          </div>

          <form onSubmit={saveProfile} className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                {profileForm.avatar_url ? (
                  <img
                    src={profileForm.avatar_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Avatar URL
                </label>
                <input
                  type="url"
                  value={profileForm.avatar_url}
                  onChange={(e) => setProfileForm({ ...profileForm, avatar_url: e.target.value })}
                  placeholder="https://example.com/avatar.jpg"
                  className="input"
                />
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  placeholder="Your full name"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age
                </label>
                <input
                  type="number"
                  min="10"
                  max="120"
                  value={profileForm.age}
                  onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })}
                  placeholder="25"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <select
                  value={profileForm.gender}
                  onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value as 'male' | 'female' })}
                  className="input"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Height (cm)
                </label>
                <input
                  type="number"
                  min="50"
                  max="300"
                  value={profileForm.height}
                  onChange={(e) => setProfileForm({ ...profileForm, height: e.target.value })}
                  placeholder="170"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Activity Level
                </label>
                <select
                  value={profileForm.activity_level}
                  onChange={(e) => setProfileForm({ ...profileForm, activity_level: e.target.value as Profile['activity_level'] })}
                  className="input"
                >
                  <option value="sedentary">Sedentary (little/no exercise)</option>
                  <option value="lightly_active">Lightly Active (light exercise 1-3 days/week)</option>
                  <option value="moderately_active">Moderately Active (moderate exercise 3-5 days/week)</option>
                  <option value="very_active">Very Active (hard exercise 6-7 days/week)</option>
                  <option value="extremely_active">Extremely Active (very hard exercise, physical job)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Weight (kg)
                </label>
                <input
                  type="number"
                  min="20"
                  max="300"
                  step="0.1"
                  value={profileForm.target_weight}
                  onChange={(e) => setProfileForm({ ...profileForm, target_weight: e.target.value })}
                  placeholder="65"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Calories (kcal/day)
                </label>
                <input
                  type="number"
                  min="800"
                  max="5000"
                  value={profileForm.target_calories}
                  onChange={(e) => setProfileForm({ ...profileForm, target_calories: e.target.value })}
                  placeholder="2000"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Workouts per Week
                </label>
                <input
                  type="number"
                  min="0"
                  max="14"
                  value={profileForm.target_workouts_per_week}
                  onChange={(e) => setProfileForm({ ...profileForm, target_workouts_per_week: e.target.value })}
                  placeholder="3"
                  className="input"
                />
              </div>
            </div>

            {/* BMR & TDEE Display */}
            {profile?.age && profile?.height && weightEntries.length > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <h3 className="font-medium text-blue-900 mb-3">Calculated Metrics</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">BMR:</span>
                    <span className="font-medium text-blue-900 ml-2">
                      {Math.round(calculateBMR())} kcal/day
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700">TDEE:</span>
                    <span className="font-medium text-blue-900 ml-2">
                      {Math.round(calculateTDEE())} kcal/day
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>
      )}

      {/* Progress Tab */}
      {activeTab === 'progress' && (
        <div className="space-y-6">
          {/* Date Navigation */}
          <div className="card animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => navigateDate('prev')}
                  className="btn-icon-secondary"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-center">
                  <h3 className="font-semibold text-gray-900">
                    {format(selectedDate, 'EEEE, dd MMMM yyyy', { locale: id })}
                  </h3>
                  <p className="text-sm text-gray-500">Weight & Progress</p>
                </div>
                <button
                  onClick={() => navigateDate('next')}
                  className="btn-icon-secondary"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setSelectedDate(new Date())}
                className="btn-secondary text-sm"
              >
                Today
              </button>
            </div>
          </div>

          {/* Weight Chart */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h2 className="card-title">Weight Progress</h2>
            </div>

            {weightEntries.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getWeightChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      domain={['dataMin - 2', 'dataMax + 2']}
                    />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        `${value} ${name === 'weight' ? 'kg' : '%'}`,
                        name === 'weight' ? 'Weight' : 'Body Fat'
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    />
                    {getWeightChartData().some(d => d.body_fat) && (
                      <Line
                        type="monotone"
                        dataKey="body_fat"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">No weight data yet</p>
                <p className="text-xs text-gray-400 mt-1">Use the + button to add your first weight entry</p>
              </div>
            )}
          </div>

          {/* Today's Weight Entry */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h2 className="card-title">Today's Weight</h2>
            </div>

            {getTodayEntries('weight').length > 0 ? (
              <div className="space-y-3">
                {getTodayEntries('weight').map((entry: any) => (
                  <div key={entry.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{entry.weight} kg</p>
                        {entry.body_fat && (
                          <p className="text-sm text-gray-600">Body Fat: {entry.body_fat}%</p>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(entry.date), 'dd/MM/yyyy')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Target className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No weight entry for today</p>
                <p className="text-xs text-gray-400 mt-1">Use the + button to add your weight</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Calories Tab */}
      {activeTab === 'calories' && (
        <div className="space-y-6">
          {/* Date Navigation */}
          <div className="card animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => navigateDate('prev')}
                  className="btn-icon-secondary"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-center">
                  <h3 className="font-semibold text-gray-900">
                    {format(selectedDate, 'EEEE, dd MMMM yyyy', { locale: id })}
                  </h3>
                  <p className="text-sm text-gray-500">Calorie Tracking</p>
                </div>
                <button
                  onClick={() => navigateDate('next')}
                  className="btn-icon-secondary"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setSelectedDate(new Date())}
                className="btn-secondary text-sm"
              >
                Today
              </button>
            </div>
          </div>

          {/* Calorie Summary */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h2 className="card-title">Daily Summary</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['breakfast', 'lunch', 'dinner', 'snack'].map((category) => {
                const categoryEntries = getTodayEntries('calorie').filter((entry: any) => entry.category === category);
                const totalCalories = categoryEntries.reduce((sum: number, entry: any) => sum + entry.calories, 0);
                
                return (
                  <div key={category} className="stat-card">
                    <div className="stat-value text-blue-600">{totalCalories}</div>
                    <div className="stat-label capitalize">{category}</div>
                    <div className="text-xs text-gray-500">{categoryEntries.length} items</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="font-medium text-blue-900">Total Calories Today</span>
                <span className="text-xl font-bold text-blue-600">
                  {getTodayEntries('calorie').reduce((sum: number, entry: any) => sum + entry.calories, 0)} kcal
                </span>
              </div>
            </div>
          </div>

          {/* Today's Entries */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h2 className="card-title">Today's Food</h2>
            </div>

            {getTodayEntries('calorie').length > 0 ? (
              <div className="space-y-3">
                {getTodayEntries('calorie').map((entry: any) => (
                  <div key={entry.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{entry.food_name}</p>
                        <p className="text-sm text-gray-600 capitalize">{entry.category}</p>
                        {entry.description && (
                          <p className="text-xs text-gray-500 mt-1">{entry.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-blue-600">{entry.calories} kcal</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Utensils className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No food entries for today</p>
                <p className="text-xs text-gray-400 mt-1">Use the + button to add your meals</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Workout Tab */}
      {activeTab === 'workout' && (
        <div className="space-y-6">
          {/* Date Navigation */}
          <div className="card animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => navigateDate('prev')}
                  className="btn-icon-secondary"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-center">
                  <h3 className="font-semibold text-gray-900">
                    {format(selectedDate, 'EEEE, dd MMMM yyyy', { locale: id })}
                  </h3>
                  <p className="text-sm text-gray-500">Workout Tracking</p>
                </div>
                <button
                  onClick={() => navigateDate('next')}
                  className="btn-icon-secondary"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setSelectedDate(new Date())}
                className="btn-secondary text-sm"
              >
                Today
              </button>
            </div>
          </div>

          {/* Workout Summary */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h2 className="card-title">Daily Summary</h2>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="stat-card">
                <div className="stat-value text-green-600">
                  {getTodayEntries('workout').length}
                </div>
                <div className="stat-label">Exercises</div>
              </div>

              <div className="stat-card">
                <div className="stat-value text-red-600">
                  {getTodayEntries('workout').reduce((sum: number, entry: any) => sum + entry.calories_burned, 0)}
                </div>
                <div className="stat-label">Calories Burned</div>
              </div>

              <div className="stat-card">
                <div className="stat-value text-blue-600">
                  {getTodayEntries('workout')
                    .filter((entry: any) => entry.type === 'duration')
                    .reduce((sum: number, entry: any) => sum + (entry.duration_minutes || 0), 0)}
                </div>
                <div className="stat-label">Total Minutes</div>
              </div>
            </div>
          </div>

          {/* Today's Workouts */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h2 className="card-title">Today's Workouts</h2>
            </div>

            {getTodayEntries('workout').length > 0 ? (
              <div className="space-y-3">
                {getTodayEntries('workout').map((entry: any) => (
                  <div key={entry.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{entry.exercise_name}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          {entry.type === 'duration' && entry.duration_minutes && (
                            <span>⏱️ {entry.duration_minutes} minutes</span>
                          )}
                          {entry.type === 'reps' && entry.repetitions && (
                            <span>🔢 {entry.repetitions}x</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-red-600">{entry.calories_burned} kcal</p>
                        <p className="text-xs text-gray-500 capitalize">{entry.type}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Activity className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No workouts for today</p>
                <p className="text-xs text-gray-400 mt-1">Use the + button to add your exercises</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sleep Tab */}
      {activeTab === 'sleep' && (
        <div className="space-y-6">
          {/* Date Navigation */}
          <div className="card animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => navigateDate('prev')}
                  className="btn-icon-secondary"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-center">
                  <h3 className="font-semibold text-gray-900">
                    {format(selectedDate, 'EEEE, dd MMMM yyyy', { locale: id })}
                  </h3>
                  <p className="text-sm text-gray-500">Sleep Tracking</p>
                </div>
                <button
                  onClick={() => navigateDate('next')}
                  className="btn-icon-secondary"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setSelectedDate(new Date())}
                className="btn-secondary text-sm"
              >
                Today
              </button>
            </div>
          </div>

          {/* Today's Sleep */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h2 className="card-title">Today's Sleep</h2>
            </div>

            {getTodayEntries('sleep').length > 0 ? (
              <div className="space-y-3">
                {getTodayEntries('sleep').map((entry: any) => (
                  <div key={entry.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm text-gray-600">Sleep Time</p>
                        <p className="font-medium text-gray-900">{formatTime(entry.sleep_time)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Wake Time</p>
                        <p className="font-medium text-gray-900">{formatTime(entry.wake_time)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Duration</p>
                        <p className="font-medium text-blue-600">{entry.duration_hours}h</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Moon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No sleep data for today</p>
                <p className="text-xs text-gray-400 mt-1">Use the + button to add your sleep</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      {(activeTab === 'calories' || activeTab === 'workout' || activeTab === 'progress' || activeTab === 'sleep') && (
        <button
          onClick={() => {
            if (activeTab === 'calories') openModal('calorie');
            else if (activeTab === 'workout') openModal('workout');
            else if (activeTab === 'progress') openModal('weight');
            else if (activeTab === 'sleep') openModal('sleep');
          }}
          className="fab"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Add {modalType === 'calorie' ? 'Food' : modalType === 'workout' ? 'Exercise' : modalType === 'weight' ? 'Weight' : 'Sleep'}
                </h3>
                <button
                  onClick={closeModal}
                  className="btn-icon-secondary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Calorie Form */}
              {modalType === 'calorie' && (
                <form onSubmit={saveCalorieEntry} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Food Name
                    </label>
                    <input
                      type="text"
                      value={calorieForm.food_name}
                      onChange={(e) => setCalorieForm({ ...calorieForm, food_name: e.target.value })}
                      placeholder="e.g., Nasi Goreng"
                      className="input"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Calories (kcal)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={calorieForm.calories}
                        onChange={(e) => setCalorieForm({ ...calorieForm, calories: e.target.value })}
                        placeholder="300"
                        className="input"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category
                      </label>
                      <select
                        value={calorieForm.category}
                        onChange={(e) => setCalorieForm({ ...calorieForm, category: e.target.value as CalorieEntry['category'] })}
                        className="input"
                      >
                        <option value="breakfast">Breakfast</option>
                        <option value="lunch">Lunch</option>
                        <option value="dinner">Dinner</option>
                        <option value="snack">Snack</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description (optional)
                    </label>
                    <input
                      type="text"
                      value={calorieForm.description}
                      onChange={(e) => setCalorieForm({ ...calorieForm, description: e.target.value })}
                      placeholder="e.g., With chicken and vegetables"
                      className="input"
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 btn-primary disabled:opacity-50"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              )}

              {/* Workout Form */}
              {modalType === 'workout' && (
                <form onSubmit={saveWorkoutEntry} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exercise Name
                    </label>
                    <input
                      type="text"
                      value={workoutForm.exercise_name}
                      onChange={(e) => setWorkoutForm({ ...workoutForm, exercise_name: e.target.value })}
                      placeholder="e.g., Push-ups"
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type
                    </label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="duration"
                          checked={workoutForm.type === 'duration'}
                          onChange={(e) => setWorkoutForm({ ...workoutForm, type: e.target.value as 'duration' | 'reps' })}
                          className="mr-2"
                        />
                        Duration
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="reps"
                          checked={workoutForm.type === 'reps'}
                          onChange={(e) => setWorkoutForm({ ...workoutForm, type: e.target.value as 'duration' | 'reps' })}
                          className="mr-2"
                        />
                        Repetitions
                      </label>
                    </div>
                  </div>

                  {workoutForm.type === 'duration' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Duration (minutes)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={workoutForm.duration_minutes}
                        onChange={(e) => setWorkoutForm({ ...workoutForm, duration_minutes: e.target.value })}
                        placeholder="30"
                        className="input"
                        required
                      />
                    </div>
                  )}

                  {workoutForm.type === 'reps' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Repetitions
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={workoutForm.repetitions}
                        onChange={(e) => setWorkoutForm({ ...workoutForm, repetitions: e.target.value })}
                        placeholder="20"
                        className="input"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Calories Burned
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={workoutForm.calories_burned}
                      onChange={(e) => setWorkoutForm({ ...workoutForm, calories_burned: e.target.value })}
                      placeholder="150"
                      className="input"
                      required
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 btn-primary disabled:opacity-50"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              )}

              {/* Weight Form */}
              {modalType === 'weight' && (
                <form onSubmit={saveWeightEntry} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      min="20"
                      max="300"
                      step="0.1"
                      value={weightForm.weight}
                      onChange={(e) => setWeightForm({ ...weightForm, weight: e.target.value })}
                      placeholder="70.5"
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Body Fat % (optional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={weightForm.body_fat}
                      onChange={(e) => setWeightForm({ ...weightForm, body_fat: e.target.value })}
                      placeholder="15.5"
                      className="input"
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 btn-primary disabled:opacity-50"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              )}

              {/* Sleep Form */}
              {modalType === 'sleep' && (
                <form onSubmit={saveSleepEntry} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sleep Time
                    </label>
                    <input
                      type="time"
                      value={sleepForm.sleep_time}
                      onChange={(e) => setSleepForm({ ...sleepForm, sleep_time: e.target.value })}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Wake Time
                    </label>
                    <input
                      type="time"
                      value={sleepForm.wake_time}
                      onChange={(e) => setSleepForm({ ...sleepForm, wake_time: e.target.value })}
                      className="input"
                      required
                    />
                  </div>

                  {sleepForm.sleep_time && sleepForm.wake_time && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-700">
                        Duration: {(() => {
                          const sleepTime = new Date(`2000-01-01 ${sleepForm.sleep_time}`);
                          const wakeTime = new Date(`2000-01-01 ${sleepForm.wake_time}`);
                          if (wakeTime < sleepTime) {
                            wakeTime.setDate(wakeTime.getDate() + 1);
                          }
                          const durationMs = wakeTime.getTime() - sleepTime.getTime();
                          const durationHours = durationMs / (1000 * 60 * 60);
                          return `${Math.round(durationHours * 10) / 10} hours`;
                        })()}
                      </p>
                    </div>
                  )}

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 btn-primary disabled:opacity-50"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BodyTracker;