import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  User, 
  Save, 
  Plus, 
  X, 
  Edit2, 
  Trash2, 
  Calendar,
  Target,
  Activity,
  Moon,
  TrendingUp,
  BarChart3,
  Clock,
  Utensils,
  Dumbbell,
  Scale,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
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

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
  age: number;
  height: number;
  gender: 'male' | 'female';
  activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
  target_weight: number;
  target_calories: number;
  target_workouts_per_week: number;
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

const BodyTracker: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'calories' | 'workout' | 'progress' | 'sleep'>('profile');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [profile, setProfile] = useState<Profile | null>(null);
  const [calorieEntries, setCalorieEntries] = useState<CalorieEntry[]>([]);
  const [workoutEntries, setWorkoutEntries] = useState<WorkoutEntry[]>([]);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [sleepEntries, setSleepEntries] = useState<SleepEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // Form states
  const [profileForm, setProfileForm] = useState({
    full_name: '',
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

  const [weightForm, setWeightForm] = useState({
    weight: '',
    body_fat: ''
  });

  const [sleepForm, setSleepForm] = useState({
    sleep_time: '',
    wake_time: '',
    duration_hours: ''
  });

  const { user } = useAuth();

  // Memoized date string
  const dateStr = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);

  // BMR and TDEE calculations
  const calculateBMR = useCallback((profile: Profile): number => {
    if (!profile.age || !profile.height || !profile.target_weight) return 0;
    
    // Mifflin-St Jeor Equation
    if (profile.gender === 'male') {
      return (10 * profile.target_weight) + (6.25 * profile.height) - (5 * profile.age) + 5;
    } else {
      return (10 * profile.target_weight) + (6.25 * profile.height) - (5 * profile.age) - 161;
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

  // Fetch data functions
  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setProfile(data);
        setProfileForm({
          full_name: data.full_name || '',
          age: data.age?.toString() || '',
          height: data.height?.toString() || '',
          gender: data.gender || 'male',
          activity_level: data.activity_level || 'moderately_active',
          target_weight: data.target_weight?.toString() || '',
          target_calories: data.target_calories?.toString() || '',
          target_workouts_per_week: data.target_workouts_per_week?.toString() || '3'
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }, [user?.id]);

  const fetchCalorieEntries = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('calorie_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateStr)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCalorieEntries(data || []);
    } catch (error) {
      console.error('Error fetching calorie entries:', error);
    }
  }, [user?.id, dateStr]);

  const fetchWorkoutEntries = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('workout_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateStr)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkoutEntries(data || []);
    } catch (error) {
      console.error('Error fetching workout entries:', error);
    }
  }, [user?.id, dateStr]);

  const fetchWeightEntries = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('weight_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(30);

      if (error) throw error;
      setWeightEntries(data || []);
    } catch (error) {
      console.error('Error fetching weight entries:', error);
    }
  }, [user?.id]);

  const fetchSleepEntries = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('sleep_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateStr)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSleepEntries(data || []);
    } catch (error) {
      console.error('Error fetching sleep entries:', error);
    }
  }, [user?.id, dateStr]);

  // Load data on mount and date change
  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([
        fetchProfile(),
        fetchCalorieEntries(),
        fetchWorkoutEntries(),
        fetchWeightEntries(),
        fetchSleepEntries()
      ]).finally(() => setLoading(false));
    }
  }, [user, fetchProfile, fetchCalorieEntries, fetchWorkoutEntries, fetchWeightEntries, fetchSleepEntries]);

  // Handle profile save
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const profileData = {
        full_name: profileForm.full_name,
        age: profileForm.age ? parseInt(profileForm.age) : null,
        height: profileForm.height ? parseFloat(profileForm.height) : null,
        gender: profileForm.gender,
        activity_level: profileForm.activity_level,
        target_weight: profileForm.target_weight ? parseFloat(profileForm.target_weight) : null,
        target_calories: profileForm.target_calories ? parseInt(profileForm.target_calories) : null,
        target_workouts_per_week: profileForm.target_workouts_per_week ? parseInt(profileForm.target_workouts_per_week) : 3,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('profiles')
        .upsert([{ id: user?.id, ...profileData }])
        .select()
        .single();

      if (error) throw error;
      
      setProfile(data);
      window.dispatchEvent(new CustomEvent('profileUpdated'));
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  // Handle calorie entry save
  const handleCalorieSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calorieForm.food_name.trim() || !calorieForm.calories) return;

    setSaving(true);
    try {
      const entryData = {
        food_name: calorieForm.food_name.trim(),
        calories: parseInt(calorieForm.calories),
        category: calorieForm.category,
        description: calorieForm.description.trim(),
        date: dateStr,
        user_id: user?.id
      };

      if (editingItem) {
        const { error } = await supabase
          .from('calorie_entries')
          .update(entryData)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('calorie_entries')
          .insert([entryData]);
        if (error) throw error;
      }

      await fetchCalorieEntries();
      setShowAddModal(false);
      setEditingItem(null);
      setCalorieForm({
        food_name: '',
        calories: '',
        category: 'breakfast',
        description: ''
      });
    } catch (error) {
      console.error('Error saving calorie entry:', error);
    } finally {
      setSaving(false);
    }
  };

  // Handle workout entry save
  const handleWorkoutSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workoutForm.exercise_name.trim() || !workoutForm.calories_burned) return;

    setSaving(true);
    try {
      const entryData = {
        exercise_name: workoutForm.exercise_name.trim(),
        type: workoutForm.type,
        duration_minutes: workoutForm.type === 'duration' && workoutForm.duration_minutes ? parseInt(workoutForm.duration_minutes) : null,
        repetitions: workoutForm.type === 'reps' && workoutForm.repetitions ? parseInt(workoutForm.repetitions) : null,
        calories_burned: parseInt(workoutForm.calories_burned),
        date: dateStr,
        user_id: user?.id
      };

      if (editingItem) {
        const { error } = await supabase
          .from('workout_entries')
          .update(entryData)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('workout_entries')
          .insert([entryData]);
        if (error) throw error;
      }

      await fetchWorkoutEntries();
      setShowAddModal(false);
      setEditingItem(null);
      setWorkoutForm({
        exercise_name: '',
        type: 'duration',
        duration_minutes: '',
        repetitions: '',
        calories_burned: ''
      });
    } catch (error) {
      console.error('Error saving workout entry:', error);
    } finally {
      setSaving(false);
    }
  };

  // Handle weight entry save
  const handleWeightSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightForm.weight) return;

    setSaving(true);
    try {
      const entryData = {
        weight: parseFloat(weightForm.weight),
        body_fat: weightForm.body_fat ? parseFloat(weightForm.body_fat) : null,
        date: dateStr,
        user_id: user?.id
      };

      const { error } = await supabase
        .from('weight_entries')
        .upsert([entryData], { onConflict: 'user_id,date' });
      
      if (error) throw error;

      await fetchWeightEntries();
      setShowAddModal(false);
      setWeightForm({
        weight: '',
        body_fat: ''
      });
    } catch (error) {
      console.error('Error saving weight entry:', error);
    } finally {
      setSaving(false);
    }
  };

  // Handle sleep entry save
  const handleSleepSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sleepForm.sleep_time || !sleepForm.wake_time || !sleepForm.duration_hours) return;

    setSaving(true);
    try {
      const entryData = {
        sleep_time: sleepForm.sleep_time,
        wake_time: sleepForm.wake_time,
        duration_hours: parseFloat(sleepForm.duration_hours),
        date: dateStr,
        user_id: user?.id
      };

      const { error } = await supabase
        .from('sleep_entries')
        .upsert([entryData], { onConflict: 'user_id,date' });
      
      if (error) throw error;

      await fetchSleepEntries();
      setShowAddModal(false);
      setSleepForm({
        sleep_time: '',
        wake_time: '',
        duration_hours: ''
      });
    } catch (error) {
      console.error('Error saving sleep entry:', error);
    } finally {
      setSaving(false);
    }
  };

  // Delete entry
  const handleDelete = async (id: string, table: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Refresh appropriate data
      switch (table) {
        case 'calorie_entries':
          await fetchCalorieEntries();
          break;
        case 'workout_entries':
          await fetchWorkoutEntries();
          break;
        case 'weight_entries':
          await fetchWeightEntries();
          break;
        case 'sleep_entries':
          await fetchSleepEntries();
          break;
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  // Edit entry
  const handleEdit = (item: any, type: string) => {
    setEditingItem(item);
    
    switch (type) {
      case 'calorie':
        setCalorieForm({
          food_name: item.food_name,
          calories: item.calories.toString(),
          category: item.category,
          description: item.description || ''
        });
        break;
      case 'workout':
        setWorkoutForm({
          exercise_name: item.exercise_name,
          type: item.type,
          duration_minutes: item.duration_minutes?.toString() || '',
          repetitions: item.repetitions?.toString() || '',
          calories_burned: item.calories_burned.toString()
        });
        break;
    }
    
    setShowAddModal(true);
  };

  // Date navigation
  const navigateDate = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedDate(prev => subDays(prev, 1));
    } else {
      setSelectedDate(prev => addDays(prev, 1));
    }
  };

  // Calculate daily totals
  const dailyCalories = calorieEntries.reduce((sum, entry) => sum + entry.calories, 0);
  const dailyCaloriesBurned = workoutEntries.reduce((sum, entry) => sum + entry.calories_burned, 0);
  const netCalories = dailyCalories - dailyCaloriesBurned;

  // BMR and TDEE calculations
  const bmr = profile ? calculateBMR(profile) : 0;
  const tdee = profile ? calculateTDEE(bmr, profile.activity_level) : 0;

  // Prepare weight chart data
  const weightChartData = weightEntries
    .slice(0, 14)
    .reverse()
    .map(entry => ({
      date: format(new Date(entry.date), 'MMM dd'),
      weight: entry.weight,
      bodyFat: entry.body_fat
    }));

  // Weekly sleep data
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  const sleepChartData = weekDays.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const sleepEntry = sleepEntries.find(entry => entry.date === dayStr);
    return {
      date: format(day, 'EEE'),
      hours: sleepEntry?.duration_hours || 0
    };
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="card animate-fadeIn">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
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
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <h2 className="card-title">Body Tracker</h2>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-6">
            {[
              { id: 'profile', label: 'Profile', icon: User, color: 'text-blue-600' },
              { id: 'calories', label: 'Calories', icon: Utensils, color: 'text-green-600' },
              { id: 'workout', label: 'Workout', icon: Dumbbell, color: 'text-orange-600' },
              { id: 'progress', label: 'Progress', icon: TrendingUp, color: 'text-purple-600' },
              { id: 'sleep', label: 'Sleep', icon: Moon, color: 'text-indigo-600' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? tab.color : ''}`} />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Date Navigation (for non-profile tabs) */}
        {activeTab !== 'profile' && activeTab !== 'progress' && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigateDate('prev')}
                className="btn-icon-secondary"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-900">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </span>
              </div>
              
              <button
                onClick={() => navigateDate('next')}
                className="btn-icon-secondary"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
            </div>

            <form onSubmit={handleProfileSave} className="space-y-6">
              {/* Basic Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                    className="input"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age
                  </label>
                  <input
                    type="number"
                    value={profileForm.age}
                    onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })}
                    className="input"
                    placeholder="Enter your age"
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
                    className="input"
                    placeholder="Enter your height"
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
                    Target Weight (kg)
                  </label>
                  <input
                    type="number"
                    value={profileForm.target_weight}
                    onChange={(e) => setProfileForm({ ...profileForm, target_weight: e.target.value })}
                    className="input"
                    placeholder="Enter target weight"
                    min="20"
                    max="300"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Workouts per Week
                  </label>
                  <input
                    type="number"
                    value={profileForm.target_workouts_per_week}
                    onChange={(e) => setProfileForm({ ...profileForm, target_workouts_per_week: e.target.value })}
                    className="input"
                    placeholder="Enter target workouts"
                    min="0"
                    max="14"
                  />
                </div>
              </div>

              {/* Activity Level */}
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

              {/* BMR and TDEE Display */}
              {profile && bmr > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{Math.round(bmr)}</div>
                    <div className="text-sm text-blue-700">BMR (calories/day)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{Math.round(tdee)}</div>
                    <div className="text-sm text-blue-700">TDEE (calories/day)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{profile.target_calories || Math.round(tdee)}</div>
                    <div className="text-sm text-blue-700">Target Calories</div>
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
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Food Intake</h3>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-icon-primary"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Daily Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{dailyCalories}</div>
                <div className="text-sm text-green-700">Calories Consumed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{dailyCaloriesBurned}</div>
                <div className="text-sm text-orange-700">Calories Burned</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${netCalories > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {netCalories > 0 ? '+' : ''}{netCalories}
                </div>
                <div className="text-sm text-gray-700">Net Calories</div>
              </div>
            </div>

            {/* Calorie Entries List */}
            <div className="space-y-3">
              {calorieEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Utensils className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No food entries for this date</p>
                </div>
              ) : (
                calorieEntries.map((entry) => (
                  <div key={entry.id} className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-medium text-gray-900">{entry.food_name}</h4>
                          <span className="badge badge-success">{entry.category}</span>
                          <span className="text-sm font-medium text-gray-900">{entry.calories} cal</span>
                        </div>
                        {entry.description && (
                          <p className="text-sm text-gray-600 mt-1">{entry.description}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(entry, 'calorie')}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id, 'calorie_entries')}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Workout Tab */}
        {activeTab === 'workout' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Workout Sessions</h3>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-icon-primary"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Daily Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{workoutEntries.length}</div>
                <div className="text-sm text-orange-700">Workouts Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{dailyCaloriesBurned}</div>
                <div className="text-sm text-orange-700">Total Calories Burned</div>
              </div>
            </div>

            {/* Workout Entries List */}
            <div className="space-y-3">
              {workoutEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Dumbbell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No workout entries for this date</p>
                </div>
              ) : (
                workoutEntries.map((entry) => (
                  <div key={entry.id} className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-medium text-gray-900">{entry.exercise_name}</h4>
                          <span className="badge badge-info">{entry.type}</span>
                          {entry.type === 'duration' && entry.duration_minutes && (
                            <span className="text-sm text-gray-600">{entry.duration_minutes} min</span>
                          )}
                          {entry.type === 'reps' && entry.repetitions && (
                            <span className="text-sm text-gray-600">{entry.repetitions}x</span>
                          )}
                          <span className="text-sm font-medium text-orange-600">{entry.calories_burned} cal</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(entry, 'workout')}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id, 'workout_entries')}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Progress Tab */}
        {activeTab === 'progress' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Progress Overview</h3>

            {/* Fitness Goals */}
            {profile && (
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="font-medium text-purple-900 mb-3">Fitness Goals</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-purple-600">{profile.target_weight || 'Not set'}</div>
                    <div className="text-sm text-purple-700">Target Weight (kg)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-purple-600">{profile.target_calories || Math.round(tdee)}</div>
                    <div className="text-sm text-purple-700">Daily Calorie Target</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-purple-600">{profile.target_workouts_per_week}</div>
                    <div className="text-sm text-purple-700">Weekly Workout Target</div>
                  </div>
                </div>
              </div>
            )}

            {/* Weight Progress Chart */}
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Weight Progress</h4>
                <button
                  onClick={() => {
                    setActiveTab('progress');
                    setShowAddModal(true);
                  }}
                  className="btn-icon-primary"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              {weightChartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="#8b5cf6"
                        strokeWidth={3}
                        dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Scale className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No weight data available</p>
                </div>
              )}
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="stat-card">
                <div className="stat-value text-blue-600">{weightEntries.length > 0 ? weightEntries[0].weight : 'N/A'}</div>
                <div className="stat-label">Current Weight (kg)</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-green-600">
                  {weightEntries.length >= 2 
                    ? `${weightEntries[1].weight - weightEntries[0].weight > 0 ? '+' : ''}${(weightEntries[1].weight - weightEntries[0].weight).toFixed(1)}`
                    : 'N/A'
                  }
                </div>
                <div className="stat-label">Weekly Change (kg)</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-orange-600">{workoutEntries.length}</div>
                <div className="stat-label">Today's Workouts</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-purple-600">
                  {profile?.target_calories ? 
                    `${netCalories > 0 ? '+' : ''}${netCalories}` : 'N/A'
                  }
                </div>
                <div className="stat-label">Calorie Balance</div>
              </div>
            </div>
          </div>
        )}

        {/* Sleep Tab */}
        {activeTab === 'sleep' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Sleep Tracking</h3>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-icon-primary"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Weekly Sleep Chart */}
            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <h4 className="font-medium text-indigo-900 mb-4">Weekly Sleep Pattern</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sleepChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} domain={[0, 12]} />
                    <Tooltip />
                    <Bar dataKey="hours" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Today's Sleep Entry */}
            <div className="space-y-3">
              {sleepEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Moon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No sleep data for this date</p>
                </div>
              ) : (
                sleepEntries.map((entry) => (
                  <div key={entry.id} className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div className="text-center">
                            <div className="text-sm text-gray-600">Sleep Time</div>
                            <div className="font-medium text-gray-900">{entry.sleep_time}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm text-gray-600">Wake Time</div>
                            <div className="font-medium text-gray-900">{entry.wake_time}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm text-gray-600">Duration</div>
                            <div className="font-medium text-indigo-600">{entry.duration_hours}h</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleDelete(entry.id, 'sleep_entries')}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingItem ? 'Edit' : 'Add'} {
                    activeTab === 'calories' ? 'Food Entry' :
                    activeTab === 'workout' ? 'Workout' :
                    activeTab === 'progress' ? 'Weight Entry' :
                    activeTab === 'sleep' ? 'Sleep Entry' : ''
                  }
                </h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingItem(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Calorie Form */}
              {activeTab === 'calories' && (
                <form onSubmit={handleCalorieSave} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Food Name
                    </label>
                    <input
                      type="text"
                      value={calorieForm.food_name}
                      onChange={(e) => setCalorieForm({ ...calorieForm, food_name: e.target.value })}
                      className="input"
                      placeholder="Enter food name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Calories
                    </label>
                    <input
                      type="number"
                      value={calorieForm.calories}
                      onChange={(e) => setCalorieForm({ ...calorieForm, calories: e.target.value })}
                      className="input"
                      placeholder="Enter calories"
                      min="1"
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
                      <option value="breakfast">Sarapan (Breakfast)</option>
                      <option value="lunch">Makan Siang (Lunch)</option>
                      <option value="dinner">Makan Sore/Malam (Dinner)</option>
                      <option value="snack">Cemilan (Snack)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      value={calorieForm.description}
                      onChange={(e) => setCalorieForm({ ...calorieForm, description: e.target.value })}
                      className="textarea"
                      placeholder="Enter description"
                      rows={3}
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        setEditingItem(null);
                      }}
                      className="flex-1 btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 btn-primary disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : editingItem ? 'Update' : 'Add'}
                    </button>
                  </div>
                </form>
              )}

              {/* Workout Form */}
              {activeTab === 'workout' && (
                <form onSubmit={handleWorkoutSave} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exercise Name
                    </label>
                    <input
                      type="text"
                      value={workoutForm.exercise_name}
                      onChange={(e) => setWorkoutForm({ ...workoutForm, exercise_name: e.target.value })}
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
                          onChange={(e) => setWorkoutForm({ ...workoutForm, type: e.target.value as 'duration' | 'reps' })}
                          className="mr-2"
                        />
                        Duration-based
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="reps"
                          checked={workoutForm.type === 'reps'}
                          onChange={(e) => setWorkoutForm({ ...workoutForm, type: e.target.value as 'duration' | 'reps' })}
                          className="mr-2"
                        />
                        Repetition-based
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
                        value={workoutForm.duration_minutes}
                        onChange={(e) => setWorkoutForm({ ...workoutForm, duration_minutes: e.target.value })}
                        className="input"
                        placeholder="Enter duration"
                        min="1"
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
                        value={workoutForm.repetitions}
                        onChange={(e) => setWorkoutForm({ ...workoutForm, repetitions: e.target.value })}
                        className="input"
                        placeholder="Enter repetitions"
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
                      onChange={(e) => setWorkoutForm({ ...workoutForm, calories_burned: e.target.value })}
                      className="input"
                      placeholder="Enter calories burned"
                      min="1"
                      required
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        setEditingItem(null);
                      }}
                      className="flex-1 btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 btn-primary disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : editingItem ? 'Update' : 'Add'}
                    </button>
                  </div>
                </form>
              )}

              {/* Weight Form */}
              {activeTab === 'progress' && (
                <form onSubmit={handleWeightSave} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      value={weightForm.weight}
                      onChange={(e) => setWeightForm({ ...weightForm, weight: e.target.value })}
                      className="input"
                      placeholder="Enter weight"
                      min="20"
                      max="300"
                      step="0.1"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Body Fat % (Optional)
                    </label>
                    <input
                      type="number"
                      value={weightForm.body_fat}
                      onChange={(e) => setWeightForm({ ...weightForm, body_fat: e.target.value })}
                      className="input"
                      placeholder="Enter body fat percentage"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="flex-1 btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 btn-primary disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Add'}
                    </button>
                  </div>
                </form>
              )}

              {/* Sleep Form */}
              {activeTab === 'sleep' && (
                <form onSubmit={handleSleepSave} className="space-y-4">
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration (hours)
                    </label>
                    <input
                      type="number"
                      value={sleepForm.duration_hours}
                      onChange={(e) => setSleepForm({ ...sleepForm, duration_hours: e.target.value })}
                      className="input"
                      placeholder="Enter sleep duration"
                      min="0.5"
                      max="24"
                      step="0.5"
                      required
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="flex-1 btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 btn-primary disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Add'}
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