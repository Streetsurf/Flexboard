import React, { useState, useEffect } from 'react';
import { 
  Dumbbell, 
  Plus, 
  Save, 
  X, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Target, 
  Award,
  Flame,
  Heart,
  Scale,
  Clock,
  Upload,
  Image,
  Camera,
  User,
  Edit2,
  Utensils,
  Moon,
  BarChart3
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';

interface Profile {
  id: string;
  age?: number;
  height?: number;
  activity_level?: string;
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
  description?: string;
  date: string;
}

interface WorkoutEntry {
  id: string;
  exercise_name: string;
  type: 'duration' | 'reps';
  duration_minutes?: number;
  repetitions?: number;
  calories_burned: number;
  date: string;
}

interface WeightEntry {
  id: string;
  weight: number;
  body_fat?: number;
  date: string;
}

interface SleepEntry {
  id: string;
  sleep_time: string;
  wake_time: string;
  duration_hours: number;
  date: string;
}

const BodyTracker: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'progress' | 'calories' | 'workouts' | 'sleep'>('dashboard');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [calorieEntries, setCalorieEntries] = useState<CalorieEntry[]>([]);
  const [workoutEntries, setWorkoutEntries] = useState<WorkoutEntry[]>([]);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [sleepEntries, setSleepEntries] = useState<SleepEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    age: '',
    height: '',
    activity_level: 'moderately_active',
    target_weight: '',
    target_calories: '',
    target_workouts_per_week: '3'
  });
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    try {
      await Promise.all([
        fetchProfile(),
        fetchCalorieEntries(),
        fetchWorkoutEntries(),
        fetchWeightEntries(),
        fetchSleepEntries()
      ]);
    } catch (error) {
      console.error('Error fetching body tracker data:', error);
    } finally {
      setLoading(false);
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
          target_workouts_per_week: data.target_workouts_per_week?.toString() || '3'
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
        .order('date', { ascending: false })
        .limit(10);

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
        .limit(10);

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
        .limit(10);

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
        .limit(10);

      if (error) throw error;
      setSleepEntries(data || []);
    } catch (error) {
      console.error('Error fetching sleep entries:', error);
    }
  };

  const saveProfile = async () => {
    try {
      const profileData = {
        age: profileForm.age ? parseInt(profileForm.age) : null,
        height: profileForm.height ? parseFloat(profileForm.height) : null,
        activity_level: profileForm.activity_level,
        target_weight: profileForm.target_weight ? parseFloat(profileForm.target_weight) : null,
        target_calories: profileForm.target_calories ? parseInt(profileForm.target_calories) : null,
        target_workouts_per_week: profileForm.target_workouts_per_week ? parseInt(profileForm.target_workouts_per_week) : 3,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('profiles')
        .upsert({ id: user?.id, ...profileData })
        .select()
        .single();

      if (error) throw error;
      
      setProfile(data);
      setEditingProfile(false);
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const getTodayStats = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    const todayCalories = calorieEntries
      .filter(entry => entry.date === today)
      .reduce((sum, entry) => sum + entry.calories, 0);
    
    const todayWorkouts = workoutEntries.filter(entry => entry.date === today);
    const todayCaloriesBurned = todayWorkouts.reduce((sum, entry) => sum + entry.calories_burned, 0);
    
    const todayWeight = weightEntries.find(entry => entry.date === today);
    const todaySleep = sleepEntries.find(entry => entry.date === today);

    return {
      calories: todayCalories,
      caloriesBurned: todayCaloriesBurned,
      workouts: todayWorkouts.length,
      weight: todayWeight?.weight,
      sleep: todaySleep?.duration_hours
    };
  };

  const getWeeklyProgress = () => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
    
    const weekWorkouts = workoutEntries.filter(entry => 
      entry.date >= weekStartStr && entry.date <= weekEndStr
    ).length;
    
    const targetWorkouts = profile?.target_workouts_per_week || 3;
    const workoutProgress = Math.round((weekWorkouts / targetWorkouts) * 100);

    return {
      workouts: weekWorkouts,
      targetWorkouts,
      workoutProgress: Math.min(workoutProgress, 100)
    };
  };

  if (loading) {
    return (
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
    );
  }

  const todayStats = getTodayStats();
  const weeklyProgress = getWeeklyProgress();

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="tab-nav">
        <nav className="flex space-x-6 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <Activity className="w-4 h-4" /> },
            { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
            { id: 'progress', label: 'Progress', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'calories', label: 'Calories', icon: <Flame className="w-4 h-4" /> },
            { id: 'workouts', label: 'Workouts', icon: <Dumbbell className="w-4 h-4" /> },
            { id: 'sleep', label: 'Sleep', icon: <Moon className="w-4 h-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`tab-nav-item flex items-center space-x-2 whitespace-nowrap ${
                activeTab === tab.id ? 'active' : ''
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Today's Overview */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <h2 className="card-title">Today's Overview</h2>
              </div>
            </div>
            
            <div className="grid-4">
              <div className="stat-card">
                <div className="stat-value text-orange-600">{todayStats.calories}</div>
                <div className="stat-label">Calories In</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-red-600">{todayStats.caloriesBurned}</div>
                <div className="stat-label">Calories Burned</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-blue-600">{todayStats.workouts}</div>
                <div className="stat-label">Workouts</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-purple-600">
                  {todayStats.sleep ? `${todayStats.sleep}h` : '-'}
                </div>
                <div className="stat-label">Sleep</div>
              </div>
            </div>
          </div>

          {/* Weekly Progress */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h3 className="card-title">Weekly Progress</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Workouts</span>
                  <span className="text-sm text-gray-600">
                    {weeklyProgress.workouts}/{weeklyProgress.targetWorkouts}
                  </span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${weeklyProgress.workoutProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card animate-fadeIn">
          <div className="card-header">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <h2 className="card-title">Body Profile</h2>
            </div>
            {!editingProfile && (
              <button
                onClick={() => setEditingProfile(true)}
                className="btn-secondary"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </button>
            )}
          </div>
          
          {editingProfile ? (
            <div className="space-y-4">
              <div className="grid-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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

              <div className="grid-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Weight (kg)
                  </label>
                  <input
                    type="number"
                    value={profileForm.target_weight}
                    onChange={(e) => setProfileForm({ ...profileForm, target_weight: e.target.value })}
                    placeholder="Target weight"
                    className="input"
                    min="20"
                    max="300"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Calories
                  </label>
                  <input
                    type="number"
                    value={profileForm.target_calories}
                    onChange={(e) => setProfileForm({ ...profileForm, target_calories: e.target.value })}
                    placeholder="Daily calorie target"
                    className="input"
                    min="800"
                    max="5000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Workouts per Week
                </label>
                <input
                  type="number"
                  value={profileForm.target_workouts_per_week}
                  onChange={(e) => setProfileForm({ ...profileForm, target_workouts_per_week: e.target.value })}
                  placeholder="Workouts per week"
                  className="input"
                  min="0"
                  max="14"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={saveProfile}
                  className="btn-primary"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Profile
                </button>
                <button
                  onClick={() => setEditingProfile(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {profile ? (
                <div className="grid-2">
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Age:</span>
                      <span className="ml-2 text-gray-900">{profile.age || 'Not set'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Height:</span>
                      <span className="ml-2 text-gray-900">{profile.height ? `${profile.height} cm` : 'Not set'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Activity Level:</span>
                      <span className="ml-2 text-gray-900 capitalize">{profile.activity_level?.replace('_', ' ') || 'Not set'}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Target Weight:</span>
                      <span className="ml-2 text-gray-900">{profile.target_weight ? `${profile.target_weight} kg` : 'Not set'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Target Calories:</span>
                      <span className="ml-2 text-gray-900">{profile.target_calories || 'Not set'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Weekly Workouts:</span>
                      <span className="ml-2 text-gray-900">{profile.target_workouts_per_week || 3}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm">No profile data yet</p>
                  <button
                    onClick={() => setEditingProfile(true)}
                    className="btn-primary mt-4"
                  >
                    Set up your profile
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Progress Tab */}
      {activeTab === 'progress' && (
        <div className="card animate-fadeIn">
          <div className="card-header">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <h2 className="card-title">Progress Tracking</h2>
            </div>
          </div>
          
          <div className="space-y-4">
            {weightEntries.length > 0 ? (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Weight Entries</h3>
                <div className="space-y-2">
                  {weightEntries.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">{format(new Date(entry.date), 'MMM dd, yyyy')}</span>
                      <div className="text-right">
                        <span className="font-medium text-gray-900">{entry.weight} kg</span>
                        {entry.body_fat && (
                          <div className="text-xs text-gray-500">{entry.body_fat}% body fat</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Scale className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">No weight entries yet</p>
                <p className="text-xs text-gray-400">Start tracking your weight to see progress</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Calories Tab */}
      {activeTab === 'calories' && (
        <div className="card animate-fadeIn">
          <div className="card-header">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <Flame className="w-4 h-4 text-white" />
              </div>
              <h2 className="card-title">Calorie Tracking</h2>
            </div>
            <button className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Entry
            </button>
          </div>
          
          <div className="space-y-4">
            {calorieEntries.length > 0 ? (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Entries</h3>
                <div className="space-y-2">
                  {calorieEntries.slice(0, 10).map((entry) => (
                    <div key={entry.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium text-gray-900">{entry.food_name}</span>
                        <div className="text-xs text-gray-500 capitalize">{entry.category} • {format(new Date(entry.date), 'MMM dd')}</div>
                      </div>
                      <span className="font-medium text-orange-600">{entry.calories} cal</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Utensils className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">No calorie entries yet</p>
                <p className="text-xs text-gray-400">Start tracking your food intake</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Workouts Tab */}
      {activeTab === 'workouts' && (
        <div className="card animate-fadeIn">
          <div className="card-header">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Dumbbell className="w-4 h-4 text-white" />
              </div>
              <h2 className="card-title">Workout Tracking</h2>
            </div>
            <button className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Workout
            </button>
          </div>
          
          <div className="space-y-4">
            {workoutEntries.length > 0 ? (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Workouts</h3>
                <div className="space-y-2">
                  {workoutEntries.slice(0, 10).map((entry) => (
                    <div key={entry.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium text-gray-900">{entry.exercise_name}</span>
                        <div className="text-xs text-gray-500">
                          {format(new Date(entry.date), 'MMM dd')} • 
                          {entry.type === 'duration' 
                            ? ` ${entry.duration_minutes} min`
                            : ` ${entry.repetitions} reps`
                          }
                        </div>
                      </div>
                      <span className="font-medium text-red-600">{entry.calories_burned} cal</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Dumbbell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">No workout entries yet</p>
                <p className="text-xs text-gray-400">Start logging your exercises</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sleep Tab */}
      {activeTab === 'sleep' && (
        <div className="card animate-fadeIn">
          <div className="card-header">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                <Moon className="w-4 h-4 text-white" />
              </div>
              <h2 className="card-title">Sleep Tracking</h2>
            </div>
            <button className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Sleep
            </button>
          </div>
          
          <div className="space-y-4">
            {sleepEntries.length > 0 ? (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Sleep</h3>
                <div className="space-y-2">
                  {sleepEntries.slice(0, 10).map((entry) => (
                    <div key={entry.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium text-gray-900">{format(new Date(entry.date), 'MMM dd, yyyy')}</span>
                        <div className="text-xs text-gray-500">
                          {entry.sleep_time} - {entry.wake_time}
                        </div>
                      </div>
                      <span className="font-medium text-indigo-600">{entry.duration_hours}h</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Moon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">No sleep entries yet</p>
                <p className="text-xs text-gray-400">Start tracking your sleep patterns</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BodyTracker;