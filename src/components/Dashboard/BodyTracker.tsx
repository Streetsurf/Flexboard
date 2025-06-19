import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  User, 
  Save, 
  Plus, 
  Trash2, 
  Calendar,
  TrendingUp,
  Activity,
  Moon,
  Scale,
  Target,
  Calculator,
  Award,
  Clock,
  Flame,
  BarChart3,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

// Types
interface Profile {
  id: string;
  age?: number;
  height?: number;
  gender: 'male' | 'female';
  activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
  target_weight?: number;
  target_calories?: number;
  target_workouts_per_week?: number;
}

interface CalorieEntry {
  id: string;
  food_name: string;
  calories: number;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  description?: string;
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

interface WeeklyAchievement {
  id: string;
  title: string;
  description: string;
  achieved: boolean;
  icon: React.ReactNode;
  color: string;
}

const BodyTracker: React.FC = () => {
  // State management
  const [activeTab, setActiveTab] = useState<'profile' | 'calories' | 'workout' | 'progress' | 'sleep'>('profile');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data states
  const [profile, setProfile] = useState<Profile | null>(null);
  const [calorieEntries, setCalorieEntries] = useState<CalorieEntry[]>([]);
  const [workoutEntries, setWorkoutEntries] = useState<WorkoutEntry[]>([]);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [sleepEntries, setSleepEntries] = useState<SleepEntry[]>([]);
  
  // Form states
  const [profileForm, setProfileForm] = useState({
    age: '',
    height: '',
    gender: 'male' as 'male' | 'female',
    activity_level: 'moderately_active' as Profile['activity_level'],
    target_weight: '',
    target_calories: '',
    target_workouts_per_week: '3'
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
  
  const [sleepForm, setSleepForm] = useState({
    sleep_time: '',
    wake_time: '',
    duration_hours: ''
  });

  const { user } = useAuth();

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      const [profileRes, caloriesRes, workoutsRes, weightRes, sleepRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('calorie_entries').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('workout_entries').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('weight_entries').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('sleep_entries').select('*').eq('user_id', user.id).order('date', { ascending: false })
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data);
        setProfileForm({
          age: profileRes.data.age?.toString() || '',
          height: profileRes.data.height?.toString() || '',
          gender: profileRes.data.gender || 'male',
          activity_level: profileRes.data.activity_level || 'moderately_active',
          target_weight: profileRes.data.target_weight?.toString() || '',
          target_calories: profileRes.data.target_calories?.toString() || '',
          target_workouts_per_week: profileRes.data.target_workouts_per_week?.toString() || '3'
        });
      }

      setCalorieEntries(caloriesRes.data || []);
      setWorkoutEntries(workoutsRes.data || []);
      setWeightEntries(weightRes.data || []);
      setSleepEntries(sleepRes.data || []);
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // BMR and TDEE calculations
  const calculateBMR = useCallback((age: number, height: number, weight: number, gender: 'male' | 'female'): number => {
    if (gender === 'male') {
      return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
    } else {
      return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
    }
  }, []);

  const calculateTDEE = useCallback((bmr: number, activityLevel: Profile['activity_level']): number => {
    const multipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extremely_active: 1.9
    };
    return bmr * multipliers[activityLevel];
  }, []);

  // Get current weight from latest weight entry
  const currentWeight = useMemo(() => {
    if (weightEntries.length === 0) return null;
    return weightEntries[0].weight;
  }, [weightEntries]);

  // Calculate BMR and TDEE for current user
  const { bmr, tdee } = useMemo(() => {
    if (!profile?.age || !profile?.height || !currentWeight) {
      return { bmr: 0, tdee: 0 };
    }
    
    const calculatedBMR = calculateBMR(profile.age, profile.height, currentWeight, profile.gender);
    const calculatedTDEE = calculateTDEE(calculatedBMR, profile.activity_level);
    
    return {
      bmr: Math.round(calculatedBMR),
      tdee: Math.round(calculatedTDEE)
    };
  }, [profile, currentWeight, calculateBMR, calculateTDEE]);

  // Weekly achievements calculation
  const weeklyAchievements = useMemo((): WeeklyAchievement[] => {
    const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });
    
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

    const targetWorkouts = profile?.target_workouts_per_week || 3;
    const workoutDays = new Set(weekWorkouts.map(w => w.date)).size;
    const avgSleep = weekSleep.length > 0 ? weekSleep.reduce((sum, s) => sum + s.duration_hours, 0) / weekSleep.length : 0;
    const caloriesDays = new Set(weekCalories.map(c => c.date)).size;

    return [
      {
        id: 'workout_goal',
        title: 'Workout Goal',
        description: `Complete ${targetWorkouts} workouts this week`,
        achieved: workoutDays >= targetWorkouts,
        icon: <Activity className="w-4 h-4" />,
        color: workoutDays >= targetWorkouts ? 'text-green-600' : 'text-gray-400'
      },
      {
        id: 'sleep_quality',
        title: 'Sleep Quality',
        description: 'Average 7+ hours of sleep',
        achieved: avgSleep >= 7,
        icon: <Moon className="w-4 h-4" />,
        color: avgSleep >= 7 ? 'text-purple-600' : 'text-gray-400'
      },
      {
        id: 'calorie_tracking',
        title: 'Calorie Tracking',
        description: 'Track calories for 5+ days',
        achieved: caloriesDays >= 5,
        icon: <Flame className="w-4 h-4" />,
        color: caloriesDays >= 5 ? 'text-orange-600' : 'text-gray-400'
      },
      {
        id: 'consistency',
        title: 'Consistency',
        description: 'Log data every day this week',
        achieved: caloriesDays === 7 && weekSleep.length === 7,
        icon: <Award className="w-4 h-4" />,
        color: (caloriesDays === 7 && weekSleep.length === 7) ? 'text-yellow-600' : 'text-gray-400'
      }
    ];
  }, [selectedWeek, calorieEntries, workoutEntries, sleepEntries, profile]);

  // Handle profile save
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      setSaving(true);
      
      const profileData = {
        age: profileForm.age ? parseInt(profileForm.age) : null,
        height: profileForm.height ? parseFloat(profileForm.height) : null,
        gender: profileForm.gender,
        activity_level: profileForm.activity_level,
        target_weight: profileForm.target_weight ? parseFloat(profileForm.target_weight) : null,
        target_calories: profileForm.target_calories ? parseInt(profileForm.target_calories) : null,
        target_workouts_per_week: profileForm.target_workouts_per_week ? parseInt(profileForm.target_workouts_per_week) : null
      };

      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, ...profileData });

      if (error) throw error;
      
      await fetchData();
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  // Handle calorie entry
  const handleCalorieSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('calorie_entries')
        .insert([{
          food_name: calorieForm.food_name,
          calories: parseInt(calorieForm.calories),
          category: calorieForm.category,
          description: calorieForm.description,
          date: format(selectedDate, 'yyyy-MM-dd'),
          user_id: user.id
        }]);

      if (error) throw error;
      
      setCalorieForm({
        food_name: '',
        calories: '',
        category: 'breakfast',
        description: ''
      });
      
      await fetchData();
    } catch (error) {
      console.error('Error adding calorie entry:', error);
    } finally {
      setSaving(false);
    }
  };

  // Handle workout entry
  const handleWorkoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      setSaving(true);
      
      const workoutData = {
        exercise_name: workoutForm.exercise_name,
        type: workoutForm.type,
        duration_minutes: workoutForm.type === 'duration' ? parseInt(workoutForm.duration_minutes) : null,
        repetitions: workoutForm.type === 'reps' ? parseInt(workoutForm.repetitions) : null,
        calories_burned: parseInt(workoutForm.calories_burned),
        date: format(selectedDate, 'yyyy-MM-dd'),
        user_id: user.id
      };

      const { error } = await supabase
        .from('workout_entries')
        .insert([workoutData]);

      if (error) throw error;
      
      setWorkoutForm({
        exercise_name: '',
        type: 'duration',
        duration_minutes: '',
        repetitions: '',
        calories_burned: ''
      });
      
      await fetchData();
    } catch (error) {
      console.error('Error adding workout entry:', error);
    } finally {
      setSaving(false);
    }
  };

  // Handle sleep entry
  const handleSleepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('sleep_entries')
        .upsert([{
          sleep_time: sleepForm.sleep_time,
          wake_time: sleepForm.wake_time,
          duration_hours: parseFloat(sleepForm.duration_hours),
          date: format(selectedDate, 'yyyy-MM-dd'),
          user_id: user.id
        }]);

      if (error) throw error;
      
      setSleepForm({
        sleep_time: '',
        wake_time: '',
        duration_hours: ''
      });
      
      await fetchData();
    } catch (error) {
      console.error('Error adding sleep entry:', error);
    } finally {
      setSaving(false);
    }
  };

  // Delete functions
  const deleteCalorieEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from('calorie_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting calorie entry:', error);
    }
  };

  const deleteWorkoutEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from('workout_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting workout entry:', error);
    }
  };

  const deleteSleepEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sleep_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting sleep entry:', error);
    }
  };

  // Navigation functions
  const navigateDate = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedDate(prev => subDays(prev, 1));
    } else {
      setSelectedDate(prev => addDays(prev, 1));
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedWeek(prev => subDays(prev, 7));
    } else {
      setSelectedWeek(prev => addDays(prev, 7));
    }
  };

  // Get filtered data for selected date
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const todayCalories = calorieEntries.filter(entry => entry.date === selectedDateStr);
  const todayWorkouts = workoutEntries.filter(entry => entry.date === selectedDateStr);
  const todaySleep = sleepEntries.find(entry => entry.date === selectedDateStr);

  // Calculate daily totals
  const dailyCaloriesIn = todayCalories.reduce((sum, entry) => sum + entry.calories, 0);
  const dailyCaloriesOut = todayWorkouts.reduce((sum, entry) => sum + entry.calories_burned, 0);
  const netCalories = dailyCaloriesIn - dailyCaloriesOut;

  // Weight progress data for chart
  const weightProgressData = useMemo(() => {
    return weightEntries
      .slice(0, 30)
      .reverse()
      .map(entry => ({
        date: format(new Date(entry.date), 'MMM dd'),
        weight: entry.weight,
        bodyFat: entry.body_fat || 0
      }));
  }, [weightEntries]);

  // Sleep progress data for chart
  const sleepProgressData = useMemo(() => {
    const last7Days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date()
    });

    return last7Days.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const sleepEntry = sleepEntries.find(entry => entry.date === dateStr);
      
      return {
        date: format(date, 'EEE'),
        hours: sleepEntry?.duration_hours || 0
      };
    });
  }, [sleepEntries]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="card animate-fadeIn">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card animate-fadeIn">
        <div className="card-header">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <h2 className="card-title">Body Tracker</h2>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'profile', label: 'Profile', icon: User, color: 'text-blue-600' },
              { id: 'calories', label: 'Calories', icon: Flame, color: 'text-orange-600' },
              { id: 'workout', label: 'Workout', icon: Activity, color: 'text-blue-600' },
              { id: 'progress', label: 'Progress', icon: TrendingUp, color: 'text-green-600' },
              { id: 'sleep', label: 'Sleep', icon: Moon, color: 'text-purple-600' }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? `border-blue-500 ${tab.color}`
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

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Weekly Report */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-blue-900 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Weekly Report
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => navigateWeek('prev')}
                    className="p-1 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium text-blue-700 px-3 py-1 bg-white rounded-lg">
                    {format(startOfWeek(selectedWeek, { weekStartsOn: 1 }), 'MMM dd')} - {format(endOfWeek(selectedWeek, { weekStartsOn: 1 }), 'MMM dd')}
                  </span>
                  <button
                    onClick={() => navigateWeek('next')}
                    className="p-1 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {weeklyAchievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`p-4 bg-white rounded-lg border-2 transition-all duration-200 ${
                      achievement.achieved 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-gray-200'
                    }`}
                  >
                    <div className={`flex items-center space-x-2 mb-2 ${achievement.color}`}>
                      {achievement.icon}
                      <span className="font-medium text-sm">{achievement.title}</span>
                    </div>
                    <p className="text-xs text-gray-600">{achievement.description}</p>
                    {achievement.achieved && (
                      <div className="mt-2 flex items-center text-green-600">
                        <Award className="w-3 h-3 mr-1" />
                        <span className="text-xs font-medium">Achieved!</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Profile Information */}
            <form onSubmit={handleProfileSave} className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Basic Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age (years)
                  </label>
                  <input
                    type="number"
                    value={profileForm.age}
                    onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })}
                    placeholder="Enter your age"
                    className="input"
                    min="10"
                    max="120"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    value={profileForm.height}
                    onChange={(e) => setProfileForm({ ...profileForm, height: e.target.value })}
                    placeholder="Enter your height"
                    className="input"
                    min="50"
                    max="300"
                    step="0.1"
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

                {/* Current Weight Display */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Weight (kg)
                  </label>
                  <div className="input bg-gray-50 text-gray-600 cursor-not-allowed flex items-center">
                    <Scale className="w-4 h-4 mr-2 text-gray-400" />
                    {currentWeight ? `${currentWeight} kg` : 'No weight data'}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Add weight entries in the Progress tab to see current weight
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Weight (kg)
                  </label>
                  <input
                    type="number"
                    value={profileForm.target_weight}
                    onChange={(e) => setProfileForm({ ...profileForm, target_weight: e.target.value })}
                    placeholder="Enter target weight"
                    className="input"
                    min="20"
                    max="300"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Calories (per day)
                  </label>
                  <input
                    type="number"
                    value={profileForm.target_calories}
                    onChange={(e) => setProfileForm({ ...profileForm, target_calories: e.target.value })}
                    placeholder="Enter target calories"
                    className="input"
                    min="800"
                    max="5000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Workouts (per week)
                  </label>
                  <input
                    type="number"
                    value={profileForm.target_workouts_per_week}
                    onChange={(e) => setProfileForm({ ...profileForm, target_workouts_per_week: e.target.value })}
                    placeholder="Enter target workouts"
                    className="input"
                    min="0"
                    max="14"
                  />
                </div>
              </div>

              {/* BMR and TDEE Display */}
              {bmr > 0 && tdee > 0 && (
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <h4 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                    <Calculator className="w-5 h-5 mr-2" />
                    Metabolic Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <h5 className="font-medium text-blue-800 mb-2">Basal Metabolic Rate (BMR)</h5>
                      <p className="text-2xl font-bold text-blue-600">{bmr}</p>
                      <p className="text-sm text-blue-600">calories/day at rest</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <h5 className="font-medium text-blue-800 mb-2">Total Daily Energy Expenditure (TDEE)</h5>
                      <p className="text-2xl font-bold text-blue-600">{tdee}</p>
                      <p className="text-sm text-blue-600">calories/day with activity</p>
                    </div>
                  </div>
                  <div className="mt-4 p-4 bg-blue-100 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Recommendation:</strong> To maintain weight, consume around {tdee} calories per day. 
                      To lose weight, create a deficit of 300-500 calories. To gain weight, add 300-500 calories.
                    </p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          </div>
        )}

        {/* Calories Tab */}
        {activeTab === 'calories' && (
          <div className="space-y-6">
            {/* Date Selection */}
            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-xl border border-orange-200">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-orange-900">Tracking Date:</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigateDate('prev')}
                  className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-medium text-orange-900 px-4 py-2 bg-white rounded-lg">
                  {format(selectedDate, 'EEEE, MMM dd, yyyy')}
                </span>
                <button
                  onClick={() => navigateDate('next')}
                  className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Daily Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <h4 className="font-medium text-green-800 mb-2">Calories In</h4>
                <p className="text-2xl font-bold text-green-600">{dailyCaloriesIn}</p>
                <p className="text-sm text-green-600">from food</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                <h4 className="font-medium text-orange-800 mb-2">Net Calories</h4>
                <p className="text-2xl font-bold text-orange-600">{netCalories}</p>
                <p className="text-sm text-orange-600">total balance</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2">Target</h4>
                <p className="text-2xl font-bold text-blue-600">{profile?.target_calories || tdee}</p>
                <p className="text-sm text-blue-600">daily goal</p>
              </div>
            </div>

            {/* Add Calorie Entry */}
            <form onSubmit={handleCalorieSubmit} className="bg-orange-50 rounded-xl p-6 border border-orange-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-orange-900">Add Food Entry</h3>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-icon-primary"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-2">
                    Food Name
                  </label>
                  <input
                    type="text"
                    value={calorieForm.food_name}
                    onChange={(e) => setCalorieForm({ ...calorieForm, food_name: e.target.value })}
                    placeholder="Enter food name"
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-2">
                    Calories
                  </label>
                  <input
                    type="number"
                    value={calorieForm.calories}
                    onChange={(e) => setCalorieForm({ ...calorieForm, calories: e.target.value })}
                    placeholder="Enter calories"
                    className="input"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-2">
                    Category
                  </label>
                  <select
                    value={calorieForm.category}
                    onChange={(e) => setCalorieForm({ ...calorieForm, category: e.target.value as CalorieEntry['category'] })}
                    className="input"
                  >
                    <option value="breakfast">Sarapan (Breakfast)</option>
                    <option value="lunch">Makan Siang (Lunch)</option>
                    <option value="dinner">Makan Sore/Malam (Dinner)</option>
                    <option value="snack">Cemilan (Snack)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-2">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={calorieForm.description}
                    onChange={(e) => setCalorieForm({ ...calorieForm, description: e.target.value })}
                    placeholder="Additional notes"
                    className="input"
                  />
                </div>
              </div>
            </form>

            {/* Today's Entries */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">Today's Food Entries</h3>
              {todayCalories.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Flame className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No food entries for today</p>
                </div>
              ) : (
                todayCalories.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{entry.food_name}</h4>
                      <p className="text-sm text-gray-600">
                        {entry.calories} calories • {entry.category}
                        {entry.description && ` • ${entry.description}`}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteCalorieEntry(entry.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Workout Tab */}
        {activeTab === 'workout' && (
          <div className="space-y-6">
            {/* Date Selection */}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Tracking Date:</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigateDate('prev')}
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-medium text-blue-900 px-4 py-2 bg-white rounded-lg">
                  {format(selectedDate, 'EEEE, MMM dd, yyyy')}
                </span>
                <button
                  onClick={() => navigateDate('next')}
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Daily Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2">Calories Burned</h4>
                <p className="text-2xl font-bold text-blue-600">{dailyCaloriesOut}</p>
                <p className="text-sm text-blue-600">from workouts</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <h4 className="font-medium text-green-800 mb-2">Workouts</h4>
                <p className="text-2xl font-bold text-green-600">{todayWorkouts.length}</p>
                <p className="text-sm text-green-600">completed today</p>
              </div>
            </div>

            {/* Add Workout Entry */}
            <form onSubmit={handleWorkoutSubmit} className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-blue-900">Add Workout Entry</h3>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-icon-primary"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    Exercise Name
                  </label>
                  <input
                    type="text"
                    value={workoutForm.exercise_name}
                    onChange={(e) => setWorkoutForm({ ...workoutForm, exercise_name: e.target.value })}
                    placeholder="Enter exercise name"
                    className="input"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-2">
                      Workout Type
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="workoutType"
                          value="duration"
                          checked={workoutForm.type === 'duration'}
                          onChange={(e) => setWorkoutForm({ ...workoutForm, type: e.target.value as 'duration' | 'reps' })}
                          className="mr-2"
                        />
                        Duration-based
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="workoutType"
                          value="reps"
                          checked={workoutForm.type === 'reps'}
                          onChange={(e) => setWorkoutForm({ ...workoutForm, type: e.target.value as 'duration' | 'reps' })}
                          className="mr-2"
                        />
                        Repetition-based
                      </label>
                    </div>
                  </div>

                  <div>
                    {workoutForm.type === 'duration' ? (
                      <div>
                        <label className="block text-sm font-medium text-blue-800 mb-2">
                          Duration (minutes)
                        </label>
                        <input
                          type="number"
                          value={workoutForm.duration_minutes}
                          onChange={(e) => setWorkoutForm({ ...workoutForm, duration_minutes: e.target.value })}
                          placeholder="Enter duration"
                          className="input"
                          min="1"
                          required
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-blue-800 mb-2">
                          Repetitions
                        </label>
                        <input
                          type="number"
                          value={workoutForm.repetitions}
                          onChange={(e) => setWorkoutForm({ ...workoutForm, repetitions: e.target.value })}
                          placeholder="Enter repetitions"
                          className="input"
                          min="1"
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    Calories Burned
                  </label>
                  <input
                    type="number"
                    value={workoutForm.calories_burned}
                    onChange={(e) => setWorkoutForm({ ...workoutForm, calories_burned: e.target.value })}
                    placeholder="Enter calories burned"
                    className="input"
                    min="1"
                    required
                  />
                </div>
              </div>
            </form>

            {/* Today's Workouts */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">Today's Workouts</h3>
              {todayWorkouts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No workouts for today</p>
                </div>
              ) : (
                todayWorkouts.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{entry.exercise_name}</h4>
                      <p className="text-sm text-gray-600">
                        {entry.type === 'duration' 
                          ? `${entry.duration_minutes} minutes`
                          : `${entry.repetitions}x`
                        } • {entry.calories_burned} calories burned
                      </p>
                    </div>
                    <button
                      onClick={() => deleteWorkoutEntry(entry.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Progress Tab */}
        {activeTab === 'progress' && (
          <div className="space-y-6">
            {/* Fitness Goals */}
            <div className="bg-green-50 rounded-xl p-6 border border-green-200">
              <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Fitness Goals
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <h4 className="font-medium text-green-800 mb-2">Current Weight</h4>
                  <p className="text-2xl font-bold text-green-600">
                    {currentWeight ? `${currentWeight} kg` : 'No data'}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <h4 className="font-medium text-green-800 mb-2">Target Weight</h4>
                  <p className="text-2xl font-bold text-green-600">
                    {profile?.target_weight ? `${profile.target_weight} kg` : 'Not set'}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <h4 className="font-medium text-green-800 mb-2">Progress</h4>
                  <p className="text-2xl font-bold text-green-600">
                    {currentWeight && profile?.target_weight 
                      ? `${Math.abs(currentWeight - profile.target_weight).toFixed(1)} kg to go`
                      : 'Set targets'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Weight Progress Chart */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Scale className="w-5 h-5 mr-2" />
                Weight Progress
              </h3>
              {weightProgressData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightProgressData}>
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
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Scale className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No weight data yet. Add weight entries to see progress.</p>
                </div>
              )}
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2">Current Weight</h4>
                <p className="text-xl font-bold text-blue-600">
                  {currentWeight ? `${currentWeight} kg` : 'No data'}
                </p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <h4 className="font-medium text-green-800 mb-2">Weekly Change</h4>
                <p className="text-xl font-bold text-green-600">
                  {weightEntries.length >= 2 
                    ? `${(weightEntries[0].weight - weightEntries[1].weight).toFixed(1)} kg`
                    : 'No data'
                  }
                </p>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                <h4 className="font-medium text-purple-800 mb-2">Workouts This Week</h4>
                <p className="text-xl font-bold text-purple-600">
                  {workoutEntries.filter(entry => {
                    const entryDate = new Date(entry.date);
                    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
                    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
                    return entryDate >= weekStart && entryDate <= weekEnd;
                  }).length}
                </p>
              </div>
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                <h4 className="font-medium text-orange-800 mb-2">Calorie Status</h4>
                <p className="text-xl font-bold text-orange-600">
                  {netCalories > 0 ? `+${netCalories}` : netCalories} cal
                </p>
                <p className="text-xs text-orange-600">
                  {netCalories > 0 ? 'Surplus' : netCalories < 0 ? 'Deficit' : 'Balanced'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sleep Tab */}
        {activeTab === 'sleep' && (
          <div className="space-y-6">
            {/* Date Selection */}
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border border-purple-200">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-purple-900">Tracking Date:</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigateDate('prev')}
                  className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-medium text-purple-900 px-4 py-2 bg-white rounded-lg">
                  {format(selectedDate, 'EEEE, MMM dd, yyyy')}
                </span>
                <button
                  onClick={() => navigateDate('next')}
                  className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sleep Chart */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Moon className="w-5 h-5 mr-2" />
                Sleep Pattern (Last 7 Days)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sleepProgressData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} domain={[0, 12]} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="hours" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Add Sleep Entry */}
            <form onSubmit={handleSleepSubmit} className="bg-purple-50 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-purple-900">Add Sleep Entry</h3>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-icon-primary"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-2">
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
                  <label className="block text-sm font-medium text-purple-800 mb-2">
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

                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-2">
                    Duration (hours)
                  </label>
                  <input
                    type="number"
                    value={sleepForm.duration_hours}
                    onChange={(e) => setSleepForm({ ...sleepForm, duration_hours: e.target.value })}
                    placeholder="Enter sleep duration"
                    className="input"
                    min="0.1"
                    max="24"
                    step="0.1"
                    required
                  />
                </div>
              </div>
            </form>

            {/* Today's Sleep */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">Today's Sleep</h3>
              {todaySleep ? (
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">Sleep Duration: {todaySleep.duration_hours} hours</h4>
                    <p className="text-sm text-gray-600">
                      {todaySleep.sleep_time} - {todaySleep.wake_time}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteSleepEntry(todaySleep.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Moon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No sleep data for today</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BodyTracker;