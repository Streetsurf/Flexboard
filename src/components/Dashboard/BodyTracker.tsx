import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Dumbbell, 
  Plus, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  X, 
  Edit2, 
  Trash2,
  Target,
  TrendingUp,
  Activity,
  Moon,
  Scale,
  Utensils,
  Clock,
  User,
  Upload,
  BarChart3
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { format, addDays, subDays, startOfWeek, endOfWeek, isToday, isSameDay } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Types
interface Profile {
  id: string;
  age?: number;
  gender?: 'male' | 'female';
  height?: number;
  activity_level?: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
  target_weight?: number;
  target_calories?: number;
  target_workouts_per_week?: number;
  avatar_url?: string;
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

const BodyTracker: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'calories' | 'workout' | 'progress' | 'sleep'>('dashboard');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [calorieEntries, setCalorieEntries] = useState<CalorieEntry[]>([]);
  const [workoutEntries, setWorkoutEntries] = useState<WorkoutEntry[]>([]);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [sleepEntries, setSleepEntries] = useState<SleepEntry[]>([]);
  
  // Form states
  const [showCalorieForm, setShowCalorieForm] = useState(false);
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [showSleepForm, setShowSleepForm] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  
  const { user } = useAuth();

  // Memoized date string
  const dateStr = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);

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
      setProfile(data);
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

  // Initial data load
  useEffect(() => {
    if (user) {
      Promise.all([
        fetchProfile(),
        fetchCalorieEntries(),
        fetchWorkoutEntries(),
        fetchWeightEntries(),
        fetchSleepEntries()
      ]).finally(() => setLoading(false));
    }
  }, [user, fetchProfile, fetchCalorieEntries, fetchWorkoutEntries, fetchWeightEntries, fetchSleepEntries]);

  // BMR and TDEE calculations
  const calculateBMR = useCallback((profile: Profile, currentWeight?: number): number => {
    if (!profile.age || !profile.height || !profile.gender) return 0;
    
    const weight = currentWeight || weightEntries[0]?.weight || 70;
    const age = profile.age;
    const height = profile.height;
    
    if (profile.gender === 'male') {
      return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
    } else {
      return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
    }
  }, [weightEntries]);

  const calculateTDEE = useCallback((bmr: number, activityLevel: string): number => {
    const multipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extremely_active: 1.9
    };
    
    return bmr * (multipliers[activityLevel as keyof typeof multipliers] || 1.55);
  }, []);

  // Navigation functions
  const navigateDate = useCallback((direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedDate(prev => subDays(prev, 1));
    } else {
      setSelectedDate(prev => addDays(prev, 1));
    }
  }, []);

  const goToToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  // Week days for calendar
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(start, i));
    }
    return days;
  }, [selectedDate]);

  // Calculate daily stats
  const dailyStats = useMemo(() => {
    const totalCalories = calorieEntries.reduce((sum, entry) => sum + entry.calories, 0);
    const totalCaloriesBurned = workoutEntries.reduce((sum, entry) => sum + entry.calories_burned, 0);
    const currentWeight = weightEntries[0]?.weight || 0;
    const bmr = profile ? calculateBMR(profile, currentWeight) : 0;
    const tdee = profile ? calculateTDEE(bmr, profile.activity_level || 'moderately_active') : 0;
    const netCalories = totalCalories - totalCaloriesBurned;
    const calorieBalance = netCalories - tdee;
    
    return {
      totalCalories,
      totalCaloriesBurned,
      netCalories,
      tdee: Math.round(tdee),
      bmr: Math.round(bmr),
      calorieBalance: Math.round(calorieBalance),
      workoutsCompleted: workoutEntries.length,
      sleepHours: sleepEntries[0]?.duration_hours || 0
    };
  }, [calorieEntries, workoutEntries, weightEntries, sleepEntries, profile, calculateBMR, calculateTDEE]);

  // Profile save handler
  const handleProfileSave = async (formData: any) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          ...formData,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      await fetchProfile();
      setShowProfileForm(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  // Form components
  const CalorieForm = () => {
    const [formData, setFormData] = useState({
      food_name: '',
      calories: '',
      category: 'breakfast' as CalorieEntry['category'],
      description: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      try {
        const { error } = await supabase
          .from('calorie_entries')
          .insert([{
            ...formData,
            calories: parseInt(formData.calories),
            date: dateStr,
            user_id: user?.id
          }]);

        if (error) throw error;
        
        await fetchCalorieEntries();
        setShowCalorieForm(false);
        setFormData({ food_name: '', calories: '', category: 'breakfast', description: '' });
      } catch (error) {
        console.error('Error adding calorie entry:', error);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Add Food Entry</h3>
            <button
              onClick={() => setShowCalorieForm(false)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Food Name</label>
              <input
                type="text"
                value={formData.food_name}
                onChange={(e) => setFormData({ ...formData, food_name: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Calories</label>
              <input
                type="number"
                value={formData.calories}
                onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                className="input"
                required
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as CalorieEntry['category'] })}
                className="input"
              >
                <option value="breakfast">Sarapan</option>
                <option value="lunch">Makan Siang</option>
                <option value="dinner">Makan Malam</option>
                <option value="snack">Cemilan</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="textarea"
                rows={3}
              />
            </div>

            <div className="flex space-x-3">
              <button type="submit" className="flex-1 btn-primary">
                <Save className="w-4 h-4 mr-2" />
                Save Entry
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
    );
  };

  const WorkoutForm = () => {
    const [formData, setFormData] = useState({
      exercise_name: '',
      type: 'duration' as WorkoutEntry['type'],
      duration_minutes: '',
      repetitions: '',
      calories_burned: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      try {
        const { error } = await supabase
          .from('workout_entries')
          .insert([{
            exercise_name: formData.exercise_name,
            type: formData.type,
            duration_minutes: formData.type === 'duration' ? parseInt(formData.duration_minutes) : null,
            repetitions: formData.type === 'reps' ? parseInt(formData.repetitions) : null,
            calories_burned: parseInt(formData.calories_burned),
            date: dateStr,
            user_id: user?.id
          }]);

        if (error) throw error;
        
        await fetchWorkoutEntries();
        setShowWorkoutForm(false);
        setFormData({ exercise_name: '', type: 'duration', duration_minutes: '', repetitions: '', calories_burned: '' });
      } catch (error) {
        console.error('Error adding workout entry:', error);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Add Workout</h3>
            <button
              onClick={() => setShowWorkoutForm(false)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Exercise Name</label>
              <input
                type="text"
                value={formData.exercise_name}
                onChange={(e) => setFormData({ ...formData, exercise_name: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="duration"
                    checked={formData.type === 'duration'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as WorkoutEntry['type'] })}
                    className="mr-2"
                  />
                  Duration-based
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="reps"
                    checked={formData.type === 'reps'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as WorkoutEntry['type'] })}
                    className="mr-2"
                  />
                  Repetition-based
                </label>
              </div>
            </div>

            {formData.type === 'duration' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                <input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                  className="input"
                  required
                  min="1"
                />
              </div>
            )}

            {formData.type === 'reps' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Repetitions</label>
                <input
                  type="number"
                  value={formData.repetitions}
                  onChange={(e) => setFormData({ ...formData, repetitions: e.target.value })}
                  className="input"
                  required
                  min="1"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Calories Burned</label>
              <input
                type="number"
                value={formData.calories_burned}
                onChange={(e) => setFormData({ ...formData, calories_burned: e.target.value })}
                className="input"
                required
                min="1"
              />
            </div>

            <div className="flex space-x-3">
              <button type="submit" className="flex-1 btn-primary">
                <Save className="w-4 h-4 mr-2" />
                Save Workout
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
    );
  };

  const WeightForm = () => {
    const [formData, setFormData] = useState({
      weight: '',
      body_fat: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      try {
        const { error } = await supabase
          .from('weight_entries')
          .upsert([{
            weight: parseFloat(formData.weight),
            body_fat: formData.body_fat ? parseFloat(formData.body_fat) : null,
            date: dateStr,
            user_id: user?.id
          }]);

        if (error) throw error;
        
        await fetchWeightEntries();
        setShowWeightForm(false);
        setFormData({ weight: '', body_fat: '' });
      } catch (error) {
        console.error('Error adding weight entry:', error);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Record Weight</h3>
            <button
              onClick={() => setShowWeightForm(false)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                className="input"
                required
                min="20"
                max="300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Body Fat % (Optional)</label>
              <input
                type="number"
                step="0.1"
                value={formData.body_fat}
                onChange={(e) => setFormData({ ...formData, body_fat: e.target.value })}
                className="input"
                min="0"
                max="100"
              />
            </div>

            <div className="flex space-x-3">
              <button type="submit" className="flex-1 btn-primary">
                <Save className="w-4 h-4 mr-2" />
                Save Weight
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
    );
  };

  const SleepForm = () => {
    const [formData, setFormData] = useState({
      sleep_time: '',
      wake_time: ''
    });

    const calculateDuration = (sleepTime: string, wakeTime: string): number => {
      if (!sleepTime || !wakeTime) return 0;
      
      const sleep = new Date(`2000-01-01 ${sleepTime}`);
      let wake = new Date(`2000-01-01 ${wakeTime}`);
      
      // If wake time is earlier than sleep time, assume it's the next day
      if (wake <= sleep) {
        wake = new Date(`2000-01-02 ${wakeTime}`);
      }
      
      const diffMs = wake.getTime() - sleep.getTime();
      return diffMs / (1000 * 60 * 60); // Convert to hours
    };

    const duration = calculateDuration(formData.sleep_time, formData.wake_time);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      try {
        const { error } = await supabase
          .from('sleep_entries')
          .upsert([{
            sleep_time: formData.sleep_time,
            wake_time: formData.wake_time,
            duration_hours: duration,
            date: dateStr,
            user_id: user?.id
          }]);

        if (error) throw error;
        
        await fetchSleepEntries();
        setShowSleepForm(false);
        setFormData({ sleep_time: '', wake_time: '' });
      } catch (error) {
        console.error('Error adding sleep entry:', error);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Record Sleep</h3>
            <button
              onClick={() => setShowSleepForm(false)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sleep Time</label>
              <input
                type="time"
                value={formData.sleep_time}
                onChange={(e) => setFormData({ ...formData, sleep_time: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Wake Time</label>
              <input
                type="time"
                value={formData.wake_time}
                onChange={(e) => setFormData({ ...formData, wake_time: e.target.value })}
                className="input"
                required
              />
            </div>

            {duration > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  Duration: {duration.toFixed(1)} hours
                </p>
              </div>
            )}

            <div className="flex space-x-3">
              <button type="submit" className="flex-1 btn-primary" disabled={duration <= 0}>
                <Save className="w-4 h-4 mr-2" />
                Save Sleep
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
    );
  };

  const ProfileForm = () => {
    const [formData, setFormData] = useState({
      age: profile?.age || '',
      gender: profile?.gender || 'male',
      height: profile?.height || '',
      activity_level: profile?.activity_level || 'moderately_active',
      target_weight: profile?.target_weight || '',
      target_calories: profile?.target_calories || '',
      target_workouts_per_week: profile?.target_workouts_per_week || 3,
      avatar_url: profile?.avatar_url || ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      const processedData = {
        ...formData,
        age: formData.age ? parseInt(formData.age.toString()) : null,
        height: formData.height ? parseFloat(formData.height.toString()) : null,
        target_weight: formData.target_weight ? parseFloat(formData.target_weight.toString()) : null,
        target_calories: formData.target_calories ? parseInt(formData.target_calories.toString()) : null
      };

      await handleProfileSave(processedData);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Edit Profile</h3>
            <button
              onClick={() => setShowProfileForm(false)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="input"
                  min="10"
                  max="120"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' })}
                  className="input"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Height (cm)</label>
              <input
                type="number"
                step="0.1"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                className="input"
                min="50"
                max="300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Activity Level</label>
              <select
                value={formData.activity_level}
                onChange={(e) => setFormData({ ...formData, activity_level: e.target.value })}
                className="input"
              >
                <option value="sedentary">Sedentary (little/no exercise)</option>
                <option value="lightly_active">Lightly Active (light exercise 1-3 days/week)</option>
                <option value="moderately_active">Moderately Active (moderate exercise 3-5 days/week)</option>
                <option value="very_active">Very Active (hard exercise 6-7 days/week)</option>
                <option value="extremely_active">Extremely Active (very hard exercise, physical job)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.target_weight}
                  onChange={(e) => setFormData({ ...formData, target_weight: e.target.value })}
                  className="input"
                  min="20"
                  max="300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Calories</label>
                <input
                  type="number"
                  value={formData.target_calories}
                  onChange={(e) => setFormData({ ...formData, target_calories: e.target.value })}
                  className="input"
                  min="800"
                  max="5000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Workouts per Week</label>
              <input
                type="number"
                value={formData.target_workouts_per_week}
                onChange={(e) => setFormData({ ...formData, target_workouts_per_week: parseInt(e.target.value) })}
                className="input"
                min="0"
                max="14"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Avatar URL (Optional)</label>
              <input
                type="url"
                value={formData.avatar_url}
                onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                className="input"
                placeholder="https://example.com/avatar.jpg"
              />
            </div>

            <div className="flex space-x-3">
              <button type="submit" className="flex-1 btn-primary">
                <Save className="w-4 h-4 mr-2" />
                Save Profile
              </button>
              <button
                type="button"
                onClick={() => setShowProfileForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
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
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'calories', label: 'Calories', icon: Utensils },
            { id: 'workout', label: 'Workout', icon: Dumbbell },
            { id: 'progress', label: 'Progress', icon: TrendingUp },
            { id: 'sleep', label: 'Sleep', icon: Moon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Date Navigation - Show for relevant tabs */}
      {['dashboard', 'calories', 'workout', 'sleep'].includes(activeTab) && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Calendar className="w-4 h-4" />
                <span className="font-medium text-gray-900">
                  {format(selectedDate, 'EEE, MMM d, yyyy')}
                </span>
              </button>
              
              <button
                onClick={() => navigateDate('next')}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            {!isToday(selectedDate) && (
              <button
                onClick={goToToday}
                className="btn-secondary text-sm"
              >
                Today
              </button>
            )}
          </div>

          {/* Week Calendar */}
          {showCalendar && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-7 gap-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
                {weekDays.map((day) => (
                  <button
                    key={day.toISOString()}
                    onClick={() => {
                      setSelectedDate(day);
                      setShowCalendar(false);
                    }}
                    className={`p-2 text-sm rounded-lg transition-colors ${
                      isSameDay(day, selectedDate)
                        ? 'bg-blue-600 text-white'
                        : isToday(day)
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {format(day, 'd')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Daily Overview */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Daily Overview</h2>
              <span className="text-sm text-gray-500">
                {format(selectedDate, 'EEEE, MMMM d')}
              </span>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="stat-card bg-green-50 border-green-200">
                <div className="stat-value text-green-600">{dailyStats.totalCalories}</div>
                <div className="stat-label">Calories In</div>
              </div>
              
              <div className="stat-card bg-orange-50 border-orange-200">
                <div className="stat-value text-orange-600">{dailyStats.totalCaloriesBurned}</div>
                <div className="stat-label">Calories Out</div>
              </div>
              
              <div className="stat-card bg-blue-50 border-blue-200">
                <div className="stat-value text-blue-600">{dailyStats.workoutsCompleted}</div>
                <div className="stat-label">Workouts</div>
              </div>
              
              <div className="stat-card bg-purple-50 border-purple-200">
                <div className="stat-value text-purple-600">{dailyStats.sleepHours.toFixed(1)}h</div>
                <div className="stat-label">Sleep</div>
              </div>
            </div>
          </div>

          {/* BMR & TDEE */}
          {profile && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Metabolic Information</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="stat-card">
                  <div className="stat-value text-blue-600">{dailyStats.bmr}</div>
                  <div className="stat-label">BMR (kcal/day)</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-value text-green-600">{dailyStats.tdee}</div>
                  <div className="stat-label">TDEE (kcal/day)</div>
                </div>
                
                <div className="stat-card">
                  <div className={`stat-value ${dailyStats.calorieBalance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {dailyStats.calorieBalance > 0 ? '+' : ''}{dailyStats.calorieBalance}
                  </div>
                  <div className="stat-label">Calorie Balance</div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Quick Actions</h2>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                onClick={() => setShowCalorieForm(true)}
                className="flex flex-col items-center p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl transition-colors"
              >
                <Utensils className="w-6 h-6 text-green-600 mb-2" />
                <span className="text-sm font-medium text-green-700">Add Food</span>
              </button>
              
              <button
                onClick={() => setShowWorkoutForm(true)}
                className="flex flex-col items-center p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors"
              >
                <Dumbbell className="w-6 h-6 text-blue-600 mb-2" />
                <span className="text-sm font-medium text-blue-700">Add Workout</span>
              </button>
              
              <button
                onClick={() => setShowWeightForm(true)}
                className="flex flex-col items-center p-4 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-colors"
              >
                <Scale className="w-6 h-6 text-orange-600 mb-2" />
                <span className="text-sm font-medium text-orange-700">Record Weight</span>
              </button>
              
              <button
                onClick={() => setShowSleepForm(true)}
                className="flex flex-col items-center p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors"
              >
                <Moon className="w-6 h-6 text-purple-600 mb-2" />
                <span className="text-sm font-medium text-purple-700">Record Sleep</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Profile Information</h2>
            <button
              onClick={() => setShowProfileForm(true)}
              className="w-7 h-7 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          </div>

          {profile ? (
            <div className="space-y-6">
              {/* Avatar and Basic Info */}
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                  {profile.avatar_url ? (
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
                  <h3 className="text-lg font-semibold text-gray-900">
                    {profile.gender === 'male' ? 'Male' : 'Female'}, {profile.age || 'N/A'} years old
                  </h3>
                  <p className="text-gray-600">Height: {profile.height || 'N/A'} cm</p>
                </div>
              </div>

              {/* Profile Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Physical Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Age:</span>
                      <span className="font-medium">{profile.age || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gender:</span>
                      <span className="font-medium">{profile.gender || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Height:</span>
                      <span className="font-medium">{profile.height ? `${profile.height} cm` : 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Weight:</span>
                      <span className="font-medium">{weightEntries[0]?.weight ? `${weightEntries[0].weight} kg` : 'Not recorded'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Goals & Targets</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Activity Level:</span>
                      <span className="font-medium">{profile.activity_level?.replace('_', ' ') || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Target Weight:</span>
                      <span className="font-medium">{profile.target_weight ? `${profile.target_weight} kg` : 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Target Calories:</span>
                      <span className="font-medium">{profile.target_calories ? `${profile.target_calories} kcal` : 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Weekly Workouts:</span>
                      <span className="font-medium">{profile.target_workouts_per_week || 'Not set'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No profile information yet</p>
              <button
                onClick={() => setShowProfileForm(true)}
                className="btn-primary"
              >
                Set up your profile
              </button>
            </div>
          )}
        </div>
      )}

      {/* Calories Tab */}
      {activeTab === 'calories' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Calorie Tracking</h2>
            <button
              onClick={() => setShowCalorieForm(true)}
              className="w-7 h-7 flex items-center justify-center bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Daily Summary */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-green-900">Daily Total</h3>
                  <p className="text-2xl font-bold text-green-600">{dailyStats.totalCalories} kcal</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-green-700">Target: {profile?.target_calories || 'Not set'}</p>
                  {profile?.target_calories && (
                    <p className="text-sm text-green-600">
                      {dailyStats.totalCalories - profile.target_calories > 0 ? '+' : ''}
                      {dailyStats.totalCalories - profile.target_calories} kcal
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Entries List */}
            <div className="space-y-3">
              {calorieEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Utensils className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No food entries for {format(selectedDate, 'MMM d')}</p>
                </div>
              ) : (
                calorieEntries.map((entry) => (
                  <div key={entry.id} className="p-4 bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{entry.food_name}</h4>
                        <p className="text-sm text-gray-600">
                          {entry.category.charAt(0).toUpperCase() + entry.category.slice(1)}
                          {entry.description && ` • ${entry.description}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">{entry.calories} kcal</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Workout Tab */}
      {activeTab === 'workout' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Workout Tracking</h2>
            <button
              onClick={() => setShowWorkoutForm(true)}
              className="w-7 h-7 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Daily Summary */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-blue-900">Calories Burned</h3>
                  <p className="text-2xl font-bold text-blue-600">{dailyStats.totalCaloriesBurned} kcal</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-700">Workouts: {dailyStats.workoutsCompleted}</p>
                </div>
              </div>
            </div>

            {/* Entries List */}
            <div className="space-y-3">
              {workoutEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Dumbbell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No workouts for {format(selectedDate, 'MMM d')}</p>
                </div>
              ) : (
                workoutEntries.map((entry) => (
                  <div key={entry.id} className="p-4 bg-white border border-gray-200 rounded-lg">
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
                        <p className="font-bold text-blue-600">{entry.calories_burned} kcal</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Progress Tab */}
      {activeTab === 'progress' && (
        <div className="space-y-6">
          {/* Weight Progress */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Weight Progress</h2>
              <button
                onClick={() => setShowWeightForm(true)}
                className="w-7 h-7 flex items-center justify-center bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {weightEntries.length > 0 ? (
              <div className="space-y-4">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightEntries.slice(0, 10).reverse()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => format(new Date(value), 'MMM d')}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        labelFormatter={(value) => format(new Date(value), 'MMM d, yyyy')}
                        formatter={(value: number) => [`${value} kg`, 'Weight']}
                      />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="#f97316"
                        strokeWidth={3}
                        dot={{ fill: '#f97316', strokeWidth: 2, r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Fitness Goals */}
                {profile && (
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <h3 className="font-medium text-orange-900 mb-3">Fitness Goals</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-orange-700">Current Weight</p>
                        <p className="text-xl font-bold text-orange-600">{weightEntries[0]?.weight || 'N/A'} kg</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-orange-700">Target Weight</p>
                        <p className="text-xl font-bold text-orange-600">{profile.target_weight || 'N/A'} kg</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-orange-700">Difference</p>
                        <p className="text-xl font-bold text-orange-600">
                          {profile.target_weight && weightEntries[0]?.weight 
                            ? `${(profile.target_weight - weightEntries[0].weight).toFixed(1)} kg`
                            : 'N/A'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Scale className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No weight entries yet</p>
              </div>
            )}
          </div>

          {/* Statistics */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Statistics</h2>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="stat-card">
                <div className="stat-value text-orange-600">{weightEntries[0]?.weight || 'N/A'}</div>
                <div className="stat-label">Current Weight (kg)</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-value text-blue-600">
                  {weightEntries.length >= 2 
                    ? `${(weightEntries[0].weight - weightEntries[1].weight).toFixed(1)}`
                    : 'N/A'
                  }
                </div>
                <div className="stat-label">Weekly Change (kg)</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-value text-green-600">{workoutEntries.length}</div>
                <div className="stat-label">Workouts Today</div>
              </div>
              
              <div className="stat-card">
                <div className={`stat-value ${dailyStats.calorieBalance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {dailyStats.calorieBalance > 0 ? 'Surplus' : 'Deficit'}
                </div>
                <div className="stat-label">Calorie Status</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sleep Tab */}
      {activeTab === 'sleep' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Sleep Tracking</h2>
            <button
              onClick={() => setShowSleepForm(true)}
              className="w-7 h-7 flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Daily Summary */}
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-purple-900">Sleep Duration</h3>
                  <p className="text-2xl font-bold text-purple-600">{dailyStats.sleepHours.toFixed(1)} hours</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-purple-700">Target: 7-9 hours</p>
                  <p className={`text-sm ${dailyStats.sleepHours >= 7 && dailyStats.sleepHours <= 9 ? 'text-green-600' : 'text-red-600'}`}>
                    {dailyStats.sleepHours >= 7 && dailyStats.sleepHours <= 9 ? 'Good' : 'Needs improvement'}
                  </p>
                </div>
              </div>
            </div>

            {/* Entries List */}
            <div className="space-y-3">
              {sleepEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Moon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No sleep data for {format(selectedDate, 'MMM d')}</p>
                </div>
              ) : (
                sleepEntries.map((entry) => (
                  <div key={entry.id} className="p-4 bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Sleep Session</h4>
                        <p className="text-sm text-gray-600">
                          {entry.sleep_time} - {entry.wake_time}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-purple-600">{entry.duration_hours.toFixed(1)} hours</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Forms */}
      {showCalorieForm && <CalorieForm />}
      {showWorkoutForm && <WorkoutForm />}
      {showWeightForm && <WeightForm />}
      {showSleepForm && <SleepForm />}
      {showProfileForm && <ProfileForm />}
    </div>
  );
};

export default BodyTracker;