import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, 
  Target, 
  Activity, 
  Utensils, 
  Moon, 
  TrendingUp, 
  Plus, 
  Edit2, 
  Save, 
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Upload,
  Camera
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { format, addDays, subDays, isToday } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import BodyTrackerDashboard from './BodyTrackerDashboard';

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

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  // Body tracker specific fields
  age?: number;
  height?: number;
  activity_level?: string;
  target_weight?: number;
  target_calories?: number;
  target_workouts_per_week?: number;
}

const BodyTracker: React.FC = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'progress' | 'calories' | 'workouts' | 'sleep'>('dashboard');
  const [loading, setLoading] = useState(true);

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    avatar_url: '',
    bio: '',
    age: '',
    height: '',
    activity_level: 'moderate',
    target_weight: '',
    target_calories: '',
    target_workouts_per_week: ''
  });

  // Data states
  const [calorieEntries, setCalorieEntries] = useState<CalorieEntry[]>([]);
  const [workoutEntries, setWorkoutEntries] = useState<WorkoutEntry[]>([]);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [sleepEntries, setSleepEntries] = useState<SleepEntry[]>([]);

  // Form states
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
    useDuration: true,
    useReps: false
  });

  const [weightForm, setWeightForm] = useState({
    weight: '',
    body_fat: ''
  });

  const [sleepForm, setSleepForm] = useState({
    sleep_time: '',
    wake_time: ''
  });

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  // Fetch profile data
  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
        setProfileForm({
          full_name: data.full_name || '',
          avatar_url: data.avatar_url || '',
          bio: data.bio || '',
          age: data.age?.toString() || '',
          height: data.height?.toString() || '',
          activity_level: data.activity_level || 'moderate',
          target_weight: data.target_weight?.toString() || '',
          target_calories: data.target_calories?.toString() || '',
          target_workouts_per_week: data.target_workouts_per_week?.toString() || ''
        });
      } else {
        // Create default profile if doesn't exist
        const defaultProfile = {
          id: user.id,
          email: user.email || '',
          full_name: '',
          avatar_url: '',
          bio: '',
          age: null,
          height: null,
          activity_level: 'moderate',
          target_weight: null,
          target_calories: null,
          target_workouts_per_week: null
        };

        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .upsert([defaultProfile])
          .select()
          .single();

        if (createError) throw createError;
        setProfile(newProfile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }, [user?.id]);

  // Save profile data
  const saveProfile = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      const profileData = {
        id: user.id,
        full_name: profileForm.full_name,
        avatar_url: profileForm.avatar_url,
        bio: profileForm.bio,
        age: profileForm.age ? parseInt(profileForm.age) : null,
        height: profileForm.height ? parseFloat(profileForm.height) : null,
        activity_level: profileForm.activity_level,
        target_weight: profileForm.target_weight ? parseFloat(profileForm.target_weight) : null,
        target_calories: profileForm.target_calories ? parseInt(profileForm.target_calories) : null,
        target_workouts_per_week: profileForm.target_workouts_per_week ? parseInt(profileForm.target_workouts_per_week) : null,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('profiles')
        .upsert([profileData])
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      setIsEditingProfile(false);
      
      // Trigger profile update event
      window.dispatchEvent(new CustomEvent('profileUpdated'));
      
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch calorie entries
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

  // Fetch workout entries
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

  // Fetch weight entries
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

  // Fetch sleep entries
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

  // Initial data fetch
  useEffect(() => {
    if (user) {
      const fetchAllData = async () => {
        setLoading(true);
        await Promise.all([
          fetchProfile(),
          fetchCalorieEntries(),
          fetchWorkoutEntries(),
          fetchWeightEntries(),
          fetchSleepEntries()
        ]);
        setLoading(false);
      };
      
      fetchAllData();
    }
  }, [user, fetchProfile, fetchCalorieEntries, fetchWorkoutEntries, fetchWeightEntries, fetchSleepEntries]);

  // Refetch data when date changes
  useEffect(() => {
    if (user) {
      fetchCalorieEntries();
      fetchWorkoutEntries();
      fetchSleepEntries();
    }
  }, [dateStr, fetchCalorieEntries, fetchWorkoutEntries, fetchSleepEntries]);

  // Add calorie entry
  const addCalorieEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

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
    }
  };

  // Add workout entry
  const addWorkoutEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

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
      } else {
        workoutData.repetitions = parseInt(workoutForm.repetitions);
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
        useDuration: true,
        useReps: false
      });
      setShowWorkoutForm(false);
    } catch (error) {
      console.error('Error adding workout entry:', error);
    }
  };

  // Add weight entry
  const addWeightEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

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

      setWeightEntries(prev => {
        const filtered = prev.filter(entry => entry.date !== dateStr);
        return [...filtered, data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      });
      
      setWeightForm({
        weight: '',
        body_fat: ''
      });
      setShowWeightForm(false);
    } catch (error) {
      console.error('Error adding weight entry:', error);
    }
  };

  // Add sleep entry
  const addSleepEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      const sleepTime = new Date(`2000-01-01T${sleepForm.sleep_time}:00`);
      const wakeTime = new Date(`2000-01-01T${sleepForm.wake_time}:00`);
      
      let duration = (wakeTime.getTime() - sleepTime.getTime()) / (1000 * 60 * 60);
      if (duration < 0) duration += 24; // Handle overnight sleep

      const { data, error } = await supabase
        .from('sleep_entries')
        .upsert([
          {
            sleep_time: sleepForm.sleep_time,
            wake_time: sleepForm.wake_time,
            duration_hours: Math.round(duration * 100) / 100,
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

  // Navigation functions
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

  // Cancel profile editing
  const cancelProfileEdit = () => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || '',
        avatar_url: profile.avatar_url || '',
        bio: profile.bio || '',
        age: profile.age?.toString() || '',
        height: profile.height?.toString() || '',
        activity_level: profile.activity_level || 'moderate',
        target_weight: profile.target_weight?.toString() || '',
        target_calories: profile.target_calories?.toString() || '',
        target_workouts_per_week: profile.target_workouts_per_week?.toString() || ''
      });
    }
    setIsEditingProfile(false);
  };

  // Calculate totals
  const totalCalories = calorieEntries.reduce((sum, entry) => sum + entry.calories, 0);
  const totalCaloriesBurned = workoutEntries.reduce((sum, entry) => sum + entry.calories_burned, 0);
  const currentWeight = weightEntries.length > 0 ? weightEntries[weightEntries.length - 1].weight : null;
  const todaySleep = sleepEntries.length > 0 ? sleepEntries[0] : null;

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
      {/* Tab Navigation */}
      <div className="card animate-fadeIn">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-6 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
              { id: 'profile', label: 'Profile', icon: User },
              { id: 'progress', label: 'Progress', icon: Target },
              { id: 'calories', label: 'Calories', icon: Utensils },
              { id: 'workouts', label: 'Workouts', icon: Activity },
              { id: 'sleep', label: 'Sleep', icon: Moon }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
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

      {/* Date Navigation - Show for all tabs except dashboard and profile */}
      {!['dashboard', 'profile'].includes(activeTab) && (
        <div className="card animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateDate('prev')}
                className="btn-icon-secondary"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg">
                <Calendar className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-900 text-sm">
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
            
            {!isToday(selectedDate) && (
              <button
                onClick={goToToday}
                className="btn-secondary text-sm"
              >
                Today
              </button>
            )}
          </div>
        </div>
      )}

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
            <form onSubmit={(e) => { e.preventDefault(); saveProfile(); }} className="space-y-6">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      value={profileForm.age}
                      onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })}
                      placeholder="Enter your age"
                      className="input"
                      min="1"
                      max="120"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Height (cm)
                    </label>
                    <input
                      type="number"
                      value={profileForm.height}
                      onChange={(e) => setProfileForm({ ...profileForm, height: e.target.value })}
                      placeholder="Enter your height"
                      className="input"
                      min="100"
                      max="250"
                      step="0.1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Activity Level
                    </label>
                    <select
                      value={profileForm.activity_level}
                      onChange={(e) => setProfileForm({ ...profileForm, activity_level: e.target.value })}
                      className="input"
                    >
                      <option value="sedentary">Sedentary (little/no exercise)</option>
                      <option value="light">Light (light exercise 1-3 days/week)</option>
                      <option value="moderate">Moderate (moderate exercise 3-5 days/week)</option>
                      <option value="active">Active (hard exercise 6-7 days/week)</option>
                      <option value="very_active">Very Active (very hard exercise, physical job)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                  </label>
                  <textarea
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    rows={3}
                    className="textarea"
                  />
                </div>
              </div>

              {/* Targets */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Fitness Targets
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Weight (kg)
                    </label>
                    <input
                      type="number"
                      value={profileForm.target_weight}
                      onChange={(e) => setProfileForm({ ...profileForm, target_weight: e.target.value })}
                      placeholder="Enter target weight"
                      className="input"
                      min="30"
                      max="200"
                      step="0.1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Calories/Day
                    </label>
                    <input
                      type="number"
                      value={profileForm.target_calories}
                      onChange={(e) => setProfileForm({ ...profileForm, target_calories: e.target.value })}
                      placeholder="Enter target calories"
                      className="input"
                      min="1000"
                      max="5000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Workouts/Week
                    </label>
                    <input
                      type="number"
                      value={profileForm.target_workouts_per_week}
                      onChange={(e) => setProfileForm({ ...profileForm, target_workouts_per_week: e.target.value })}
                      placeholder="Enter target workouts"
                      className="input"
                      min="1"
                      max="14"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Changes'}
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
                  <p className="text-gray-600 text-sm">
                    {profile?.bio || 'No bio available'}
                  </p>
                </div>
              </div>

              {/* Basic Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="stat-card">
                  <div className="stat-value text-blue-600">{profile?.age || 'N/A'}</div>
                  <div className="stat-label">Age</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value text-green-600">{profile?.height || 'N/A'}</div>
                  <div className="stat-label">Height (cm)</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value text-purple-600">{profile?.target_weight || 'N/A'}</div>
                  <div className="stat-label">Target Weight</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value text-orange-600">{profile?.target_calories || 'N/A'}</div>
                  <div className="stat-label">Target Calories</div>
                </div>
              </div>

              {/* Activity Level */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Activity Level</h4>
                <p className="text-gray-600 text-sm capitalize">
                  {profile?.activity_level?.replace('_', ' ') || 'Not set'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress Tab */}
      {activeTab === 'progress' && (
        <div className="space-y-6">
          {/* Current Stats */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h2 className="card-title">Current Progress</h2>
              <button
                onClick={() => setShowWeightForm(true)}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Weight
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="stat-card">
                <div className="stat-value text-blue-600">{currentWeight || 'N/A'}</div>
                <div className="stat-label">Current Weight (kg)</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-green-600">{profile?.target_weight || 'N/A'}</div>
                <div className="stat-label">Target Weight (kg)</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-purple-600">
                  {currentWeight && profile?.target_weight 
                    ? Math.abs(currentWeight - profile.target_weight).toFixed(1)
                    : 'N/A'
                  }
                </div>
                <div className="stat-label">Difference (kg)</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-orange-600">{weightEntries.length}</div>
                <div className="stat-label">Total Entries</div>
              </div>
            </div>
          </div>

          {/* Weight Chart */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h3 className="card-title">Weight Progress</h3>
            </div>
            
            {weightEntries.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightEntries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      domain={['dataMin - 2', 'dataMax + 2']}
                    />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), 'MMMM dd, yyyy')}
                      formatter={(value: any) => [`${value} kg`, 'Weight']}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No weight data yet. Add your first entry!</p>
              </div>
            )}
          </div>

          {/* Weight Form Modal */}
          {showWeightForm && (
            <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Add Weight Entry</h3>
                    <button
                      onClick={() => setShowWeightForm(false)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={addWeightEntry} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Weight (kg) *
                      </label>
                      <input
                        type="number"
                        value={weightForm.weight}
                        onChange={(e) => setWeightForm({ ...weightForm, weight: e.target.value })}
                        placeholder="Enter your weight"
                        className="input"
                        required
                        min="30"
                        max="200"
                        step="0.1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Body Fat % (optional)
                      </label>
                      <input
                        type="number"
                        value={weightForm.body_fat}
                        onChange={(e) => setWeightForm({ ...weightForm, body_fat: e.target.value })}
                        placeholder="Enter body fat percentage"
                        className="input"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        type="submit"
                        className="flex-1 btn-primary"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save Entry
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
        </div>
      )}

      {/* Calories Tab */}
      {activeTab === 'calories' && (
        <div className="space-y-6">
          {/* Calorie Summary */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h2 className="card-title">Calorie Intake</h2>
              <button
                onClick={() => setShowCalorieForm(true)}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Food
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="stat-card">
                <div className="stat-value text-blue-600">{totalCalories}</div>
                <div className="stat-label">Total Calories</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-green-600">{profile?.target_calories || 'N/A'}</div>
                <div className="stat-label">Target Calories</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-purple-600">
                  {profile?.target_calories 
                    ? Math.abs(totalCalories - profile.target_calories)
                    : 'N/A'
                  }
                </div>
                <div className="stat-label">Difference</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-orange-600">{calorieEntries.length}</div>
                <div className="stat-label">Food Items</div>
              </div>
            </div>

            {/* Calorie Entries List */}
            <div className="space-y-3">
              {calorieEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Utensils className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No food entries for {format(selectedDate, 'MMMM d')}</p>
                </div>
              ) : (
                calorieEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Utensils className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{entry.food_name}</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="badge badge-info">{entry.category}</span>
                            <span>{entry.calories} kcal</span>
                            {entry.description && <span>{entry.description}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteCalorieEntry(entry.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add Calorie Form Modal */}
          {showCalorieForm && (
            <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Add Food Entry</h3>
                    <button
                      onClick={() => setShowCalorieForm(false)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={addCalorieEntry} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Food Name *
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

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Calories *
                        </label>
                        <input
                          type="number"
                          value={calorieForm.calories}
                          onChange={(e) => setCalorieForm({ ...calorieForm, calories: e.target.value })}
                          placeholder="Enter calories"
                          className="input"
                          required
                          min="1"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Category *
                        </label>
                        <select
                          value={calorieForm.category}
                          onChange={(e) => setCalorieForm({ ...calorieForm, category: e.target.value as CalorieEntry['category'] })}
                          className="input"
                          required
                        >
                          <option value="breakfast">Breakfast</option>
                          <option value="lunch">Lunch</option>
                          <option value="dinner">Dinner</option>
                          <option value="snack">Snack</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={calorieForm.description}
                        onChange={(e) => setCalorieForm({ ...calorieForm, description: e.target.value })}
                        placeholder="Optional description"
                        className="input"
                      />
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        type="submit"
                        className="flex-1 btn-primary"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Add Food
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
        </div>
      )}

      {/* Workouts Tab */}
      {activeTab === 'workouts' && (
        <div className="space-y-6">
          {/* Workout Summary */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h2 className="card-title">Workouts</h2>
              <button
                onClick={() => setShowWorkoutForm(true)}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Workout
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="stat-card">
                <div className="stat-value text-blue-600">{workoutEntries.length}</div>
                <div className="stat-label">Workouts Today</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-green-600">{totalCaloriesBurned}</div>
                <div className="stat-label">Calories Burned</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-purple-600">
                  {workoutEntries.filter(w => w.type === 'duration').length}
                </div>
                <div className="stat-label">Duration Based</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-orange-600">
                  {workoutEntries.filter(w => w.type === 'reps').length}
                </div>
                <div className="stat-label">Rep Based</div>
              </div>
            </div>

            {/* Workout Entries List */}
            <div className="space-y-3">
              {workoutEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No workouts for {format(selectedDate, 'MMMM d')}</p>
                </div>
              ) : (
                workoutEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <Activity className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{entry.exercise_name}</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="badge badge-success">{entry.type}</span>
                            {entry.type === 'duration' && entry.duration_minutes && (
                              <span>{entry.duration_minutes} minutes</span>
                            )}
                            {entry.type === 'reps' && entry.repetitions && (
                              <span>{entry.repetitions}x</span>
                            )}
                            <span>{entry.calories_burned} kcal burned</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteWorkoutEntry(entry.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add Workout Form Modal */}
          {showWorkoutForm && (
            <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Add Workout</h3>
                    <button
                      onClick={() => setShowWorkoutForm(false)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={addWorkoutEntry} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Exercise Name *
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

                    {/* Workout Type Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Workout Type *
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={workoutForm.useDuration}
                            onChange={(e) => {
                              setWorkoutForm({ 
                                ...workoutForm, 
                                useDuration: e.target.checked,
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
                            checked={workoutForm.useReps}
                            onChange={(e) => {
                              setWorkoutForm({ 
                                ...workoutForm, 
                                useReps: e.target.checked,
                                type: e.target.checked ? 'reps' : 'duration'
                              });
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Repetitions</span>
                        </label>
                      </div>
                    </div>

                    {/* Duration Input */}
                    {workoutForm.useDuration && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Duration (minutes) *
                        </label>
                        <input
                          type="number"
                          value={workoutForm.duration_minutes}
                          onChange={(e) => setWorkoutForm({ ...workoutForm, duration_minutes: e.target.value })}
                          placeholder="Enter duration"
                          className="input"
                          required={workoutForm.useDuration}
                          min="1"
                        />
                      </div>
                    )}

                    {/* Repetitions Input */}
                    {workoutForm.useReps && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Repetitions *
                        </label>
                        <input
                          type="number"
                          value={workoutForm.repetitions}
                          onChange={(e) => setWorkoutForm({ ...workoutForm, repetitions: e.target.value })}
                          placeholder="Enter repetitions"
                          className="input"
                          required={workoutForm.useReps}
                          min="1"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Calories Burned *
                      </label>
                      <input
                        type="number"
                        value={workoutForm.calories_burned}
                        onChange={(e) => setWorkoutForm({ ...workoutForm, calories_burned: e.target.value })}
                        placeholder="Enter calories burned"
                        className="input"
                        required
                        min="1"
                      />
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        type="submit"
                        className="flex-1 btn-primary"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Add Workout
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
        </div>
      )}

      {/* Sleep Tab */}
      {activeTab === 'sleep' && (
        <div className="space-y-6">
          {/* Sleep Summary */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h2 className="card-title">Sleep Tracker</h2>
              <button
                onClick={() => setShowSleepForm(true)}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Sleep
              </button>
            </div>

            {todaySleep ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="stat-card">
                    <div className="stat-value text-blue-600">{todaySleep.sleep_time}</div>
                    <div className="stat-label">Sleep Time</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value text-green-600">{todaySleep.wake_time}</div>
                    <div className="stat-label">Wake Time</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value text-purple-600">{todaySleep.duration_hours}h</div>
                    <div className="stat-label">Duration</div>
                  </div>
                  <div className="stat-card">
                    <div className={`stat-value ${
                      todaySleep.duration_hours >= 7 ? 'text-green-600' : 
                      todaySleep.duration_hours >= 6 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {todaySleep.duration_hours >= 7 ? 'Good' : 
                       todaySleep.duration_hours >= 6 ? 'Fair' : 'Poor'}
                    </div>
                    <div className="stat-label">Quality</div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Moon className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        Sleep Entry for {format(selectedDate, 'MMMM d')}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Slept from {todaySleep.sleep_time} to {todaySleep.wake_time} ({todaySleep.duration_hours} hours)
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteSleepEntry(todaySleep.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Moon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No sleep data for {format(selectedDate, 'MMMM d')}</p>
              </div>
            )}
          </div>

          {/* Add Sleep Form Modal */}
          {showSleepForm && (
            <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Add Sleep Entry</h3>
                    <button
                      onClick={() => setShowSleepForm(false)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={addSleepEntry} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sleep Time *
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
                        Wake Time *
                      </label>
                      <input
                        type="time"
                        value={sleepForm.wake_time}
                        onChange={(e) => setSleepForm({ ...sleepForm, wake_time: e.target.value })}
                        className="input"
                        required
                      />
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        type="submit"
                        className="flex-1 btn-primary"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Add Sleep
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
      )}
    </div>
  );
};

export default BodyTracker;