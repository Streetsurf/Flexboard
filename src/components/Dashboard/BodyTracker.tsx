import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  User, 
  Target, 
  Activity, 
  Calendar, 
  Plus, 
  Edit2, 
  Save, 
  X, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  Flame,
  Clock,
  Moon,
  Scale,
  Utensils,
  Dumbbell,
  BarChart3,
  Award,
  Upload,
  Image
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { format, addDays, subDays, startOfWeek, endOfWeek, isSameDay, isToday } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import BodyTrackerDashboard from './BodyTrackerDashboard';

// Interfaces
interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string;
  age?: number;
  height?: number;
  activity_level: string;
  target_weight?: number;
  target_calories?: number;
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
  // State Management
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'progress' | 'calories' | 'workouts' | 'sleep'>('dashboard');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Profile State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    avatar_url: '',
    age: '',
    height: '',
    activity_level: 'moderately_active',
    target_weight: '',
    target_calories: '',
    target_workouts_per_week: 3
  });

  // Data State
  const [calorieEntries, setCalorieEntries] = useState<CalorieEntry[]>([]);
  const [workoutEntries, setWorkoutEntries] = useState<WorkoutEntry[]>([]);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [sleepEntries, setSleepEntries] = useState<SleepEntry[]>([]);

  // Form States
  const [showCalorieForm, setShowCalorieForm] = useState(false);
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [showSleepForm, setShowSleepForm] = useState(false);

  const [calorieForm, setCalorieForm] = useState({
    food_name: '',
    calories: '',
    category: 'breakfast' as CalorieEntry['category'],
    description: ''
  });

  const [workoutForm, setWorkoutForm] = useState({
    exercise_name: '',
    type: 'duration' as WorkoutEntry['type'],
    duration_minutes: '',
    repetitions: '',
    calories_burned: '',
    use_duration: true,
    use_reps: false
  });

  const [weightForm, setWeightForm] = useState({
    weight: '',
    body_fat: ''
  });

  const [sleepForm, setSleepForm] = useState({
    sleep_time: '',
    wake_time: ''
  });

  const { user } = useAuth();
  const dateStr = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);

  // Fetch Profile Data - Persistent across navigation
  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }
      
      if (data) {
        setProfile(data);
        // Update form with current profile data
        setProfileForm({
          full_name: data.full_name || '',
          avatar_url: data.avatar_url || '',
          age: data.age?.toString() || '',
          height: data.height?.toString() || '',
          activity_level: data.activity_level || 'moderately_active',
          target_weight: data.target_weight?.toString() || '',
          target_calories: data.target_calories?.toString() || '',
          target_workouts_per_week: data.target_workouts_per_week || 3
        });
      } else {
        // Create default profile if doesn't exist
        const defaultProfile = {
          id: user.id,
          full_name: '',
          avatar_url: '',
          age: null,
          height: null,
          activity_level: 'moderately_active',
          target_weight: null,
          target_calories: null,
          target_workouts_per_week: 3
        };
        
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .upsert([defaultProfile])
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          return;
        }
        
        setProfile(newProfile);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  }, [user?.id]);

  // Fetch Data Functions
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
        .order('date', { ascending: true })
        .limit(30);

      if (error) throw error;
      setWeightEntries(data || []);
    } catch (error) {
      console.error('Error fetching weight data:', error);
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

  // Initial Data Load
  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([
        fetchProfile(),
        fetchCalorieEntries(),
        fetchWorkoutEntries(),
        fetchWeightEntries(),
        fetchSleepEntries()
      ]).finally(() => {
        setLoading(false);
      });
    }
  }, [user, fetchProfile, fetchCalorieEntries, fetchWorkoutEntries, fetchWeightEntries, fetchSleepEntries]);

  // Listen for profile updates from other components
  useEffect(() => {
    const handleProfileUpdate = () => {
      fetchProfile();
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [fetchProfile]);

  // Save Profile Function
  const saveProfile = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || saving) return;

    setSaving(true);
    try {
      const profileData = {
        full_name: profileForm.full_name,
        avatar_url: profileForm.avatar_url,
        age: profileForm.age ? parseInt(profileForm.age) : null,
        height: profileForm.height ? parseFloat(profileForm.height) : null,
        activity_level: profileForm.activity_level,
        target_weight: profileForm.target_weight ? parseFloat(profileForm.target_weight) : null,
        target_calories: profileForm.target_calories ? parseInt(profileForm.target_calories) : null,
        target_workouts_per_week: profileForm.target_workouts_per_week,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      
      setProfile(data);
      setIsEditingProfile(false);
      
      // Trigger global profile update event
      window.dispatchEvent(new CustomEvent('profileUpdated'));
      
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  }, [user?.id, profileForm, saving]);

  // Cancel Profile Edit
  const cancelProfileEdit = useCallback(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || '',
        avatar_url: profile.avatar_url || '',
        age: profile.age?.toString() || '',
        height: profile.height?.toString() || '',
        activity_level: profile.activity_level || 'moderately_active',
        target_weight: profile.target_weight?.toString() || '',
        target_calories: profile.target_calories?.toString() || '',
        target_workouts_per_week: profile.target_workouts_per_week || 3
      });
    }
    setIsEditingProfile(false);
  }, [profile]);

  // Add Calorie Entry
  const addCalorieEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || saving) return;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('calorie_entries')
        .insert([
          {
            food_name: calorieForm.food_name,
            calories: parseInt(calorieForm.calories),
            category: calorieForm.category,
            description: calorieForm.description,
            date: dateStr,
            user_id: user.id
          }
        ])
        .select()
        .single();

      if (error) throw error;
      
      setCalorieEntries(prev => [data, ...prev]);
      setCalorieForm({
        food_name: '',
        calories: '',
        category: 'breakfast',
        description: ''
      });
      setShowCalorieForm(false);
    } catch (error) {
      console.error('Error adding calorie entry:', error);
    } finally {
      setSaving(false);
    }
  };

  // Add Workout Entry
  const addWorkoutEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || saving) return;

    setSaving(true);
    try {
      const workoutData: any = {
        exercise_name: workoutForm.exercise_name,
        type: workoutForm.type,
        calories_burned: parseInt(workoutForm.calories_burned),
        date: dateStr,
        user_id: user.id
      };

      if (workoutForm.type === 'duration') {
        workoutData.duration_minutes = parseInt(workoutForm.duration_minutes);
        workoutData.repetitions = null;
      } else {
        workoutData.repetitions = parseInt(workoutForm.repetitions);
        workoutData.duration_minutes = null;
      }

      const { data, error } = await supabase
        .from('workout_entries')
        .insert([workoutData])
        .select()
        .single();

      if (error) throw error;
      
      setWorkoutEntries(prev => [data, ...prev]);
      setWorkoutForm({
        exercise_name: '',
        type: 'duration',
        duration_minutes: '',
        repetitions: '',
        calories_burned: '',
        use_duration: true,
        use_reps: false
      });
      setShowWorkoutForm(false);
    } catch (error) {
      console.error('Error adding workout entry:', error);
    } finally {
      setSaving(false);
    }
  };

  // Add Weight Entry
  const addWeightEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || saving) return;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('weight_entries')
        .upsert([
          {
            weight: parseFloat(weightForm.weight),
            body_fat: weightForm.body_fat ? parseFloat(weightForm.body_fat) : null,
            date: dateStr,
            user_id: user.id
          }
        ])
        .select()
        .single();

      if (error) throw error;
      
      await fetchWeightEntries();
      setWeightForm({
        weight: '',
        body_fat: ''
      });
      setShowWeightForm(false);
    } catch (error) {
      console.error('Error adding weight entry:', error);
    } finally {
      setSaving(false);
    }
  };

  // Add Sleep Entry
  const addSleepEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || saving) return;

    setSaving(true);
    try {
      // Calculate duration
      const sleepTime = new Date(`2000-01-01 ${sleepForm.sleep_time}`);
      const wakeTime = new Date(`2000-01-01 ${sleepForm.wake_time}`);
      
      let duration = (wakeTime.getTime() - sleepTime.getTime()) / (1000 * 60 * 60);
      if (duration < 0) duration += 24; // Handle overnight sleep

      const { data, error } = await supabase
        .from('sleep_entries')
        .upsert([
          {
            sleep_time: sleepForm.sleep_time,
            wake_time: sleepForm.wake_time,
            duration_hours: Math.round(duration * 10) / 10,
            date: dateStr,
            user_id: user.id
          }
        ])
        .select()
        .single();

      if (error) throw error;
      
      setSleepEntries([data]);
      setSleepForm({
        sleep_time: '',
        wake_time: ''
      });
      setShowSleepForm(false);
    } catch (error) {
      console.error('Error adding sleep entry:', error);
    } finally {
      setSaving(false);
    }
  };

  // Delete Functions
  const deleteCalorieEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from('calorie_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setCalorieEntries(prev => prev.filter(entry => entry.id !== id));
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
      setWorkoutEntries(prev => prev.filter(entry => entry.id !== id));
    } catch (error) {
      console.error('Error deleting workout entry:', error);
    }
  };

  const deleteWeightEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from('weight_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchWeightEntries();
    } catch (error) {
      console.error('Error deleting weight entry:', error);
    }
  };

  const deleteSleepEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sleep_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSleepEntries(prev => prev.filter(entry => entry.id !== id));
    } catch (error) {
      console.error('Error deleting sleep entry:', error);
    }
  };

  // Navigation Functions
  const navigateDate = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedDate(prev => subDays(prev, 1));
    } else {
      setSelectedDate(prev => addDays(prev, 1));
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Utility Functions
  const getActivityLevelLabel = (level: string) => {
    const labels: { [key: string]: string } = {
      sedentary: 'Sedentary (Little/No Exercise)',
      lightly_active: 'Lightly Active (Light Exercise 1-3 days/week)',
      moderately_active: 'Moderately Active (Moderate Exercise 3-5 days/week)',
      very_active: 'Very Active (Hard Exercise 6-7 days/week)',
      extremely_active: 'Extremely Active (Very Hard Exercise/Physical Job)'
    };
    return labels[level] || level;
  };

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      breakfast: 'Sarapan',
      lunch: 'Makan Siang',
      dinner: 'Makan Malam',
      snack: 'Cemilan'
    };
    return labels[category] || category;
  };

  const formatWorkoutDisplay = (workout: WorkoutEntry) => {
    if (workout.type === 'duration') {
      return `${workout.duration_minutes} minutes`;
    } else {
      return `${workout.repetitions}x`;
    }
  };

  // Calculate totals
  const totalCalories = calorieEntries.reduce((sum, entry) => sum + entry.calories, 0);
  const totalCaloriesBurned = workoutEntries.reduce((sum, entry) => sum + entry.calories_burned, 0);
  const currentWeight = weightEntries.length > 0 ? weightEntries[weightEntries.length - 1].weight : null;
  const todaySleep = sleepEntries.length > 0 ? sleepEntries[0] : null;

  // Week days for calendar
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(start, i));
    }
    return days;
  }, [selectedDate]);

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
        <div className="border-b border-gray-200">
          <nav className="flex space-x-6 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'profile', label: 'Profile', icon: User },
              { id: 'progress', label: 'Progress', icon: TrendingUp },
              { id: 'calories', label: 'Calories', icon: Utensils },
              { id: 'workouts', label: 'Workouts', icon: Dumbbell },
              { id: 'sleep', label: 'Sleep', icon: Moon }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex items-center space-x-2 ${
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
        <BodyTrackerDashboard />
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card animate-fadeIn">
          <div className="card-header">
            <h2 className="card-title">Profile Information</h2>
            {!isEditingProfile && (
              <button
                onClick={() => setIsEditingProfile(true)}
                className="btn-secondary"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Profile
              </button>
            )}
          </div>

          {isEditingProfile ? (
            <form onSubmit={saveProfile} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Basic Information
                </h3>
                
                {/* Avatar Section */}
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                    {profileForm.avatar_url ? (
                      <img
                        src={profileForm.avatar_url}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <User className={`w-6 h-6 text-gray-400 ${profileForm.avatar_url ? 'hidden' : ''}`} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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

                {/* Name, Age, Height */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                      placeholder="Enter your full name"
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Height (cm)
                    </label>
                    <input
                      type="number"
                      min="50"
                      max="300"
                      step="0.1"
                      value={profileForm.height}
                      onChange={(e) => setProfileForm({ ...profileForm, height: e.target.value })}
                      placeholder="170"
                      className="input"
                    />
                  </div>
                </div>

                {/* Activity Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Activity Level
                  </label>
                  <select
                    value={profileForm.activity_level}
                    onChange={(e) => setProfileForm({ ...profileForm, activity_level: e.target.value })}
                    className="input"
                  >
                    <option value="sedentary">Sedentary (Little/No Exercise)</option>
                    <option value="lightly_active">Lightly Active (Light Exercise 1-3 days/week)</option>
                    <option value="moderately_active">Moderately Active (Moderate Exercise 3-5 days/week)</option>
                    <option value="very_active">Very Active (Hard Exercise 6-7 days/week)</option>
                    <option value="extremely_active">Extremely Active (Very Hard Exercise/Physical Job)</option>
                  </select>
                </div>
              </div>

              {/* Targets */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Targets & Goals
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Weight (kg)
                    </label>
                    <input
                      type="number"
                      min="20"
                      max="300"
                      step="0.1"
                      value={profileForm.target_weight}
                      onChange={(e) => setProfileForm({ ...profileForm, target_weight: e.target.value })}
                      placeholder="70"
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Daily Calorie Target
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Workouts per Week
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="14"
                      value={profileForm.target_workouts_per_week}
                      onChange={(e) => setProfileForm({ ...profileForm, target_workouts_per_week: parseInt(e.target.value) || 0 })}
                      className="input"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={cancelProfileEdit}
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
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <User className={`w-6 h-6 text-gray-400 ${profile?.avatar_url ? 'hidden' : ''}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {profile?.full_name || 'No name set'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {profile?.age ? `${profile.age} years old` : 'Age not set'}
                    {profile?.height && ` • ${profile.height} cm`}
                  </p>
                </div>
              </div>

              {/* Basic Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Physical Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Age:</span>
                      <span className="font-medium">{profile?.age || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Height:</span>
                      <span className="font-medium">{profile?.height ? `${profile.height} cm` : 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Weight:</span>
                      <span className="font-medium">{currentWeight ? `${currentWeight} kg` : 'Not recorded'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Target Weight:</span>
                      <span className="font-medium">{profile?.target_weight ? `${profile.target_weight} kg` : 'Not set'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Activity & Goals</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Activity Level:</span>
                      <span className="font-medium text-xs">{getActivityLevelLabel(profile?.activity_level || 'moderately_active')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Daily Calories:</span>
                      <span className="font-medium">{profile?.target_calories || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Weekly Workouts:</span>
                      <span className="font-medium">{profile?.target_workouts_per_week || 0} times</span>
                    </div>
                  </div>
                </div>
              </div>

              {(!profile?.full_name && !profile?.age && !profile?.height) && (
                <div className="text-center py-8">
                  <User className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4 text-sm">Your profile is incomplete</p>
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="btn-primary"
                  >
                    Complete your profile
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Progress Tab */}
      {activeTab === 'progress' && (
        <div className="space-y-6">
          {/* Weight Progress Chart */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Scale className="w-4 h-4 text-white" />
                </div>
                <h2 className="card-title">Weight Progress</h2>
              </div>
              <button
                onClick={() => setShowWeightForm(true)}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Weight
              </button>
            </div>

            {weightEntries.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightEntries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => format(new Date(value), 'MMM dd', { locale: localeId })}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      domain={['dataMin - 2', 'dataMax + 2']}
                    />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), 'dd MMMM yyyy', { locale: localeId })}
                      formatter={(value: any) => [`${value} kg`, 'Weight']}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
                      activeDot={{ r: 8, stroke: '#3b82f6', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Scale className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="mb-4">No weight data recorded yet</p>
                <button
                  onClick={() => setShowWeightForm(true)}
                  className="btn-primary"
                >
                  Record your first weight
                </button>
              </div>
            )}

            {/* Weight Entries List */}
            {weightEntries.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Entries</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {weightEntries.slice(-5).reverse().map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium text-gray-900">{entry.weight} kg</span>
                        {entry.body_fat && (
                          <span className="text-sm text-gray-600 ml-2">• {entry.body_fat}% body fat</span>
                        )}
                        <div className="text-xs text-gray-500">
                          {format(new Date(entry.date), 'dd MMMM yyyy', { locale: localeId })}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteWeightEntry(entry.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Statistics */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h2 className="card-title">Statistics</h2>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="stat-card bg-blue-50 border-blue-200">
                <div className="stat-value text-blue-600">{totalCalories}</div>
                <div className="stat-label">Calories Today</div>
              </div>
              <div className="stat-card bg-orange-50 border-orange-200">
                <div className="stat-value text-orange-600">{totalCaloriesBurned}</div>
                <div className="stat-label">Calories Burned</div>
              </div>
              <div className="stat-card bg-green-50 border-green-200">
                <div className="stat-value text-green-600">{workoutEntries.length}</div>
                <div className="stat-label">Workouts Today</div>
              </div>
              <div className="stat-card bg-purple-50 border-purple-200">
                <div className="stat-value text-purple-600">
                  {todaySleep ? `${todaySleep.duration_hours}h` : '0h'}
                </div>
                <div className="stat-label">Sleep Duration</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calories Tab */}
      {activeTab === 'calories' && (
        <div className="space-y-6">
          {/* Date Navigation */}
          <div className="card animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigateDate('prev')}
                  className="btn-icon-secondary"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium text-gray-900 text-sm">
                    {format(selectedDate, 'EEEE, dd MMMM yyyy', { locale: localeId })}
                  </span>
                </button>
                
                <button
                  onClick={() => navigateDate('next')}
                  className="btn-icon-secondary"
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
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
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

          {/* Calorie Tracker */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <Utensils className="w-4 h-4 text-white" />
                </div>
                <h2 className="card-title">Calorie Intake</h2>
              </div>
              <button
                onClick={() => setShowCalorieForm(true)}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Food
              </button>
            </div>

            {/* Calorie Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="stat-card bg-green-50 border-green-200">
                <div className="stat-value text-green-600">{totalCalories}</div>
                <div className="stat-label">Total Calories</div>
              </div>
              <div className="stat-card bg-blue-50 border-blue-200">
                <div className="stat-value text-blue-600">
                  {profile?.target_calories || 0}
                </div>
                <div className="stat-label">Target Calories</div>
              </div>
              <div className="stat-card bg-orange-50 border-orange-200">
                <div className="stat-value text-orange-600">
                  {profile?.target_calories ? Math.max(0, (profile.target_calories - totalCalories)) : 0}
                </div>
                <div className="stat-label">Remaining</div>
              </div>
              <div className="stat-card bg-purple-50 border-purple-200">
                <div className="stat-value text-purple-600">
                  {profile?.target_calories ? Math.round((totalCalories / profile.target_calories) * 100) : 0}%
                </div>
                <div className="stat-label">Progress</div>
              </div>
            </div>

            {/* Calorie Entries */}
            <div className="space-y-3">
              {calorieEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Utensils className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="mb-4">No food entries for {format(selectedDate, 'dd MMMM', { locale: localeId })}</p>
                  <button
                    onClick={() => setShowCalorieForm(true)}
                    className="btn-primary"
                  >
                    Add your first meal
                  </button>
                </div>
              ) : (
                calorieEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className="badge badge-info">{getCategoryLabel(entry.category)}</span>
                        <h3 className="font-medium text-gray-900">{entry.food_name}</h3>
                        <span className="font-semibold text-green-600">{entry.calories} cal</span>
                      </div>
                      {entry.description && (
                        <p className="text-sm text-gray-600 mt-1">{entry.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteCalorieEntry(entry.id)}
                      className="text-red-500 hover:text-red-700 p-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Workouts Tab */}
      {activeTab === 'workouts' && (
        <div className="space-y-6">
          {/* Date Navigation */}
          <div className="card animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigateDate('prev')}
                  className="btn-icon-secondary"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium text-gray-900 text-sm">
                    {format(selectedDate, 'EEEE, dd MMMM yyyy', { locale: localeId })}
                  </span>
                </button>
                
                <button
                  onClick={() => navigateDate('next')}
                  className="btn-icon-secondary"
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
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
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

          {/* Workout Tracker */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Dumbbell className="w-4 h-4 text-white" />
                </div>
                <h2 className="card-title">Workout Tracker</h2>
              </div>
              <button
                onClick={() => setShowWorkoutForm(true)}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Workout
              </button>
            </div>

            {/* Workout Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="stat-card bg-orange-50 border-orange-200">
                <div className="stat-value text-orange-600">{workoutEntries.length}</div>
                <div className="stat-label">Workouts Today</div>
              </div>
              <div className="stat-card bg-red-50 border-red-200">
                <div className="stat-value text-red-600">{totalCaloriesBurned}</div>
                <div className="stat-label">Calories Burned</div>
              </div>
              <div className="stat-card bg-blue-50 border-blue-200">
                <div className="stat-value text-blue-600">
                  {profile?.target_workouts_per_week || 0}
                </div>
                <div className="stat-label">Weekly Target</div>
              </div>
              <div className="stat-card bg-green-50 border-green-200">
                <div className="stat-value text-green-600">
                  {workoutEntries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0)}
                </div>
                <div className="stat-label">Total Minutes</div>
              </div>
            </div>

            {/* Workout Entries */}
            <div className="space-y-3">
              {workoutEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Dumbbell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="mb-4">No workouts for {format(selectedDate, 'dd MMMM', { locale: localeId })}</p>
                  <button
                    onClick={() => setShowWorkoutForm(true)}
                    className="btn-primary"
                  >
                    Add your first workout
                  </button>
                </div>
              ) : (
                workoutEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium text-gray-900">{entry.exercise_name}</h3>
                        <span className="badge badge-info">{formatWorkoutDisplay(entry)}</span>
                        <span className="font-semibold text-orange-600">{entry.calories_burned} cal</span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteWorkoutEntry(entry.id)}
                      className="text-red-500 hover:text-red-700 p-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sleep Tab */}
      {activeTab === 'sleep' && (
        <div className="space-y-6">
          {/* Date Navigation */}
          <div className="card animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigateDate('prev')}
                  className="btn-icon-secondary"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium text-gray-900 text-sm">
                    {format(selectedDate, 'EEEE, dd MMMM yyyy', { locale: localeId })}
                  </span>
                </button>
                
                <button
                  onClick={() => navigateDate('next')}
                  className="btn-icon-secondary"
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
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
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

          {/* Sleep Tracker */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Moon className="w-4 h-4 text-white" />
                </div>
                <h2 className="card-title">Sleep Tracker</h2>
              </div>
              <button
                onClick={() => setShowSleepForm(true)}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Sleep
              </button>
            </div>

            {/* Sleep Entry */}
            {todaySleep ? (
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-purple-900 mb-2">Sleep for {format(selectedDate, 'dd MMMM', { locale: localeId })}</h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-purple-600 font-medium">Bedtime:</span>
                        <div className="text-purple-800">{todaySleep.sleep_time}</div>
                      </div>
                      <div>
                        <span className="text-purple-600 font-medium">Wake up:</span>
                        <div className="text-purple-800">{todaySleep.wake_time}</div>
                      </div>
                      <div>
                        <span className="text-purple-600 font-medium">Duration:</span>
                        <div className="text-purple-800 font-semibold">{todaySleep.duration_hours}h</div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteSleepEntry(todaySleep.id)}
                    className="text-red-500 hover:text-red-700 p-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Moon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="mb-4">No sleep data for {format(selectedDate, 'dd MMMM', { locale: localeId })}</p>
                <button
                  onClick={() => setShowSleepForm(true)}
                  className="btn-primary"
                >
                  Record your sleep
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Calorie Form Modal */}
      {showCalorieForm && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add Food Entry</h3>
                <button
                  onClick={() => setShowCalorieForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={addCalorieEntry} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Calories
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={calorieForm.calories}
                      onChange={(e) => setCalorieForm({ ...calorieForm, calories: e.target.value })}
                      placeholder="250"
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={calorieForm.category}
                      onChange={(e) => setCalorieForm({ ...calorieForm, category: e.target.value as CalorieEntry['category'] })}
                      className="input"
                    >
                      <option value="breakfast">Sarapan</option>
                      <option value="lunch">Makan Siang</option>
                      <option value="dinner">Makan Malam</option>
                      <option value="snack">Cemilan</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={calorieForm.description}
                    onChange={(e) => setCalorieForm({ ...calorieForm, description: e.target.value })}
                    placeholder="Additional notes..."
                    className="textarea"
                    rows={3}
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 btn-primary disabled:opacity-50"
                  >
                    {saving ? 'Adding...' : 'Add Food'}
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

      {/* Add Workout Form Modal */}
      {showWorkoutForm && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add Workout</h3>
                <button
                  onClick={() => setShowWorkoutForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={addWorkoutEntry} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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

                {/* Workout Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Workout Type
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={workoutForm.use_duration}
                        onChange={(e) => {
                          setWorkoutForm({ 
                            ...workoutForm, 
                            use_duration: e.target.checked,
                            type: e.target.checked ? 'duration' : 'reps'
                          });
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Duration (minutes)</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={workoutForm.use_reps}
                        onChange={(e) => {
                          setWorkoutForm({ 
                            ...workoutForm, 
                            use_reps: e.target.checked,
                            type: e.target.checked ? 'reps' : 'duration'
                          });
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Repetitions</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {workoutForm.type === 'duration' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 btn-primary disabled:opacity-50"
                  >
                    {saving ? 'Adding...' : 'Add Workout'}
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

      {/* Add Weight Form Modal */}
      {showWeightForm && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Record Weight</h3>
                <button
                  onClick={() => setShowWeightForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={addWeightEntry} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Body Fat % (Optional)
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
                    type="submit"
                    disabled={saving}
                    className="flex-1 btn-primary disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Weight'}
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

      {/* Add Sleep Form Modal */}
      {showSleepForm && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Record Sleep</h3>
                <button
                  onClick={() => setShowSleepForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={addSleepEntry} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                </div>

                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <p>Duration will be calculated automatically. If you sleep past midnight, the calculation will account for overnight sleep.</p>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 btn-primary disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Sleep'}
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