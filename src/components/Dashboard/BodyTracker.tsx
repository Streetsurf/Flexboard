import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Dumbbell, 
  Calendar, 
  User, 
  Target, 
  TrendingUp, 
  Award, 
  Clock, 
  Moon, 
  Apple, 
  Activity,
  Plus,
  Save,
  Edit2,
  X,
  Upload,
  Calculator,
  Zap,
  BarChart3,
  Scale,
  Heart
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subDays, isToday, isSameDay } from 'date-fns';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Types
interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
  age: number;
  height: number;
  activity_level: string;
  target_weight: number;
  target_calories: number;
  target_workouts_per_week: number;
  gender?: 'male' | 'female';
}

interface CalorieEntry {
  id: string;
  food_name: string;
  calories: number;
  category: string;
  description: string;
  date: string;
  user_id: string;
}

interface WorkoutEntry {
  id: string;
  exercise_name: string;
  type: string;
  duration_minutes: number;
  repetitions: number;
  calories_burned: number;
  date: string;
  user_id: string;
}

interface WeightEntry {
  id: string;
  weight: number;
  body_fat: number;
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

interface BMRCalculation {
  bmr: number;
  tdee: number;
  formula: string;
  activityMultiplier: number;
  recommendedCalories: {
    maintain: number;
    mildWeightLoss: number;
    weightLoss: number;
    extremeWeightLoss: number;
    mildWeightGain: number;
    weightGain: number;
    extremeWeightGain: number;
  };
}

const BodyTracker: React.FC = () => {
  // State management
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'progress' | 'calories' | 'workouts' | 'sleep'>('dashboard');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Data states
  const [profile, setProfile] = useState<Profile | null>(null);
  const [calorieEntries, setCalorieEntries] = useState<CalorieEntry[]>([]);
  const [workoutEntries, setWorkoutEntries] = useState<WorkoutEntry[]>([]);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [sleepEntries, setSleepEntries] = useState<SleepEntry[]>([]);
  
  // Form states
  const [editingProfile, setEditingProfile] = useState(false);
  const [showCalorieForm, setShowCalorieForm] = useState(false);
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [showSleepForm, setShowSleepForm] = useState(false);
  
  const { user } = useAuth();

  // BMR and TDEE Calculation Functions
  const calculateBMR = useCallback((profile: Profile, currentWeight?: number): BMRCalculation | null => {
    if (!profile.age || !profile.height || (!currentWeight && !profile.target_weight)) {
      return null;
    }

    const weight = currentWeight || profile.target_weight;
    const age = profile.age;
    const height = profile.height;
    const gender = profile.gender || 'male'; // Default to male if not specified

    let bmr: number;
    let formula: string;

    // Mifflin-St Jeor Equation (more accurate than Harris-Benedict)
    if (gender === 'male') {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
      formula = 'Mifflin-St Jeor (Male)';
    } else {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
      formula = 'Mifflin-St Jeor (Female)';
    }

    // Activity level multipliers
    const activityMultipliers = {
      sedentary: 1.2,           // Little/no exercise
      lightly_active: 1.375,    // Light exercise 1-3 days/week
      moderately_active: 1.55,  // Moderate exercise 3-5 days/week
      very_active: 1.725,       // Hard exercise 6-7 days/week
      extremely_active: 1.9     // Very hard exercise, physical job
    };

    const activityMultiplier = activityMultipliers[profile.activity_level as keyof typeof activityMultipliers] || 1.55;
    const tdee = bmr * activityMultiplier;

    // Calculate recommended calories for different goals
    const recommendedCalories = {
      maintain: Math.round(tdee),
      mildWeightLoss: Math.round(tdee - 250),      // 0.25 kg/week loss
      weightLoss: Math.round(tdee - 500),          // 0.5 kg/week loss
      extremeWeightLoss: Math.round(tdee - 750),   // 0.75 kg/week loss
      mildWeightGain: Math.round(tdee + 250),      // 0.25 kg/week gain
      weightGain: Math.round(tdee + 500),          // 0.5 kg/week gain
      extremeWeightGain: Math.round(tdee + 750)    // 0.75 kg/week gain
    };

    return {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      formula,
      activityMultiplier,
      recommendedCalories
    };
  }, []);

  // Get current weight from latest weight entry
  const getCurrentWeight = useCallback(() => {
    if (weightEntries.length === 0) return null;
    return weightEntries[0].weight; // Already sorted by date desc
  }, [weightEntries]);

  // Calculate BMR/TDEE with current or target weight
  const bmrCalculation = useMemo(() => {
    if (!profile) return null;
    const currentWeight = getCurrentWeight();
    return calculateBMR(profile, currentWeight);
  }, [profile, calculateBMR, getCurrentWeight]);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const [profileRes, caloriesRes, workoutsRes, weightRes, sleepRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('calorie_entries').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('workout_entries').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('weight_entries').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('sleep_entries').select('*').eq('user_id', user.id).order('date', { ascending: false })
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (caloriesRes.data) setCalorieEntries(caloriesRes.data);
      if (workoutsRes.data) setWorkoutEntries(workoutsRes.data);
      if (weightRes.data) setWeightEntries(weightRes.data);
      if (sleepRes.data) setSleepEntries(sleepRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Profile form handlers
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    age: '',
    height: '',
    gender: 'male' as 'male' | 'female',
    activity_level: 'moderately_active',
    target_weight: '',
    target_workouts_per_week: '3',
    avatar_url: ''
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || '',
        age: profile.age?.toString() || '',
        height: profile.height?.toString() || '',
        gender: (profile.gender as 'male' | 'female') || 'male',
        activity_level: profile.activity_level || 'moderately_active',
        target_weight: profile.target_weight?.toString() || '',
        target_workouts_per_week: profile.target_workouts_per_week?.toString() || '3',
        avatar_url: profile.avatar_url || ''
      });
    }
  }, [profile]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updatedProfile = {
        full_name: profileForm.full_name,
        age: parseInt(profileForm.age) || null,
        height: parseFloat(profileForm.height) || null,
        gender: profileForm.gender,
        activity_level: profileForm.activity_level,
        target_weight: parseFloat(profileForm.target_weight) || null,
        target_workouts_per_week: parseInt(profileForm.target_workouts_per_week) || 3,
        avatar_url: profileForm.avatar_url,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('profiles')
        .upsert({ id: user?.id, ...updatedProfile })
        .select()
        .single();

      if (error) throw error;
      
      setProfile(data);
      setEditingProfile(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  // Avatar upload handler
  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB');
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 200;
        canvas.height = 200;
        
        if (ctx) {
          const scale = Math.min(200 / img.width, 200 / img.height);
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;
          const x = (200 - scaledWidth) / 2;
          const y = (200 - scaledHeight) / 2;
          
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 200, 200);
          ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
          
          const resizedDataUrl = canvas.toDataURL('image/png', 0.9);
          setProfileForm(prev => ({ ...prev, avatar_url: resizedDataUrl }));
        }
        setUploading(false);
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.readAsDataURL(file);
  };

  // Weekly achievements calculation
  const getWeeklyAchievements = useCallback(() => {
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

    const achievements = [];
    
    // Workout goals
    if (weekWorkouts.length >= (profile?.target_workouts_per_week || 3)) {
      achievements.push({
        title: 'Workout Goal Achieved! 💪',
        description: `Completed ${weekWorkouts.length} workouts this week`,
        type: 'success'
      });
    }
    
    // Calorie tracking consistency
    if (weekCalories.length >= 5) {
      achievements.push({
        title: 'Consistent Tracking! 📊',
        description: `Tracked calories for ${weekCalories.length} days`,
        type: 'info'
      });
    }
    
    // Sleep consistency
    if (weekSleep.length >= 5) {
      achievements.push({
        title: 'Sleep Tracking Master! 😴',
        description: `Logged sleep for ${weekSleep.length} days`,
        type: 'success'
      });
    }

    // BMR/TDEE Achievement
    if (bmrCalculation && weekCalories.length > 0) {
      const avgDailyCalories = weekCalories.reduce((sum, entry) => sum + entry.calories, 0) / weekCalories.length;
      const targetCalories = bmrCalculation.recommendedCalories.maintain;
      
      if (Math.abs(avgDailyCalories - targetCalories) <= 200) {
        achievements.push({
          title: 'Perfect Calorie Balance! ⚖️',
          description: `Average intake matches your TDEE target`,
          type: 'success'
        });
      }
    }
    
    return achievements;
  }, [selectedWeek, calorieEntries, workoutEntries, sleepEntries, profile, bmrCalculation]);

  // Calorie form handlers
  const [calorieForm, setCalorieForm] = useState({
    food_name: '',
    calories: '',
    category: 'breakfast',
    description: ''
  });

  const handleCalorieSubmit = async (e: React.FormEvent) => {
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
      
      setCalorieForm({ food_name: '', calories: '', category: 'breakfast', description: '' });
      setShowCalorieForm(false);
      fetchData();
    } catch (error) {
      console.error('Error adding calorie entry:', error);
    } finally {
      setSaving(false);
    }
  };

  // Workout form handlers
  const [workoutForm, setWorkoutForm] = useState({
    exercise_name: '',
    type: 'duration',
    duration_minutes: '',
    repetitions: '',
    calories_burned: ''
  });

  const handleWorkoutSubmit = async (e: React.FormEvent) => {
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
      
      setWorkoutForm({ exercise_name: '', type: 'duration', duration_minutes: '', repetitions: '', calories_burned: '' });
      setShowWorkoutForm(false);
      fetchData();
    } catch (error) {
      console.error('Error adding workout entry:', error);
    } finally {
      setSaving(false);
    }
  };

  // Weight form handlers
  const [weightForm, setWeightForm] = useState({
    weight: '',
    body_fat: ''
  });

  const handleWeightSubmit = async (e: React.FormEvent) => {
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
      
      setWeightForm({ weight: '', body_fat: '' });
      setShowWeightForm(false);
      fetchData();
    } catch (error) {
      console.error('Error adding weight entry:', error);
    } finally {
      setSaving(false);
    }
  };

  // Sleep form handlers
  const [sleepForm, setSleepForm] = useState({
    sleep_time: '',
    wake_time: ''
  });

  const calculateSleepDuration = (sleepTime: string, wakeTime: string): number => {
    const sleep = new Date(`2000-01-01 ${sleepTime}`);
    let wake = new Date(`2000-01-01 ${wakeTime}`);
    
    if (wake <= sleep) {
      wake = new Date(`2000-01-02 ${wakeTime}`);
    }
    
    const diffMs = wake.getTime() - sleep.getTime();
    return diffMs / (1000 * 60 * 60);
  };

  const handleSleepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const duration = calculateSleepDuration(sleepForm.sleep_time, sleepForm.wake_time);
      
      const { error } = await supabase
        .from('sleep_entries')
        .upsert([{
          sleep_time: sleepForm.sleep_time,
          wake_time: sleepForm.wake_time,
          duration_hours: duration,
          date: format(selectedDate, 'yyyy-MM-dd'),
          user_id: user?.id
        }]);

      if (error) throw error;
      
      setSleepForm({ sleep_time: '', wake_time: '' });
      setShowSleepForm(false);
      fetchData();
    } catch (error) {
      console.error('Error adding sleep entry:', error);
    } finally {
      setSaving(false);
    }
  };

  // Get today's entries
  const getTodaysEntries = (entries: any[], dateField = 'date') => {
    const today = format(selectedDate, 'yyyy-MM-dd');
    return entries.filter(entry => entry[dateField] === today);
  };

  // Chart data preparation
  const getWeightChartData = () => {
    return weightEntries.slice(0, 30).reverse().map(entry => ({
      date: format(new Date(entry.date), 'MMM dd'),
      weight: entry.weight,
      body_fat: entry.body_fat
    }));
  };

  const getSleepChartData = () => {
    return sleepEntries.slice(0, 30).reverse().map(entry => ({
      date: format(new Date(entry.date), 'MMM dd'),
      hours: entry.duration_hours
    }));
  };

  // Activity level labels
  const activityLevels = {
    sedentary: 'Sedentary (Little/no exercise)',
    lightly_active: 'Lightly Active (Light exercise 1-3 days/week)',
    moderately_active: 'Moderately Active (Moderate exercise 3-5 days/week)',
    very_active: 'Very Active (Hard exercise 6-7 days/week)',
    extremely_active: 'Extremely Active (Very hard exercise, physical job)'
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
            { id: 'dashboard', label: 'Dashboard', icon: BarChart3, color: 'from-blue-500 to-purple-600' },
            { id: 'profile', label: 'Profile', icon: User, color: 'from-green-500 to-blue-500' },
            { id: 'progress', label: 'Progress', icon: TrendingUp, color: 'from-purple-500 to-pink-500' },
            { id: 'calories', label: 'Calories', icon: Apple, color: 'from-orange-500 to-red-500' },
            { id: 'workouts', label: 'Workouts', icon: Dumbbell, color: 'from-blue-500 to-indigo-600' },
            { id: 'sleep', label: 'Sleep', icon: Moon, color: 'from-indigo-500 to-purple-600' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 hover-lift ${
                activeTab === tab.id
                  ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:block">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Week Navigation */}
          <div className="card animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                Weekly Report
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedWeek(subDays(selectedWeek, 7))}
                  className="btn-icon-secondary"
                >
                  ←
                </button>
                <span className="text-sm font-medium text-gray-700 px-3">
                  {format(startOfWeek(selectedWeek, { weekStartsOn: 1 }), 'MMM dd')} - {format(endOfWeek(selectedWeek, { weekStartsOn: 1 }), 'MMM dd, yyyy')}
                </span>
                <button
                  onClick={() => setSelectedWeek(new Date())}
                  className="btn-secondary text-xs"
                  disabled={isSameDay(selectedWeek, new Date())}
                >
                  This Week
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="stat-card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <div className="stat-value text-blue-600">
                  {getTodaysEntries(workoutEntries).length}
                </div>
                <div className="stat-label text-blue-700">Today's Workouts</div>
              </div>
              
              <div className="stat-card bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <div className="stat-value text-orange-600">
                  {getTodaysEntries(calorieEntries).reduce((sum, entry) => sum + entry.calories, 0)}
                </div>
                <div className="stat-label text-orange-700">Calories Today</div>
              </div>
              
              <div className="stat-card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <div className="stat-value text-purple-600">
                  {getTodaysEntries(sleepEntries)[0]?.duration_hours?.toFixed(1) || '0'}h
                </div>
                <div className="stat-label text-purple-700">Last Sleep</div>
              </div>
              
              <div className="stat-card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <div className="stat-value text-green-600">
                  {bmrCalculation?.tdee || 0}
                </div>
                <div className="stat-label text-green-700">TDEE (kcal)</div>
              </div>
            </div>

            {/* BMR/TDEE Information */}
            {bmrCalculation && (
              <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <Calculator className="w-5 h-5 mr-2 text-green-600" />
                    Your Metabolic Profile
                  </h3>
                  <span className="text-xs text-gray-500">{bmrCalculation.formula}</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">Basal Metabolic Rate (BMR)</div>
                    <div className="text-xl font-bold text-gray-900">{bmrCalculation.bmr} kcal/day</div>
                    <div className="text-xs text-gray-500">Calories burned at rest</div>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">Total Daily Energy Expenditure (TDEE)</div>
                    <div className="text-xl font-bold text-green-600">{bmrCalculation.tdee} kcal/day</div>
                    <div className="text-xs text-gray-500">Including activity level ({bmrCalculation.activityMultiplier}x)</div>
                  </div>
                </div>

                {/* Calorie Recommendations */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <Target className="w-4 h-4 mr-2 text-blue-600" />
                    Calorie Recommendations
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="text-center p-2 bg-red-50 rounded-lg">
                      <div className="font-semibold text-red-600">{bmrCalculation.recommendedCalories.weightLoss}</div>
                      <div className="text-red-500">Weight Loss</div>
                      <div className="text-gray-500">-0.5kg/week</div>
                    </div>
                    <div className="text-center p-2 bg-yellow-50 rounded-lg">
                      <div className="font-semibold text-yellow-600">{bmrCalculation.recommendedCalories.mildWeightLoss}</div>
                      <div className="text-yellow-500">Mild Loss</div>
                      <div className="text-gray-500">-0.25kg/week</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded-lg border-2 border-green-300">
                      <div className="font-semibold text-green-600">{bmrCalculation.recommendedCalories.maintain}</div>
                      <div className="text-green-500">Maintain</div>
                      <div className="text-gray-500">Current weight</div>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded-lg">
                      <div className="font-semibold text-blue-600">{bmrCalculation.recommendedCalories.weightGain}</div>
                      <div className="text-blue-500">Weight Gain</div>
                      <div className="text-gray-500">+0.5kg/week</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Weekly Achievements */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Award className="w-5 h-5 mr-2 text-yellow-600" />
                Weekly Achievements
              </h3>
              <div className="space-y-2">
                {getWeeklyAchievements().map((achievement, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      achievement.type === 'success'
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-blue-50 border-blue-200 text-blue-800'
                    }`}
                  >
                    <div className="font-medium">{achievement.title}</div>
                    <div className="text-sm opacity-90">{achievement.description}</div>
                  </div>
                ))}
                {getWeeklyAchievements().length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <Award className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Complete activities this week to earn achievements!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card animate-fadeIn">
          <div className="card-header">
            <h2 className="card-title flex items-center">
              <User className="w-5 h-5 mr-2 text-green-600" />
              Body Profile
            </h2>
            {!editingProfile && (
              <button
                onClick={() => setEditingProfile(true)}
                className="btn-secondary"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Profile
              </button>
            )}
          </div>

          {editingProfile ? (
            <form onSubmit={handleProfileSave} className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex items-center space-x-6">
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
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="btn-secondary cursor-pointer"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Upload Photo'}
                  </label>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
                    className="input"
                    placeholder="Enter your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age
                  </label>
                  <input
                    type="number"
                    value={profileForm.age}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, age: e.target.value }))}
                    className="input"
                    placeholder="Age"
                    min="10"
                    max="120"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender
                  </label>
                  <select
                    value={profileForm.gender}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, gender: e.target.value as 'male' | 'female' }))}
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
                    value={profileForm.height}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, height: e.target.value }))}
                    className="input"
                    placeholder="Height in cm"
                    min="50"
                    max="300"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Weight (kg)
                  </label>
                  <input
                    type="number"
                    value={profileForm.target_weight}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, target_weight: e.target.value }))}
                    className="input"
                    placeholder="Target weight"
                    min="20"
                    max="300"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Workouts/Week
                  </label>
                  <input
                    type="number"
                    value={profileForm.target_workouts_per_week}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, target_workouts_per_week: e.target.value }))}
                    className="input"
                    placeholder="Target workouts"
                    min="0"
                    max="14"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Activity Level
                </label>
                <select
                  value={profileForm.activity_level}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, activity_level: e.target.value }))}
                  className="input"
                >
                  {Object.entries(activityLevels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProfile(false)}
                  className="btn-secondary"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Profile Display */}
              <div className="flex items-center space-x-6">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {profile?.full_name || 'No name set'}
                  </h3>
                  <p className="text-gray-600">
                    {profile?.age ? `${profile.age} years old` : 'Age not set'}
                  </p>
                </div>
              </div>

              {/* Profile Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="stat-card">
                  <div className="stat-value text-blue-600">{profile?.height || 0} cm</div>
                  <div className="stat-label">Height</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-value text-green-600">{profile?.target_weight || 0} kg</div>
                  <div className="stat-label">Target Weight</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-value text-purple-600">{profile?.target_workouts_per_week || 0}/week</div>
                  <div className="stat-label">Workout Goal</div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Activity Level</h4>
                <p className="text-sm text-gray-600">
                  {activityLevels[profile?.activity_level as keyof typeof activityLevels] || 'Not set'}
                </p>
              </div>

              {!profile?.age || !profile?.height ? (
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">Complete your profile to get accurate BMR/TDEE calculations</p>
                  <button
                    onClick={() => setEditingProfile(true)}
                    className="btn-primary"
                  >
                    Complete Profile
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Progress Tab */}
      {activeTab === 'progress' && (
        <div className="space-y-6">
          {/* Weight Progress */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h2 className="card-title flex items-center">
                <Scale className="w-5 h-5 mr-2 text-purple-600" />
                Weight Progress
              </h2>
              <button
                onClick={() => setShowWeightForm(true)}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Weight
              </button>
            </div>

            {/* Weight Chart */}
            <div className="h-64 mb-6">
              {getWeightChartData().length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getWeightChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <Scale className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No weight data yet</p>
                  </div>
                </div>
              )}
            </div>

            {/* Fitness Goals Integration */}
            {profile && (
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h3 className="font-semibold text-purple-900 mb-3 flex items-center">
                  <Target className="w-5 h-5 mr-2" />
                  Fitness Goals
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-purple-700 mb-1">Target Weight</div>
                    <div className="text-xl font-bold text-purple-900">{profile.target_weight || 0} kg</div>
                  </div>
                  <div>
                    <div className="text-sm text-purple-700 mb-1">Current Weight</div>
                    <div className="text-xl font-bold text-purple-900">
                      {getCurrentWeight() || profile.target_weight || 0} kg
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="stat-card">
                <div className="stat-value text-purple-600">
                  {getCurrentWeight() || 0} kg
                </div>
                <div className="stat-label">Current Weight</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-value text-green-600">
                  {weightEntries.length >= 2 
                    ? `${(weightEntries[0].weight - weightEntries[1].weight) >= 0 ? '+' : ''}${(weightEntries[0].weight - weightEntries[1].weight).toFixed(1)}kg`
                    : '0kg'
                  }
                </div>
                <div className="stat-label">Weekly Change</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-value text-blue-600">
                  {workoutEntries.filter(w => {
                    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
                    return new Date(w.date) >= weekStart;
                  }).length}
                </div>
                <div className="stat-label">Workouts Done</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-value text-orange-600">
                  {bmrCalculation ? (
                    getTodaysEntries(calorieEntries).reduce((sum, entry) => sum + entry.calories, 0) > bmrCalculation.tdee
                      ? 'Surplus'
                      : 'Deficit'
                  ) : 'N/A'}
                </div>
                <div className="stat-label">Calorie Status</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calories Tab */}
      {activeTab === 'calories' && (
        <div className="space-y-6">
          {/* Date Header */}
          <div className="card animate-fadeIn bg-gradient-to-r from-orange-500 to-red-500 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center">
                  <Apple className="w-5 h-5 mr-2" />
                  Calorie Tracking
                </h2>
                <p className="text-orange-100 text-sm">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={format(selectedDate, 'yyyy-MM-dd')}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  className="px-3 py-2 rounded-lg bg-white/20 text-white placeholder-orange-200 border border-white/30 text-sm"
                />
                <button
                  onClick={() => setShowCalorieForm(true)}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Food
                </button>
              </div>
            </div>
          </div>

          {/* Today's Entries */}
          <div className="card animate-fadeIn">
            <h3 className="font-semibold text-gray-900 mb-4">Today's Food Intake</h3>
            <div className="space-y-3">
              {getTodaysEntries(calorieEntries).map((entry) => (
                <div key={entry.id} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{entry.food_name}</h4>
                      <p className="text-sm text-gray-600">{entry.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-orange-600">{entry.calories} kcal</div>
                      <div className="text-xs text-gray-500 capitalize">
                        {entry.category === 'breakfast' && '🌅 Sarapan'}
                        {entry.category === 'lunch' && '☀️ Makan Siang'}
                        {entry.category === 'dinner' && '🌙 Makan Malam'}
                        {entry.category === 'snack' && '🍪 Cemilan'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {getTodaysEntries(calorieEntries).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Apple className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No food entries for today</p>
                </div>
              )}
            </div>

            {/* Daily Summary */}
            {bmrCalculation && (
              <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-orange-600">
                      {getTodaysEntries(calorieEntries).reduce((sum, entry) => sum + entry.calories, 0)}
                    </div>
                    <div className="text-xs text-gray-600">Consumed</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">
                      {bmrCalculation.recommendedCalories.maintain}
                    </div>
                    <div className="text-xs text-gray-600">Target (TDEE)</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-600">
                      {bmrCalculation.recommendedCalories.maintain - getTodaysEntries(calorieEntries).reduce((sum, entry) => sum + entry.calories, 0)}
                    </div>
                    <div className="text-xs text-gray-600">Remaining</div>
                  </div>
                  <div>
                    <div className={`text-lg font-bold ${
                      getTodaysEntries(calorieEntries).reduce((sum, entry) => sum + entry.calories, 0) > bmrCalculation.recommendedCalories.maintain
                        ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {getTodaysEntries(calorieEntries).reduce((sum, entry) => sum + entry.calories, 0) > bmrCalculation.recommendedCalories.maintain
                        ? 'Surplus' : 'Deficit'
                      }
                    </div>
                    <div className="text-xs text-gray-600">Status</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Workouts Tab */}
      {activeTab === 'workouts' && (
        <div className="space-y-6">
          {/* Date Header */}
          <div className="card animate-fadeIn bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center">
                  <Dumbbell className="w-5 h-5 mr-2" />
                  Workout Tracking
                </h2>
                <p className="text-blue-100 text-sm">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={format(selectedDate, 'yyyy-MM-dd')}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  className="px-3 py-2 rounded-lg bg-white/20 text-white placeholder-blue-200 border border-white/30 text-sm"
                />
                <button
                  onClick={() => setShowWorkoutForm(true)}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Workout
                </button>
              </div>
            </div>
          </div>

          {/* Today's Workouts */}
          <div className="card animate-fadeIn">
            <h3 className="font-semibold text-gray-900 mb-4">Today's Workouts</h3>
            <div className="space-y-3">
              {getTodaysEntries(workoutEntries).map((entry) => (
                <div key={entry.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{entry.exercise_name}</h4>
                      <p className="text-sm text-gray-600">
                        {entry.type === 'duration' 
                          ? `${entry.duration_minutes} minutes`
                          : `${entry.repetitions}x reps`
                        }
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-blue-600">{entry.calories_burned} kcal</div>
                      <div className="text-xs text-gray-500 capitalize">{entry.type}</div>
                    </div>
                  </div>
                </div>
              ))}
              {getTodaysEntries(workoutEntries).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Dumbbell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No workouts for today</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sleep Tab */}
      {activeTab === 'sleep' && (
        <div className="space-y-6">
          {/* Date Header */}
          <div className="card animate-fadeIn bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center">
                  <Moon className="w-5 h-5 mr-2" />
                  Sleep Tracking
                </h2>
                <p className="text-indigo-100 text-sm">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={format(selectedDate, 'yyyy-MM-dd')}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  className="px-3 py-2 rounded-lg bg-white/20 text-white placeholder-indigo-200 border border-white/30 text-sm"
                />
                <button
                  onClick={() => setShowSleepForm(true)}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Log Sleep
                </button>
              </div>
            </div>
          </div>

          {/* Sleep Pattern Chart */}
          <div className="card animate-fadeIn">
            <h3 className="font-semibold text-gray-900 mb-4">Sleep Pattern (Last 30 Days)</h3>
            <div className="h-64">
              {getSleepChartData().length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={getSleepChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} domain={[0, 12]} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="hours"
                      stroke="#8b5cf6"
                      fill="url(#sleepGradient)"
                      strokeWidth={2}
                    />
                    <defs>
                      <linearGradient id="sleepGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <Moon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No sleep data yet</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Today's Sleep */}
          <div className="card animate-fadeIn">
            <h3 className="font-semibold text-gray-900 mb-4">Sleep Log</h3>
            {getTodaysEntries(sleepEntries)[0] ? (
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-purple-600">
                      {getTodaysEntries(sleepEntries)[0].sleep_time}
                    </div>
                    <div className="text-sm text-gray-600">Bedtime</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-purple-600">
                      {getTodaysEntries(sleepEntries)[0].wake_time}
                    </div>
                    <div className="text-sm text-gray-600">Wake Time</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-purple-600">
                      {getTodaysEntries(sleepEntries)[0].duration_hours.toFixed(1)}h
                    </div>
                    <div className="text-sm text-gray-600">Duration</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Moon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No sleep data for today</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Calorie Form Modal */}
      {showCalorieForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add Food Entry</h3>
                <button
                  onClick={() => setShowCalorieForm(false)}
                  className="btn-icon-secondary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCalorieSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Food Name
                  </label>
                  <input
                    type="text"
                    value={calorieForm.food_name}
                    onChange={(e) => setCalorieForm(prev => ({ ...prev, food_name: e.target.value }))}
                    className="input"
                    placeholder="Enter food name"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Calories
                    </label>
                    <input
                      type="number"
                      value={calorieForm.calories}
                      onChange={(e) => setCalorieForm(prev => ({ ...prev, calories: e.target.value }))}
                      className="input"
                      placeholder="kcal"
                      required
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={calorieForm.category}
                      onChange={(e) => setCalorieForm(prev => ({ ...prev, category: e.target.value }))}
                      className="input"
                    >
                      <option value="breakfast">🌅 Sarapan</option>
                      <option value="lunch">☀️ Makan Siang</option>
                      <option value="dinner">🌙 Makan Malam</option>
                      <option value="snack">🍪 Cemilan</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={calorieForm.description}
                    onChange={(e) => setCalorieForm(prev => ({ ...prev, description: e.target.value }))}
                    className="textarea"
                    rows={2}
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 btn-primary disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Add Food'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCalorieForm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Workout Form Modal */}
      {showWorkoutForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add Workout</h3>
                <button
                  onClick={() => setShowWorkoutForm(false)}
                  className="btn-icon-secondary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleWorkoutSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exercise Name
                  </label>
                  <input
                    type="text"
                    value={workoutForm.exercise_name}
                    onChange={(e) => setWorkoutForm(prev => ({ ...prev, exercise_name: e.target.value }))}
                    className="input"
                    placeholder="Enter exercise name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Workout Type
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="duration"
                        checked={workoutForm.type === 'duration'}
                        onChange={(e) => setWorkoutForm(prev => ({ ...prev, type: e.target.value }))}
                        className="mr-2"
                      />
                      Duration-based
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="reps"
                        checked={workoutForm.type === 'reps'}
                        onChange={(e) => setWorkoutForm(prev => ({ ...prev, type: e.target.value }))}
                        className="mr-2"
                      />
                      Repetition-based
                    </label>
                  </div>
                </div>

                {workoutForm.type === 'duration' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={workoutForm.duration_minutes}
                      onChange={(e) => setWorkoutForm(prev => ({ ...prev, duration_minutes: e.target.value }))}
                      className="input"
                      placeholder="Minutes"
                      required
                      min="1"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Repetitions
                    </label>
                    <input
                      type="number"
                      value={workoutForm.repetitions}
                      onChange={(e) => setWorkoutForm(prev => ({ ...prev, repetitions: e.target.value }))}
                      className="input"
                      placeholder="Number of reps"
                      required
                      min="1"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Calories Burned
                  </label>
                  <input
                    type="number"
                    value={workoutForm.calories_burned}
                    onChange={(e) => setWorkoutForm(prev => ({ ...prev, calories_burned: e.target.value }))}
                    className="input"
                    placeholder="kcal burned"
                    required
                    min="1"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 btn-primary disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Add Workout'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowWorkoutForm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Weight Form Modal */}
      {showWeightForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add Weight Entry</h3>
                <button
                  onClick={() => setShowWeightForm(false)}
                  className="btn-icon-secondary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleWeightSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    value={weightForm.weight}
                    onChange={(e) => setWeightForm(prev => ({ ...prev, weight: e.target.value }))}
                    className="input"
                    placeholder="Enter weight"
                    required
                    min="20"
                    max="300"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Body Fat % (Optional)
                  </label>
                  <input
                    type="number"
                    value={weightForm.body_fat}
                    onChange={(e) => setWeightForm(prev => ({ ...prev, body_fat: e.target.value }))}
                    className="input"
                    placeholder="Body fat percentage"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 btn-primary disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Add Weight'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowWeightForm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Sleep Form Modal */}
      {showSleepForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Log Sleep</h3>
                <button
                  onClick={() => setShowSleepForm(false)}
                  className="btn-icon-secondary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSleepSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sleep Time
                  </label>
                  <input
                    type="time"
                    value={sleepForm.sleep_time}
                    onChange={(e) => setSleepForm(prev => ({ ...prev, sleep_time: e.target.value }))}
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
                    onChange={(e) => setSleepForm(prev => ({ ...prev, wake_time: e.target.value }))}
                    className="input"
                    required
                  />
                </div>

                {sleepForm.sleep_time && sleepForm.wake_time && (
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-sm text-purple-700">
                      Duration: {calculateSleepDuration(sleepForm.sleep_time, sleepForm.wake_time).toFixed(1)} hours
                    </div>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 btn-primary disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Log Sleep'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSleepForm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BodyTracker;