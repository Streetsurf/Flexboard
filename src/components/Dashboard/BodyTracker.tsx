import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  User, 
  Target, 
  Utensils, 
  Dumbbell, 
  Moon, 
  TrendingUp,
  Plus,
  Edit2,
  Save,
  X,
  Upload,
  Calculator,
  Activity,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { format, addDays, subDays, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import BodyTrackerDashboard from './BodyTrackerDashboard';

interface UserProfile {
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

type FitnessGoal = 'cutting' | 'bulking' | 'maintenance';

const BodyTracker: React.FC = () => {
  const { user } = useAuth();
  const [activeDate, setActiveDate] = useState(new Date());
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'progress' | 'calories' | 'workout' | 'sleep'>('dashboard');
  
  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<Partial<UserProfile>>({});
  
  // Data states
  const [calorieEntries, setCalorieEntries] = useState<CalorieEntry[]>([]);
  const [workoutEntries, setWorkoutEntries] = useState<WorkoutEntry[]>([]);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [sleepEntries, setSleepEntries] = useState<SleepEntry[]>([]);
  
  // Form states
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
  
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal>('maintenance');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const activeDateStr = format(activeDate, 'yyyy-MM-dd');

  // Fetch profile data
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
        setProfileForm(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }, [user?.id]);

  // Fetch all data for active date
  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Fetch calories
      const { data: calories } = await supabase
        .from('calorie_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', activeDateStr)
        .order('created_at', { ascending: true });
      
      // Fetch workouts
      const { data: workouts } = await supabase
        .from('workout_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', activeDateStr)
        .order('created_at', { ascending: true });
      
      // Fetch weight (latest entry for the date)
      const { data: weights } = await supabase
        .from('weight_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', activeDateStr)
        .order('created_at', { ascending: false })
        .limit(1);
      
      // Fetch sleep
      const { data: sleep } = await supabase
        .from('sleep_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', activeDateStr)
        .order('created_at', { ascending: false })
        .limit(1);
      
      setCalorieEntries(calories || []);
      setWorkoutEntries(workouts || []);
      setWeightEntries(weights || []);
      setSleepEntries(sleep || []);
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, activeDateStr]);

  // Fetch weight progress data for chart
  const fetchWeightProgress = useCallback(async () => {
    if (!user?.id) return [];
    
    try {
      const startDate = subDays(new Date(), 30);
      const { data } = await supabase
        .from('weight_entries')
        .select('weight, date')
        .eq('user_id', user.id)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .order('date', { ascending: true });
      
      return data || [];
    } catch (error) {
      console.error('Error fetching weight progress:', error);
      return [];
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchData();
    }
  }, [user, fetchProfile, fetchData]);

  // BMR Calculation using Mifflin-St Jeor equation
  const calculateBMR = useCallback(() => {
    if (!profile?.age || !profile?.height || !weightEntries[0]?.weight) return 0;
    
    const weight = weightEntries[0].weight;
    const height = profile.height;
    const age = profile.age;
    
    if (profile.gender === 'male') {
      return (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
      return (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }
  }, [profile, weightEntries]);

  // TDEE Calculation
  const calculateTDEE = useCallback(() => {
    const bmr = calculateBMR();
    if (!bmr || !profile?.activity_level) return 0;
    
    const activityFactors = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extremely_active: 1.9
    };
    
    return bmr * activityFactors[profile.activity_level];
  }, [calculateBMR, profile?.activity_level]);

  // Daily calorie goal based on fitness goal
  const calculateDailyCalorieGoal = useCallback(() => {
    const tdee = calculateTDEE();
    if (!tdee) return 0;
    
    switch (fitnessGoal) {
      case 'cutting':
        return tdee - 500;
      case 'bulking':
        return tdee + 300;
      case 'maintenance':
      default:
        return tdee;
    }
  }, [calculateTDEE, fitnessGoal]);

  // Save profile
  const saveProfile = async () => {
    if (!user?.id) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...profileForm,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      setProfile({ ...profile, ...profileForm } as UserProfile);
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  // Add calorie entry
  const addCalorieEntry = async () => {
    if (!user?.id || !calorieForm.food_name || !calorieForm.calories) return;
    
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('calorie_entries')
        .insert([{
          food_name: calorieForm.food_name,
          calories: parseInt(calorieForm.calories),
          category: calorieForm.category,
          description: calorieForm.description,
          date: activeDateStr,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;
      
      setCalorieEntries([...calorieEntries, data]);
      setCalorieForm({ food_name: '', calories: '', category: 'breakfast', description: '' });
    } catch (error) {
      console.error('Error adding calorie entry:', error);
    } finally {
      setSaving(false);
    }
  };

  // Add workout entry
  const addWorkoutEntry = async () => {
    if (!user?.id || !workoutForm.exercise_name || !workoutForm.calories_burned) return;
    
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('workout_entries')
        .insert([{
          exercise_name: workoutForm.exercise_name,
          type: workoutForm.type,
          duration_minutes: workoutForm.duration_minutes ? parseInt(workoutForm.duration_minutes) : null,
          repetitions: workoutForm.repetitions ? parseInt(workoutForm.repetitions) : null,
          calories_burned: parseInt(workoutForm.calories_burned),
          date: activeDateStr,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;
      
      setWorkoutEntries([...workoutEntries, data]);
      setWorkoutForm({ exercise_name: '', type: 'duration', duration_minutes: '', repetitions: '', calories_burned: '' });
    } catch (error) {
      console.error('Error adding workout entry:', error);
    } finally {
      setSaving(false);
    }
  };

  // Add weight entry
  const addWeightEntry = async () => {
    if (!user?.id || !weightForm.weight) return;
    
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('weight_entries')
        .upsert([{
          weight: parseFloat(weightForm.weight),
          body_fat: weightForm.body_fat ? parseFloat(weightForm.body_fat) : null,
          date: activeDateStr,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;
      
      setWeightEntries([data]);
      setWeightForm({ weight: '', body_fat: '' });
    } catch (error) {
      console.error('Error adding weight entry:', error);
    } finally {
      setSaving(false);
    }
  };

  // Add sleep entry
  const addSleepEntry = async () => {
    if (!user?.id || !sleepForm.sleep_time || !sleepForm.wake_time) return;
    
    setSaving(true);
    try {
      // Calculate duration
      const sleepTime = new Date(`2000-01-01T${sleepForm.sleep_time}:00`);
      const wakeTime = new Date(`2000-01-01T${sleepForm.wake_time}:00`);
      
      let duration = (wakeTime.getTime() - sleepTime.getTime()) / (1000 * 60 * 60);
      if (duration < 0) duration += 24; // Handle overnight sleep
      
      const { data, error } = await supabase
        .from('sleep_entries')
        .upsert([{
          sleep_time: sleepForm.sleep_time,
          wake_time: sleepForm.wake_time,
          duration_hours: duration,
          date: activeDateStr,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;
      
      setSleepEntries([data]);
      setSleepForm({ sleep_time: '', wake_time: '' });
    } catch (error) {
      console.error('Error adding sleep entry:', error);
    } finally {
      setSaving(false);
    }
  };

  // Delete entry functions
  const deleteCalorieEntry = async (id: string) => {
    try {
      await supabase.from('calorie_entries').delete().eq('id', id);
      setCalorieEntries(calorieEntries.filter(entry => entry.id !== id));
    } catch (error) {
      console.error('Error deleting calorie entry:', error);
    }
  };

  const deleteWorkoutEntry = async (id: string) => {
    try {
      await supabase.from('workout_entries').delete().eq('id', id);
      setWorkoutEntries(workoutEntries.filter(entry => entry.id !== id));
    } catch (error) {
      console.error('Error deleting workout entry:', error);
    }
  };

  // Calculate totals
  const totalCaloriesIn = calorieEntries.reduce((sum, entry) => sum + entry.calories, 0);
  const totalCaloriesOut = workoutEntries.reduce((sum, entry) => sum + entry.calories_burned, 0);
  const dailyCalorieGoal = calculateDailyCalorieGoal();
  const bmr = calculateBMR();
  const tdee = calculateTDEE();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="card animate-fadeIn">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[...Array(3)].map((_, i) => (
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
      {/* Header with Date Selection */}
      <div className="card animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Body Tracker</h1>
          </div>
          
          {/* Date Navigation */}
          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
            <button
              onClick={() => setActiveDate(subDays(activeDate, 1))}
              className="btn-icon-secondary"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg">
              <Calendar className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-900 text-sm">
                {format(activeDate, 'EEEE, dd MMMM yyyy', { locale: localeId })}
              </span>
            </div>
            
            <button
              onClick={() => setActiveDate(addDays(activeDate, 1))}
              className="btn-icon-secondary"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setActiveDate(new Date())}
              className="btn-secondary text-sm"
            >
              Today
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-6">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
              { id: 'profile', label: 'Profile', icon: User },
              { id: 'progress', label: 'Progress', icon: Target },
              { id: 'calories', label: 'Calories', icon: Utensils },
              { id: 'workout', label: 'Workout', icon: Dumbbell },
              { id: 'sleep', label: 'Sleep', icon: Moon }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
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
            <h2 className="card-title">User Profile</h2>
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
            <div className="space-y-6">
              {/* Profile Picture */}
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                  {profileForm.avatar_url ? (
                    <img src={profileForm.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Picture URL
                  </label>
                  <input
                    type="url"
                    value={profileForm.avatar_url || ''}
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
                    value={profileForm.full_name || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                    placeholder="Enter your full name"
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
                    value={profileForm.age || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, age: parseInt(e.target.value) || undefined })}
                    placeholder="Enter your age"
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender
                  </label>
                  <select
                    value={profileForm.gender || 'male'}
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
                    value={profileForm.height || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, height: parseFloat(e.target.value) || undefined })}
                    placeholder="Enter your height in cm"
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Activity Level
                  </label>
                  <select
                    value={profileForm.activity_level || 'moderately_active'}
                    onChange={(e) => setProfileForm({ ...profileForm, activity_level: e.target.value as UserProfile['activity_level'] })}
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
                    value={profileForm.target_weight || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, target_weight: parseFloat(e.target.value) || undefined })}
                    placeholder="Enter your target weight"
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
                    value={profileForm.target_workouts_per_week || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, target_workouts_per_week: parseInt(e.target.value) || undefined })}
                    placeholder="Enter target workouts per week"
                    className="input"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
                <button
                  onClick={() => {
                    setIsEditingProfile(false);
                    setProfileForm(profile || {});
                  }}
                  className="btn-secondary"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Profile Display */}
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {profile?.full_name || 'No name set'}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {profile?.age ? `${profile.age} years old` : 'Age not set'} • {profile?.gender || 'Gender not set'}
                  </p>
                </div>
              </div>

              {/* Profile Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="stat-card">
                  <div className="stat-value text-blue-600">{profile?.height || 0}</div>
                  <div className="stat-label">Height (cm)</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value text-green-600">{weightEntries[0]?.weight || 0}</div>
                  <div className="stat-label">Current Weight (kg)</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value text-purple-600">{profile?.target_weight || 0}</div>
                  <div className="stat-label">Target Weight (kg)</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value text-orange-600">{profile?.target_workouts_per_week || 0}</div>
                  <div className="stat-label">Weekly Workouts</div>
                </div>
              </div>

              {/* BMR & TDEE Calculations */}
              {bmr > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-center space-x-2 mb-3">
                    <Calculator className="w-5 h-5 text-blue-600" />
                    <h3 className="font-medium text-blue-900">Metabolic Calculations</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{Math.round(bmr)}</div>
                      <div className="text-sm text-blue-700">BMR (kcal/day)</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{Math.round(tdee)}</div>
                      <div className="text-sm text-blue-700">TDEE (kcal/day)</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{Math.round(dailyCalorieGoal)}</div>
                      <div className="text-sm text-blue-700">Daily Goal (kcal)</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Progress Tab */}
      {activeTab === 'progress' && (
        <div className="space-y-6">
          {/* Fitness Goals */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h2 className="card-title">Fitness Goals</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { id: 'cutting', label: 'Cutting', desc: 'Lose weight (-500 kcal)', color: 'red' },
                { id: 'maintenance', label: 'Maintenance', desc: 'Maintain weight (TDEE)', color: 'blue' },
                { id: 'bulking', label: 'Bulking', desc: 'Gain weight (+300 kcal)', color: 'green' }
              ].map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => setFitnessGoal(goal.id as FitnessGoal)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                    fitnessGoal === goal.id
                      ? `border-${goal.color}-500 bg-${goal.color}-50`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h3 className={`font-medium mb-1 ${
                    fitnessGoal === goal.id ? `text-${goal.color}-900` : 'text-gray-900'
                  }`}>
                    {goal.label}
                  </h3>
                  <p className={`text-sm ${
                    fitnessGoal === goal.id ? `text-${goal.color}-700` : 'text-gray-600'
                  }`}>
                    {goal.desc}
                  </p>
                </button>
              ))}
            </div>

            {/* Current Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="stat-card">
                <div className="stat-value text-blue-600">{totalCaloriesIn}</div>
                <div className="stat-label">Calories In</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-red-600">{totalCaloriesOut}</div>
                <div className="stat-label">Calories Out</div>
              </div>
              <div className="stat-card">
                <div className={`stat-value ${totalCaloriesIn - totalCaloriesOut > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {totalCaloriesIn - totalCaloriesOut > 0 ? '+' : ''}{totalCaloriesIn - totalCaloriesOut}
                </div>
                <div className="stat-label">Net Calories</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-purple-600">{Math.round(dailyCalorieGoal)}</div>
                <div className="stat-label">Daily Goal</div>
              </div>
            </div>
          </div>

          {/* Weight Progress Chart */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h2 className="card-title">Weight Progress</h2>
            </div>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightEntries.map(entry => ({
                  date: format(new Date(entry.date), 'MMM dd'),
                  weight: entry.weight
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Calories Tab */}
      {activeTab === 'calories' && (
        <div className="space-y-6">
          {/* Add Calorie Entry */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h2 className="card-title">Add Calorie Entry</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Food Name
                </label>
                <input
                  type="text"
                  value={calorieForm.food_name}
                  onChange={(e) => setCalorieForm({ ...calorieForm, food_name: e.target.value })}
                  placeholder="Enter food name"
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Calories (kcal)
                </label>
                <input
                  type="number"
                  min="1"
                  value={calorieForm.calories}
                  onChange={(e) => setCalorieForm({ ...calorieForm, calories: e.target.value })}
                  placeholder="Enter calories"
                  className="input"
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
            </div>
            
            <button
              onClick={addCalorieEntry}
              disabled={saving || !calorieForm.food_name || !calorieForm.calories}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 mr-2" />
              {saving ? 'Adding...' : 'Add Entry'}
            </button>
          </div>

          {/* Calorie Entries List */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h2 className="card-title">Today's Entries</h2>
              <div className="text-sm text-gray-600">
                Total: {totalCaloriesIn} kcal
              </div>
            </div>
            
            <div className="space-y-3">
              {calorieEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Utensils className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No calorie entries for today</p>
                </div>
              ) : (
                calorieEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">{entry.food_name}</h3>
                        <span className="badge badge-gray">{entry.category}</span>
                      </div>
                      {entry.description && (
                        <p className="text-sm text-gray-600 mt-1">{entry.description}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-medium text-gray-900">{entry.calories} kcal</span>
                      <button
                        onClick={() => deleteCalorieEntry(entry.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
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
        <div className="space-y-6">
          {/* Add Workout Entry */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h2 className="card-title">Add Workout Entry</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exercise Name
                </label>
                <input
                  type="text"
                  value={workoutForm.exercise_name}
                  onChange={(e) => setWorkoutForm({ ...workoutForm, exercise_name: e.target.value })}
                  placeholder="Enter exercise name"
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={workoutForm.type}
                  onChange={(e) => setWorkoutForm({ ...workoutForm, type: e.target.value as WorkoutEntry['type'] })}
                  className="input"
                >
                  <option value="duration">Duration</option>
                  <option value="reps">Repetitions</option>
                </select>
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
                    placeholder="Enter duration"
                    className="input"
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
                    placeholder="Enter repetitions"
                    className="input"
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
                  placeholder="Enter calories burned"
                  className="input"
                />
              </div>
            </div>
            
            <button
              onClick={addWorkoutEntry}
              disabled={saving || !workoutForm.exercise_name || !workoutForm.calories_burned}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 mr-2" />
              {saving ? 'Adding...' : 'Add Workout'}
            </button>
          </div>

          {/* Workout Entries List */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h2 className="card-title">Today's Workouts</h2>
              <div className="text-sm text-gray-600">
                Total: {totalCaloriesOut} kcal burned
              </div>
            </div>
            
            <div className="space-y-3">
              {workoutEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Dumbbell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No workout entries for today</p>
                </div>
              ) : (
                workoutEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{entry.exercise_name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="badge badge-blue">{entry.type}</span>
                        {entry.type === 'duration' && entry.duration_minutes && (
                          <span className="text-sm text-gray-600">{entry.duration_minutes} min</span>
                        )}
                        {entry.type === 'reps' && entry.repetitions && (
                          <span className="text-sm text-gray-600">{entry.repetitions}x</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-medium text-gray-900">{entry.calories_burned} kcal</span>
                      <button
                        onClick={() => deleteWorkoutEntry(entry.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
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
          {/* Add Sleep Entry */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h2 className="card-title">Sleep Tracker</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sleep Start Time
                </label>
                <input
                  type="time"
                  value={sleepForm.sleep_time}
                  onChange={(e) => setSleepForm({ ...sleepForm, sleep_time: e.target.value })}
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wake Up Time
                </label>
                <input
                  type="time"
                  value={sleepForm.wake_time}
                  onChange={(e) => setSleepForm({ ...sleepForm, wake_time: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            
            <button
              onClick={addSleepEntry}
              disabled={saving || !sleepForm.sleep_time || !sleepForm.wake_time}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 mr-2" />
              {saving ? 'Adding...' : 'Add Sleep Entry'}
            </button>
          </div>

          {/* Sleep Entry Display */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h2 className="card-title">Today's Sleep</h2>
            </div>
            
            {sleepEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Moon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No sleep entry for today</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sleepEntries.map((entry) => (
                  <div key={entry.id} className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{entry.sleep_time}</div>
                        <div className="text-sm text-blue-700">Sleep Time</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{entry.wake_time}</div>
                        <div className="text-sm text-blue-700">Wake Time</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{entry.duration_hours.toFixed(1)}h</div>
                        <div className="text-sm text-blue-700">Duration</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BodyTracker;