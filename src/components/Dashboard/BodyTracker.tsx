import React, { useState, useEffect } from 'react';
import { Dumbbell, Plus, X, Save, Calendar, TrendingUp, Target, Activity, Moon, Utensils, Scale, User, Edit2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
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

interface UserProfile {
  id: string;
  age?: number;
  height?: number;
  activity_level?: string;
  target_weight?: number;
  target_calories?: number;
  target_workouts_per_week?: number;
  gender?: string;
}

const BodyTracker: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'calories' | 'workouts' | 'weight' | 'sleep' | 'profile'>('overview');
  const [calorieEntries, setCalorieEntries] = useState<CalorieEntry[]>([]);
  const [workoutEntries, setWorkoutEntries] = useState<WorkoutEntry[]>([]);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [sleepEntries, setSleepEntries] = useState<SleepEntry[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState<'calorie' | 'workout' | 'weight' | 'sleep'>('calorie');
  const [saving, setSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const { user } = useAuth();

  // Form states
  const [calorieForm, setCalorieForm] = useState({
    food_name: '',
    calories: '',
    category: 'breakfast' as CalorieEntry['category'],
    description: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const [workoutForm, setWorkoutForm] = useState({
    exercise_name: '',
    type: 'duration' as WorkoutEntry['type'],
    duration_minutes: '',
    repetitions: '',
    calories_burned: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const [weightForm, setWeightForm] = useState({
    weight: '',
    body_fat: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const [sleepForm, setSleepForm] = useState({
    sleep_time: '',
    wake_time: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const [profileForm, setProfileForm] = useState({
    age: '',
    height: '',
    activity_level: 'moderately_active',
    target_weight: '',
    target_calories: '',
    target_workouts_per_week: '3',
    gender: 'male'
  });

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCalorieEntries(),
        fetchWorkoutEntries(),
        fetchWeightEntries(),
        fetchSleepEntries(),
        fetchProfile()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCalorieEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('calorie_entries')
        .select('*')
        .eq('user_id', user?.id)
        .order('date', { ascending: false })
        .limit(30);

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
        .order('date', { ascending: false })
        .limit(30);

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
        .order('date', { ascending: false })
        .limit(30);

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
        .order('date', { ascending: false })
        .limit(30);

      if (error) throw error;
      setSleepEntries(data || []);
    } catch (error) {
      console.error('Error fetching sleep entries:', error);
    }
  };

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
          height: data.height?.toString() || '',
          activity_level: data.activity_level || 'moderately_active',
          target_weight: data.target_weight?.toString() || '',
          target_calories: data.target_calories?.toString() || '',
          target_workouts_per_week: data.target_workouts_per_week?.toString() || '3',
          gender: data.gender || 'male'
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleAddEntry = (type: 'calorie' | 'workout' | 'weight' | 'sleep') => {
    setModalType(type);
    setShowAddModal(true);
  };

  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      switch (modalType) {
        case 'calorie':
          await handleCalorieSubmit();
          break;
        case 'workout':
          await handleWorkoutSubmit();
          break;
        case 'weight':
          await handleWeightSubmit();
          break;
        case 'sleep':
          await handleSleepSubmit();
          break;
      }
      
      setShowAddModal(false);
      resetForms();
    } catch (error) {
      console.error('Error submitting entry:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCalorieSubmit = async () => {
    const { data, error } = await supabase
      .from('calorie_entries')
      .insert([{
        food_name: calorieForm.food_name,
        calories: parseInt(calorieForm.calories),
        category: calorieForm.category,
        description: calorieForm.description,
        date: calorieForm.date,
        user_id: user?.id
      }])
      .select()
      .single();

    if (error) throw error;
    setCalorieEntries(prev => [data, ...prev]);
  };

  const handleWorkoutSubmit = async () => {
    const { data, error } = await supabase
      .from('workout_entries')
      .insert([{
        exercise_name: workoutForm.exercise_name,
        type: workoutForm.type,
        duration_minutes: workoutForm.type === 'duration' ? parseInt(workoutForm.duration_minutes) : null,
        repetitions: workoutForm.type === 'reps' ? parseInt(workoutForm.repetitions) : null,
        calories_burned: parseInt(workoutForm.calories_burned),
        date: workoutForm.date,
        user_id: user?.id
      }])
      .select()
      .single();

    if (error) throw error;
    setWorkoutEntries(prev => [data, ...prev]);
  };

  const handleWeightSubmit = async () => {
    const { data, error } = await supabase
      .from('weight_entries')
      .upsert([{
        weight: parseFloat(weightForm.weight),
        body_fat: weightForm.body_fat ? parseFloat(weightForm.body_fat) : null,
        date: weightForm.date,
        user_id: user?.id
      }])
      .select()
      .single();

    if (error) throw error;
    setWeightEntries(prev => {
      const filtered = prev.filter(entry => entry.date !== weightForm.date);
      return [data, ...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
  };

  const handleSleepSubmit = async () => {
    const sleepTime = new Date(`2000-01-01T${sleepForm.sleep_time}`);
    const wakeTime = new Date(`2000-01-01T${sleepForm.wake_time}`);
    
    let duration = (wakeTime.getTime() - sleepTime.getTime()) / (1000 * 60 * 60);
    if (duration < 0) duration += 24;

    const { data, error } = await supabase
      .from('sleep_entries')
      .upsert([{
        sleep_time: sleepForm.sleep_time,
        wake_time: sleepForm.wake_time,
        duration_hours: Math.round(duration * 100) / 100,
        date: sleepForm.date,
        user_id: user?.id
      }])
      .select()
      .single();

    if (error) throw error;
    setSleepEntries(prev => {
      const filtered = prev.filter(entry => entry.date !== sleepForm.date);
      return [data, ...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert([{
          id: user?.id,
          age: profileForm.age ? parseInt(profileForm.age) : null,
          height: profileForm.height ? parseFloat(profileForm.height) : null,
          activity_level: profileForm.activity_level,
          target_weight: profileForm.target_weight ? parseFloat(profileForm.target_weight) : null,
          target_calories: profileForm.target_calories ? parseInt(profileForm.target_calories) : null,
          target_workouts_per_week: profileForm.target_workouts_per_week ? parseInt(profileForm.target_workouts_per_week) : null,
          gender: profileForm.gender
        }])
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

  const resetForms = () => {
    setCalorieForm({
      food_name: '',
      calories: '',
      category: 'breakfast',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd')
    });
    setWorkoutForm({
      exercise_name: '',
      type: 'duration',
      duration_minutes: '',
      repetitions: '',
      calories_burned: '',
      date: format(new Date(), 'yyyy-MM-dd')
    });
    setWeightForm({
      weight: '',
      body_fat: '',
      date: format(new Date(), 'yyyy-MM-dd')
    });
    setSleepForm({
      sleep_time: '',
      wake_time: '',
      date: format(new Date(), 'yyyy-MM-dd')
    });
  };

  const getWeeklyStats = () => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

    const weeklyCalories = calorieEntries
      .filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= weekStart && entryDate <= weekEnd;
      })
      .reduce((sum, entry) => sum + entry.calories, 0);

    const weeklyWorkouts = workoutEntries
      .filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= weekStart && entryDate <= weekEnd;
      }).length;

    const weeklyCaloriesBurned = workoutEntries
      .filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= weekStart && entryDate <= weekEnd;
      })
      .reduce((sum, entry) => sum + entry.calories_burned, 0);

    const avgSleep = sleepEntries
      .filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= weekStart && entryDate <= weekEnd;
      })
      .reduce((sum, entry, _, arr) => sum + entry.duration_hours / arr.length, 0);

    return {
      weeklyCalories,
      weeklyWorkouts,
      weeklyCaloriesBurned,
      avgSleep: Math.round(avgSleep * 10) / 10
    };
  };

  const getChartData = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
      const calories = calorieEntries
        .filter(entry => entry.date === date)
        .reduce((sum, entry) => sum + entry.calories, 0);
      const caloriesBurned = workoutEntries
        .filter(entry => entry.date === date)
        .reduce((sum, entry) => sum + entry.calories_burned, 0);
      const weight = weightEntries.find(entry => entry.date === date)?.weight || null;
      const sleep = sleepEntries.find(entry => entry.date === date)?.duration_hours || null;

      return {
        date: format(new Date(date), 'MMM dd'),
        calories,
        caloriesBurned,
        weight,
        sleep
      };
    });

    return last7Days;
  };

  const getCurrentWeight = () => {
    if (weightEntries.length === 0) return null;
    return weightEntries[0].weight;
  };

  const stats = getWeeklyStats();
  const chartData = getChartData();

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
      {/* Breadcrumbs */}
      <nav className="text-sm text-gray-600">
        <span>Dashboard</span>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">Body Tracker</span>
      </nav>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'calories', label: 'Calories' },
            { id: 'workouts', label: 'Workouts' },
            { id: 'weight', label: 'Weight' },
            { id: 'sleep', label: 'Sleep' },
            { id: 'profile', label: 'Profile' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Header */}
          <div className="card animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Dumbbell className="w-4 h-4 text-white" />
                </div>
                <h2 className="card-title">Body Tracker Overview</h2>
              </div>
            </div>

            {/* Weekly Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{stats.weeklyCalories}</div>
                <div className="text-sm text-gray-600">Calories This Week</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">{stats.weeklyWorkouts}</div>
                <div className="text-sm text-gray-600">Workouts This Week</div>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="text-2xl font-bold text-orange-600">{stats.weeklyCaloriesBurned}</div>
                <div className="text-sm text-gray-600">Calories Burned</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-2xl font-bold text-purple-600">{stats.avgSleep || 0}h</div>
                <div className="text-sm text-gray-600">Avg Sleep</div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Calories Chart */}
              <div>
                <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                  <Utensils className="w-4 h-4 mr-2 text-green-600" />
                  Daily Calories (7 days)
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="calories" fill="#10b981" />
                      <Bar dataKey="caloriesBurned" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Weight Chart */}
              <div>
                <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                  <Scale className="w-4 h-4 mr-2 text-blue-600" />
                  Weight Progress (7 days)
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData.filter(d => d.weight)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Calories Tab */}
      {activeTab === 'calories' && (
        <div className="card animate-fadeIn">
          <div className="card-header">
            <h2 className="card-title">Calorie Tracking</h2>
            <button
              onClick={() => handleAddEntry('calorie')}
              className="btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Entry
            </button>
          </div>

          <div className="space-y-3">
            {calorieEntries.map((entry) => (
              <div key={entry.id} className="p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{entry.food_name}</h3>
                    <p className="text-sm text-gray-600">
                      {entry.calories} calories • {entry.category} • {format(new Date(entry.date), 'MMM dd, yyyy')}
                    </p>
                    {entry.description && (
                      <p className="text-sm text-gray-500 mt-1">{entry.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-semibold text-green-600">{entry.calories}</span>
                    <span className="text-sm text-gray-500 ml-1">cal</span>
                  </div>
                </div>
              </div>
            ))}
            
            {calorieEntries.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Utensils className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No calorie entries yet. Add your first entry above!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Workouts Tab */}
      {activeTab === 'workouts' && (
        <div className="card animate-fadeIn">
          <div className="card-header">
            <h2 className="card-title">Workout Tracking</h2>
            <button
              onClick={() => handleAddEntry('workout')}
              className="btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Workout
            </button>
          </div>

          <div className="space-y-3">
            {workoutEntries.map((entry) => (
              <div key={entry.id} className="p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{entry.exercise_name}</h3>
                    <p className="text-sm text-gray-600">
                      {entry.type === 'duration' 
                        ? `${entry.duration_minutes} minutes`
                        : `${entry.repetitions} reps`
                      } • {format(new Date(entry.date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-semibold text-orange-600">{entry.calories_burned}</span>
                    <span className="text-sm text-gray-500 ml-1">cal burned</span>
                  </div>
                </div>
              </div>
            ))}
            
            {workoutEntries.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No workout entries yet. Add your first workout above!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Weight Tab */}
      {activeTab === 'weight' && (
        <div className="card animate-fadeIn">
          <div className="card-header">
            <h2 className="card-title">Weight Tracking</h2>
            <button
              onClick={() => handleAddEntry('weight')}
              className="btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Entry
            </button>
          </div>

          <div className="space-y-3">
            {weightEntries.map((entry) => (
              <div key={entry.id} className="p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Weight Entry</h3>
                    <p className="text-sm text-gray-600">
                      {format(new Date(entry.date), 'MMM dd, yyyy')}
                      {entry.body_fat && ` • ${entry.body_fat}% body fat`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-semibold text-blue-600">{entry.weight}</span>
                    <span className="text-sm text-gray-500 ml-1">kg</span>
                  </div>
                </div>
              </div>
            ))}
            
            {weightEntries.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Scale className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No weight entries yet. Add your first entry above!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sleep Tab */}
      {activeTab === 'sleep' && (
        <div className="card animate-fadeIn">
          <div className="card-header">
            <h2 className="card-title">Sleep Tracking</h2>
            <button
              onClick={() => handleAddEntry('sleep')}
              className="btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Entry
            </button>
          </div>

          <div className="space-y-3">
            {sleepEntries.map((entry) => (
              <div key={entry.id} className="p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Sleep Entry</h3>
                    <p className="text-sm text-gray-600">
                      {entry.sleep_time} - {entry.wake_time} • {format(new Date(entry.date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-semibold text-purple-600">{entry.duration_hours}</span>
                    <span className="text-sm text-gray-500 ml-1">hours</span>
                  </div>
                </div>
              </div>
            ))}
            
            {sleepEntries.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Moon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No sleep entries yet. Add your first entry above!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card animate-fadeIn">
          <div className="card-header">
            <h2 className="card-title">Body Profile</h2>
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
            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    min="10"
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
                    min="50"
                    max="300"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender
                  </label>
                  <select
                    value={profileForm.gender}
                    onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                    className="input"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
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
                    <option value="sedentary">Sedentary</option>
                    <option value="lightly_active">Lightly Active</option>
                    <option value="moderately_active">Moderately Active</option>
                    <option value="very_active">Very Active</option>
                    <option value="extremely_active">Extremely Active</option>
                  </select>
                </div>

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
                    min="20"
                    max="300"
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
                    min="800"
                    max="5000"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Workouts per Week
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

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProfile(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profile?.age && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">Age</div>
                    <div className="text-lg font-semibold text-gray-900">{profile.age} years</div>
                  </div>
                )}

                {profile?.height && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">Height</div>
                    <div className="text-lg font-semibold text-gray-900">{profile.height} cm</div>
                  </div>
                )}

                {profile?.gender && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">Gender</div>
                    <div className="text-lg font-semibold text-gray-900 capitalize">{profile.gender}</div>
                  </div>
                )}

                {getCurrentWeight() && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-600">Current Weight</div>
                    <div className="text-lg font-semibold text-blue-900">{getCurrentWeight()} kg</div>
                  </div>
                )}

                {profile?.target_weight && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">Target Weight</div>
                    <div className="text-lg font-semibold text-gray-900">{profile.target_weight} kg</div>
                  </div>
                )}

                {profile?.target_calories && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">Target Calories</div>
                    <div className="text-lg font-semibold text-gray-900">{profile.target_calories} cal/day</div>
                  </div>
                )}

                {profile?.activity_level && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">Activity Level</div>
                    <div className="text-lg font-semibold text-gray-900 capitalize">
                      {profile.activity_level.replace('_', ' ')}
                    </div>
                  </div>
                )}

                {profile?.target_workouts_per_week && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">Target Workouts</div>
                    <div className="text-lg font-semibold text-gray-900">{profile.target_workouts_per_week}/week</div>
                  </div>
                )}
              </div>

              {!profile?.age && !profile?.height && !profile?.gender && (
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No profile information yet</p>
                  <button
                    onClick={() => setEditingProfile(true)}
                    className="btn-primary"
                  >
                    Set up your profile
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Add {modalType.charAt(0).toUpperCase() + modalType.slice(1)} Entry
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitEntry} className="space-y-4">
                {modalType === 'calorie' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Calories
                        </label>
                        <input
                          type="number"
                          value={calorieForm.calories}
                          onChange={(e) => setCalorieForm({ ...calorieForm, calories: e.target.value })}
                          placeholder="0"
                          className="input"
                          required
                          min="1"
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
                          <option value="breakfast">Breakfast</option>
                          <option value="lunch">Lunch</option>
                          <option value="dinner">Dinner</option>
                          <option value="snack">Snack</option>
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
                        rows={2}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={calorieForm.date}
                        onChange={(e) => setCalorieForm({ ...calorieForm, date: e.target.value })}
                        className="input"
                        required
                      />
                    </div>
                  </>
                )}

                {modalType === 'workout' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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

                    {workoutForm.type === 'duration' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Duration (minutes)
                        </label>
                        <input
                          type="number"
                          value={workoutForm.duration_minutes}
                          onChange={(e) => setWorkoutForm({ ...workoutForm, duration_minutes: e.target.value })}
                          placeholder="0"
                          className="input"
                          required
                          min="1"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Repetitions
                        </label>
                        <input
                          type="number"
                          value={workoutForm.repetitions}
                          onChange={(e) => setWorkoutForm({ ...workoutForm, repetitions: e.target.value })}
                          placeholder="0"
                          className="input"
                          required
                          min="1"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Calories Burned
                      </label>
                      <input
                        type="number"
                        value={workoutForm.calories_burned}
                        onChange={(e) => setWorkoutForm({ ...workoutForm, calories_burned: e.target.value })}
                        placeholder="0"
                        className="input"
                        required
                        min="1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={workoutForm.date}
                        onChange={(e) => setWorkoutForm({ ...workoutForm, date: e.target.value })}
                        className="input"
                        required
                      />
                    </div>
                  </>
                )}

                {modalType === 'weight' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Weight (kg)
                      </label>
                      <input
                        type="number"
                        value={weightForm.weight}
                        onChange={(e) => setWeightForm({ ...weightForm, weight: e.target.value })}
                        placeholder="0.0"
                        className="input"
                        required
                        min="1"
                        step="0.1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Body Fat % (Optional)
                      </label>
                      <input
                        type="number"
                        value={weightForm.body_fat}
                        onChange={(e) => setWeightForm({ ...weightForm, body_fat: e.target.value })}
                        placeholder="0.0"
                        className="input"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={weightForm.date}
                        onChange={(e) => setWeightForm({ ...weightForm, date: e.target.value })}
                        className="input"
                        required
                      />
                    </div>
                  </>
                )}

                {modalType === 'sleep' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={sleepForm.date}
                        onChange={(e) => setSleepForm({ ...sleepForm, date: e.target.value })}
                        className="input"
                        required
                      />
                    </div>
                  </>
                )}

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Entry'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
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