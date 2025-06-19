import React, { useState, useEffect, useRef } from 'react';
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
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Coffee,
  Sunrise,
  Sunset,
  Cookie
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { format, subDays, startOfWeek, endOfWeek, addDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';

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
  created_at: string;
}

interface WorkoutEntry {
  id: string;
  exercise_name: string;
  type: 'duration' | 'reps';
  duration_minutes?: number;
  repetitions?: number;
  calories_burned: number;
  date: string;
  created_at: string;
}

interface WeightEntry {
  id: string;
  weight: number;
  body_fat?: number;
  date: string;
  created_at: string;
}

interface SleepEntry {
  id: string;
  sleep_time: string;
  wake_time: string;
  duration_hours: number;
  date: string;
  created_at: string;
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'progress' | 'calories' | 'workouts' | 'sleep'>('dashboard');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [calorieEntries, setCalorieEntries] = useState<CalorieEntry[]>([]);
  const [workoutEntries, setWorkoutEntries] = useState<WorkoutEntry[]>([]);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [sleepEntries, setSleepEntries] = useState<SleepEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profileForm, setProfileForm] = useState({
    age: '',
    height: '',
    activity_level: 'moderately_active',
    target_weight: '',
    target_calories: '',
    target_workouts_per_week: '3',
    avatar_url: ''
  });

  const [calorieForm, setCalorieForm] = useState({
    food_name: '',
    calories: '',
    category: 'breakfast' as 'breakfast' | 'lunch' | 'dinner' | 'snack',
    description: ''
  });

  const [workoutForm, setWorkoutForm] = useState({
    exercise_name: '',
    type: 'duration' as 'duration' | 'reps',
    duration_minutes: '',
    repetitions: '',
    calories_burned: '',
    isDuration: true,
    isReps: false
  });

  const [sleepForm, setSleepForm] = useState({
    sleep_time: '',
    wake_time: '',
    duration_hours: ''
  });

  const [weightForm, setWeightForm] = useState({
    weight: '',
    body_fat: ''
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
          target_workouts_per_week: data.target_workouts_per_week?.toString() || '3',
          avatar_url: data.avatar_url || ''
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
        .limit(50);

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
        .limit(50);

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
        .limit(50);

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
        .limit(50);

      if (error) throw error;
      setSleepEntries(data || []);
    } catch (error) {
      console.error('Error fetching sleep entries:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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
          setProfileForm({ ...profileForm, avatar_url: resizedDataUrl });
        }
        setUploading(false);
      };
      
      img.onerror = () => {
        alert('Invalid image file');
        setUploading(false);
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      alert('Failed to read file');
      setUploading(false);
    };
    
    reader.readAsDataURL(file);
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
        avatar_url: profileForm.avatar_url || null,
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

  const addCalorieEntry = async () => {
    try {
      const { data, error } = await supabase
        .from('calorie_entries')
        .insert([{
          food_name: calorieForm.food_name,
          calories: parseInt(calorieForm.calories),
          category: calorieForm.category,
          description: calorieForm.description,
          date: format(selectedDate, 'yyyy-MM-dd'),
          user_id: user?.id
        }])
        .select()
        .single();

      if (error) throw error;
      
      setCalorieEntries([data, ...calorieEntries]);
      setCalorieForm({ food_name: '', calories: '', category: 'breakfast', description: '' });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding calorie entry:', error);
    }
  };

  const addWorkoutEntry = async () => {
    try {
      const { data, error } = await supabase
        .from('workout_entries')
        .insert([{
          exercise_name: workoutForm.exercise_name,
          type: workoutForm.type,
          duration_minutes: workoutForm.type === 'duration' ? parseInt(workoutForm.duration_minutes) : null,
          repetitions: workoutForm.type === 'reps' ? parseInt(workoutForm.repetitions) : null,
          calories_burned: parseInt(workoutForm.calories_burned),
          date: format(selectedDate, 'yyyy-MM-dd'),
          user_id: user?.id
        }])
        .select()
        .single();

      if (error) throw error;
      
      setWorkoutEntries([data, ...workoutEntries]);
      setWorkoutForm({
        exercise_name: '',
        type: 'duration',
        duration_minutes: '',
        repetitions: '',
        calories_burned: '',
        isDuration: true,
        isReps: false
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding workout entry:', error);
    }
  };

  const addSleepEntry = async () => {
    try {
      const { data, error } = await supabase
        .from('sleep_entries')
        .insert([{
          sleep_time: sleepForm.sleep_time,
          wake_time: sleepForm.wake_time,
          duration_hours: parseFloat(sleepForm.duration_hours),
          date: format(selectedDate, 'yyyy-MM-dd'),
          user_id: user?.id
        }])
        .select()
        .single();

      if (error) throw error;
      
      setSleepEntries([data, ...sleepEntries]);
      setSleepForm({ sleep_time: '', wake_time: '', duration_hours: '' });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding sleep entry:', error);
    }
  };

  const addWeightEntry = async () => {
    try {
      const { data, error } = await supabase
        .from('weight_entries')
        .insert([{
          weight: parseFloat(weightForm.weight),
          body_fat: weightForm.body_fat ? parseFloat(weightForm.body_fat) : null,
          date: format(selectedDate, 'yyyy-MM-dd'),
          user_id: user?.id
        }])
        .select()
        .single();

      if (error) throw error;
      
      setWeightEntries([data, ...weightEntries]);
      setWeightForm({ weight: '', body_fat: '' });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding weight entry:', error);
    }
  };

  const getWeeklyStats = () => {
    const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });
    
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
    
    const weekWorkouts = workoutEntries.filter(entry => 
      entry.date >= weekStartStr && entry.date <= weekEndStr
    );
    
    const weekCalories = calorieEntries.filter(entry => 
      entry.date >= weekStartStr && entry.date <= weekEndStr
    );
    
    const weekSleep = sleepEntries.filter(entry => 
      entry.date >= weekStartStr && entry.date <= weekEndStr
    );

    const totalCaloriesIn = weekCalories.reduce((sum, entry) => sum + entry.calories, 0);
    const totalCaloriesBurned = weekWorkouts.reduce((sum, entry) => sum + entry.calories_burned, 0);
    const averageSleep = weekSleep.length > 0 
      ? weekSleep.reduce((sum, entry) => sum + entry.duration_hours, 0) / weekSleep.length 
      : 0;

    return {
      workouts: weekWorkouts.length,
      targetWorkouts: profile?.target_workouts_per_week || 3,
      caloriesIn: totalCaloriesIn,
      caloriesBurned: totalCaloriesBurned,
      calorieBalance: totalCaloriesIn - totalCaloriesBurned,
      averageSleep: Math.round(averageSleep * 10) / 10,
      sleepDays: weekSleep.length
    };
  };

  const getWeeklyAchievements = (): WeeklyAchievement[] => {
    const stats = getWeeklyStats();
    
    return [
      {
        id: 'workout_goal',
        title: 'Workout Goal',
        description: `Complete ${stats.targetWorkouts} workouts this week`,
        achieved: stats.workouts >= stats.targetWorkouts,
        icon: <Dumbbell className="w-5 h-5" />,
        color: stats.workouts >= stats.targetWorkouts ? 'text-green-600' : 'text-gray-400'
      },
      {
        id: 'calorie_tracking',
        title: 'Calorie Tracking',
        description: 'Track calories for 5+ days this week',
        achieved: stats.caloriesIn > 0,
        icon: <Flame className="w-5 h-5" />,
        color: stats.caloriesIn > 0 ? 'text-orange-600' : 'text-gray-400'
      },
      {
        id: 'sleep_consistency',
        title: 'Sleep Consistency',
        description: 'Log sleep for 5+ days this week',
        achieved: stats.sleepDays >= 5,
        icon: <Moon className="w-5 h-5" />,
        color: stats.sleepDays >= 5 ? 'text-purple-600' : 'text-gray-400'
      },
      {
        id: 'calorie_balance',
        title: 'Calorie Balance',
        description: 'Maintain healthy calorie balance',
        achieved: Math.abs(stats.calorieBalance) <= 500,
        icon: <Scale className="w-5 h-5" />,
        color: Math.abs(stats.calorieBalance) <= 500 ? 'text-blue-600' : 'text-gray-400'
      }
    ];
  };

  const getWeightProgressData = () => {
    return weightEntries
      .slice(0, 30)
      .reverse()
      .map(entry => ({
        date: format(new Date(entry.date), 'MMM dd'),
        weight: entry.weight,
        bodyFat: entry.body_fat || 0
      }));
  };

  const getSleepProgressData = () => {
    const last30Days = eachDayOfInterval({
      start: subDays(new Date(), 29),
      end: new Date()
    });

    return last30Days.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const sleepEntry = sleepEntries.find(entry => entry.date === dateStr);
      
      return {
        date: format(date, 'MMM dd'),
        hours: sleepEntry?.duration_hours || 0
      };
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'breakfast': return <Sunrise className="w-4 h-4 text-yellow-500" />;
      case 'lunch': return <Coffee className="w-4 h-4 text-orange-500" />;
      case 'dinner': return <Sunset className="w-4 h-4 text-red-500" />;
      case 'snack': return <Cookie className="w-4 h-4 text-purple-500" />;
      default: return <Utensils className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'breakfast': return 'Sarapan';
      case 'lunch': return 'Makan Siang';
      case 'dinner': return 'Makan Malam';
      case 'snack': return 'Cemilan';
      default: return category;
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedWeek(prev => subDays(prev, 7));
    } else {
      setSelectedWeek(prev => addDays(prev, 7));
    }
  };

  const getSelectedDateEntries = (type: 'calories' | 'workouts' | 'sleep') => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    switch (type) {
      case 'calories':
        return calorieEntries.filter(entry => entry.date === dateStr);
      case 'workouts':
        return workoutEntries.filter(entry => entry.date === dateStr);
      case 'sleep':
        return sleepEntries.filter(entry => entry.date === dateStr);
      default:
        return [];
    }
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

  const weeklyStats = getWeeklyStats();
  const achievements = getWeeklyAchievements();
  const weightProgressData = getWeightProgressData();
  const sleepProgressData = getSleepProgressData();

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="tab-nav">
        <nav className="flex space-x-6 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <Activity className="w-4 h-4" />, color: 'text-blue-600' },
            { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" />, color: 'text-gray-600' },
            { id: 'progress', label: 'Progress', icon: <TrendingUp className="w-4 h-4" />, color: 'text-purple-600' },
            { id: 'calories', label: 'Calories', icon: <Flame className="w-4 h-4" />, color: 'text-orange-600' },
            { id: 'workouts', label: 'Workouts', icon: <Dumbbell className="w-4 h-4" />, color: 'text-blue-600' },
            { id: 'sleep', label: 'Sleep', icon: <Moon className="w-4 h-4" />, color: 'text-purple-600' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`tab-nav-item flex items-center space-x-2 whitespace-nowrap ${
                activeTab === tab.id ? 'active' : ''
              }`}
            >
              <span className={tab.color}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Weekly Report Header */}
          <div className="card animate-fadeIn" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <div className="text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold">Weekly Report</h2>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => navigateWeek('prev')}
                    className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all duration-200"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium px-3">
                    {format(startOfWeek(selectedWeek, { weekStartsOn: 1 }), 'MMM dd')} - {format(endOfWeek(selectedWeek, { weekStartsOn: 1 }), 'MMM dd, yyyy')}
                  </span>
                  <button
                    onClick={() => navigateWeek('next')}
                    className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all duration-200"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="grid-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{weeklyStats.workouts}</div>
                  <div className="text-sm opacity-90">Workouts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{weeklyStats.caloriesIn}</div>
                  <div className="text-sm opacity-90">Calories In</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{weeklyStats.caloriesBurned}</div>
                  <div className="text-sm opacity-90">Calories Out</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{weeklyStats.averageSleep}h</div>
                  <div className="text-sm opacity-90">Avg Sleep</div>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Achievements */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <Award className="w-4 h-4 text-white" />
                </div>
                <h2 className="card-title">Weekly Achievements</h2>
              </div>
            </div>
            
            <div className="grid-2">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    achievement.achieved
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`${achievement.color}`}>
                      {achievement.achieved ? <CheckCircle className="w-6 h-6" /> : achievement.icon}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{achievement.title}</h3>
                      <p className="text-sm text-gray-600">{achievement.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid-3">
            <div className="card animate-fadeIn" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
              <div className="text-white text-center">
                <Flame className="w-8 h-8 mx-auto mb-2" />
                <div className="text-2xl font-bold">{weeklyStats.calorieBalance > 0 ? '+' : ''}{weeklyStats.calorieBalance}</div>
                <div className="text-sm opacity-90">Calorie Balance</div>
              </div>
            </div>
            
            <div className="card animate-fadeIn" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
              <div className="text-white text-center">
                <Target className="w-8 h-8 mx-auto mb-2" />
                <div className="text-2xl font-bold">{Math.round((weeklyStats.workouts / weeklyStats.targetWorkouts) * 100)}%</div>
                <div className="text-sm opacity-90">Workout Goal</div>
              </div>
            </div>
            
            <div className="card animate-fadeIn" style={{ background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' }}>
              <div className="text-gray-800 text-center">
                <Moon className="w-8 h-8 mx-auto mb-2" />
                <div className="text-2xl font-bold">{weeklyStats.sleepDays}/7</div>
                <div className="text-sm opacity-90">Sleep Tracked</div>
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
            <div className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex items-center space-x-6">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
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
                  <User className={`w-8 h-8 text-gray-400 ${profileForm.avatar_url ? 'hidden' : ''}`} />
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Upload Photo'}
                  </button>
                  {profileForm.avatar_url && (
                    <button
                      type="button"
                      onClick={() => setProfileForm({ ...profileForm, avatar_url: '' })}
                      className="ml-2 text-sm text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

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

              <div className="grid-3">
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weekly Workouts
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
            <div className="space-y-6">
              {profile ? (
                <>
                  {/* Profile Display */}
                  <div className="flex items-center space-x-6">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                      {profile.avatar_url ? (
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
                      <User className={`w-8 h-8 text-gray-400 ${profile.avatar_url ? 'hidden' : ''}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {profile.full_name || 'Your Profile'}
                      </h3>
                      <p className="text-gray-600">Body tracking profile</p>
                    </div>
                  </div>

                  <div className="grid-3">
                    <div className="space-y-4">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Age:</span>
                        <span className="ml-2 text-gray-900">{profile.age || 'Not set'}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Height:</span>
                        <span className="ml-2 text-gray-900">{profile.height ? `${profile.height} cm` : 'Not set'}</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Activity Level:</span>
                        <span className="ml-2 text-gray-900 capitalize">{profile.activity_level?.replace('_', ' ') || 'Not set'}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Target Weight:</span>
                        <span className="ml-2 text-gray-900">{profile.target_weight ? `${profile.target_weight} kg` : 'Not set'}</span>
                      </div>
                    </div>
                    <div className="space-y-4">
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
                </>
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
        <div className="space-y-6">
          {/* Weight Progress Chart */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <h2 className="card-title">Weight Progress</h2>
              </div>
              <button
                onClick={() => {
                  setActiveTab('progress');
                  setShowAddForm(true);
                }}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Weight
              </button>
            </div>
            
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
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 6 }}
                      activeDot={{ r: 8, stroke: '#8b5cf6', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Scale className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">No weight entries yet</p>
                <p className="text-xs text-gray-400">Start tracking your weight to see progress</p>
              </div>
            )}
          </div>

          {/* Fitness Goals Integration */}
          {profile && (
            <div className="card animate-fadeIn">
              <div className="card-header">
                <h3 className="card-title">Fitness Goals</h3>
              </div>
              
              <div className="grid-2">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-700">Target Weight</span>
                    <Target className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {profile.target_weight ? `${profile.target_weight} kg` : 'Not set'}
                  </div>
                  {weightEntries.length > 0 && profile.target_weight && (
                    <div className="text-xs text-blue-600 mt-1">
                      {weightEntries[0].weight > profile.target_weight ? 
                        `${(weightEntries[0].weight - profile.target_weight).toFixed(1)} kg to lose` :
                        `${(profile.target_weight - weightEntries[0].weight).toFixed(1)} kg to gain`
                      }
                    </div>
                  )}
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-700">Weekly Workouts</span>
                    <Dumbbell className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {weeklyStats.workouts}/{profile.target_workouts_per_week || 3}
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min((weeklyStats.workouts / (profile.target_workouts_per_week || 3)) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Statistics */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h3 className="card-title">Statistics</h3>
            </div>
            
            <div className="grid-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {weightEntries.length > 0 ? `${weightEntries[0].weight} kg` : '-'}
                </div>
                <div className="text-sm text-gray-600">Current Weight</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {weightEntries.length > 1 ? 
                    `${weightEntries[0].weight - weightEntries[1].weight > 0 ? '+' : ''}${(weightEntries[0].weight - weightEntries[1].weight).toFixed(1)} kg` : 
                    '-'
                  }
                </div>
                <div className="text-sm text-gray-600">Weekly Change</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{weeklyStats.workouts}</div>
                <div className="text-sm text-gray-600">Workouts Done</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className={`text-2xl font-bold ${weeklyStats.calorieBalance > 0 ? 'text-red-600' : weeklyStats.calorieBalance < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                  {weeklyStats.calorieBalance > 0 ? 'Surplus' : weeklyStats.calorieBalance < 0 ? 'Deficit' : 'Balanced'}
                </div>
                <div className="text-sm text-gray-600">Calorie Status</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calories Tab */}
      {activeTab === 'calories' && (
        <div className="space-y-6">
          {/* Date Selection */}
          <div className="card animate-fadeIn" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
            <div className="text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <Flame className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold">Calorie Tracking</h2>
                </div>
                
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="flex items-center space-x-2 px-3 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all duration-200"
                >
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {format(selectedDate, 'MMM dd, yyyy')}
                  </span>
                </button>
              </div>
              
              {showCalendar && (
                <div className="mt-4 p-3 bg-white bg-opacity-20 rounded-lg">
                  <input
                    type="date"
                    value={format(selectedDate, 'yyyy-MM-dd')}
                    onChange={(e) => {
                      setSelectedDate(new Date(e.target.value));
                      setShowCalendar(false);
                    }}
                    className="input bg-white text-gray-900"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Add Entry Button */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-primary"
              style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', border: 'none' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Food Entry
            </button>
          </div>

          {/* Today's Entries */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h3 className="card-title">
                Food Intake - {format(selectedDate, 'EEEE, MMM dd')}
              </h3>
              <div className="text-sm text-gray-600">
                {getSelectedDateEntries('calories').reduce((sum: number, entry: any) => sum + entry.calories, 0)} calories
              </div>
            </div>
            
            <div className="space-y-3">
              {getSelectedDateEntries('calories').length > 0 ? (
                getSelectedDateEntries('calories').map((entry: any) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center space-x-3">
                      {getCategoryIcon(entry.category)}
                      <div>
                        <span className="font-medium text-gray-900">{entry.food_name}</span>
                        <div className="text-xs text-gray-500">
                          {getCategoryLabel(entry.category)}
                          {entry.description && ` • ${entry.description}`}
                        </div>
                      </div>
                    </div>
                    <span className="font-medium text-orange-600">{entry.calories} cal</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Utensils className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm">No food entries for this date</p>
                  <p className="text-xs text-gray-400">Add your first meal above</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Entries */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h3 className="card-title">Recent Entries</h3>
            </div>
            
            <div className="space-y-2">
              {calorieEntries.slice(0, 10).map((entry) => (
                <div key={entry.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getCategoryIcon(entry.category)}
                    <div>
                      <span className="font-medium text-gray-900">{entry.food_name}</span>
                      <div className="text-xs text-gray-500">
                        {getCategoryLabel(entry.category)} • {format(new Date(entry.date), 'MMM dd')}
                      </div>
                    </div>
                  </div>
                  <span className="font-medium text-orange-600">{entry.calories} cal</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Workouts Tab */}
      {activeTab === 'workouts' && (
        <div className="space-y-6">
          {/* Date Selection */}
          <div className="card animate-fadeIn" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <div className="text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <Dumbbell className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold">Workout Tracking</h2>
                </div>
                
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="flex items-center space-x-2 px-3 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all duration-200"
                >
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {format(selectedDate, 'MMM dd, yyyy')}
                  </span>
                </button>
              </div>
              
              {showCalendar && (
                <div className="mt-4 p-3 bg-white bg-opacity-20 rounded-lg">
                  <input
                    type="date"
                    value={format(selectedDate, 'yyyy-MM-dd')}
                    onChange={(e) => {
                      setSelectedDate(new Date(e.target.value));
                      setShowCalendar(false);
                    }}
                    className="input bg-white text-gray-900"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Add Workout Button */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-primary"
              style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', border: 'none' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Workout
            </button>
          </div>

          {/* Today's Workouts */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h3 className="card-title">
                Workouts - {format(selectedDate, 'EEEE, MMM dd')}
              </h3>
              <div className="text-sm text-gray-600">
                {getSelectedDateEntries('workouts').reduce((sum: number, entry: any) => sum + entry.calories_burned, 0)} calories burned
              </div>
            </div>
            
            <div className="space-y-3">
              {getSelectedDateEntries('workouts').length > 0 ? (
                getSelectedDateEntries('workouts').map((entry: any) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-3">
                      <Dumbbell className="w-5 h-5 text-blue-600" />
                      <div>
                        <span className="font-medium text-gray-900">{entry.exercise_name}</span>
                        <div className="text-xs text-gray-500">
                          {entry.type === 'duration' 
                            ? `${entry.duration_minutes} minutes`
                            : `${entry.repetitions}x reps`
                          }
                        </div>
                      </div>
                    </div>
                    <span className="font-medium text-red-600">{entry.calories_burned} cal</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Dumbbell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm">No workouts for this date</p>
                  <p className="text-xs text-gray-400">Add your first workout above</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Workouts */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h3 className="card-title">Recent Workouts</h3>
            </div>
            
            <div className="space-y-2">
              {workoutEntries.slice(0, 10).map((entry) => (
                <div key={entry.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Dumbbell className="w-4 h-4 text-blue-600" />
                    <div>
                      <span className="font-medium text-gray-900">{entry.exercise_name}</span>
                      <div className="text-xs text-gray-500">
                        {format(new Date(entry.date), 'MMM dd')} • 
                        {entry.type === 'duration' 
                          ? ` ${entry.duration_minutes} min`
                          : ` ${entry.repetitions}x`
                        }
                      </div>
                    </div>
                  </div>
                  <span className="font-medium text-red-600">{entry.calories_burned} cal</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sleep Tab */}
      {activeTab === 'sleep' && (
        <div className="space-y-6">
          {/* Date Selection */}
          <div className="card animate-fadeIn" style={{ background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' }}>
            <div className="text-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white bg-opacity-30 rounded-lg flex items-center justify-center">
                    <Moon className="w-4 h-4 text-gray-800" />
                  </div>
                  <h2 className="text-lg font-semibold">Sleep Tracking</h2>
                </div>
                
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="flex items-center space-x-2 px-3 py-2 bg-white bg-opacity-30 rounded-lg hover:bg-opacity-40 transition-all duration-200"
                >
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {format(selectedDate, 'MMM dd, yyyy')}
                  </span>
                </button>
              </div>
              
              {showCalendar && (
                <div className="mt-4 p-3 bg-white bg-opacity-30 rounded-lg">
                  <input
                    type="date"
                    value={format(selectedDate, 'yyyy-MM-dd')}
                    onChange={(e) => {
                      setSelectedDate(new Date(e.target.value));
                      setShowCalendar(false);
                    }}
                    className="input bg-white text-gray-900"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sleep Progress Chart */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h3 className="card-title">Sleep Pattern (Last 30 Days)</h3>
            </div>
            
            {sleepProgressData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sleepProgressData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 12 }} domain={[0, 12]} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="hours"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Moon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">No sleep data yet</p>
                <p className="text-xs text-gray-400">Start tracking your sleep patterns</p>
              </div>
            )}
          </div>

          {/* Add Sleep Button */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-primary"
              style={{ background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', border: 'none', color: '#374151' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Sleep Entry
            </button>
          </div>

          {/* Today's Sleep */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h3 className="card-title">
                Sleep - {format(selectedDate, 'EEEE, MMM dd')}
              </h3>
            </div>
            
            <div className="space-y-3">
              {getSelectedDateEntries('sleep').length > 0 ? (
                getSelectedDateEntries('sleep').map((entry: any) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center space-x-3">
                      <Moon className="w-5 h-5 text-purple-600" />
                      <div>
                        <span className="font-medium text-gray-900">
                          {entry.sleep_time} - {entry.wake_time}
                        </span>
                        <div className="text-xs text-gray-500">
                          Sleep duration
                        </div>
                      </div>
                    </div>
                    <span className="font-medium text-purple-600">{entry.duration_hours}h</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Moon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm">No sleep entry for this date</p>
                  <p className="text-xs text-gray-400">Add your sleep data above</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Sleep */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h3 className="card-title">Recent Sleep</h3>
            </div>
            
            <div className="space-y-2">
              {sleepEntries.slice(0, 10).map((entry) => (
                <div key={entry.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Moon className="w-4 h-4 text-purple-600" />
                    <div>
                      <span className="font-medium text-gray-900">{format(new Date(entry.date), 'MMM dd, yyyy')}</span>
                      <div className="text-xs text-gray-500">
                        {entry.sleep_time} - {entry.wake_time}
                      </div>
                    </div>
                  </div>
                  <span className="font-medium text-purple-600">{entry.duration_hours}h</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Forms Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50 modal-overlay">
          <div className="modal-content max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {activeTab === 'calories' && 'Add Food Entry'}
                  {activeTab === 'workouts' && 'Add Workout'}
                  {activeTab === 'sleep' && 'Add Sleep Entry'}
                  {activeTab === 'progress' && 'Add Weight Entry'}
                </h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-all duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Calorie Form */}
              {activeTab === 'calories' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Food Name
                    </label>
                    <input
                      type="text"
                      value={calorieForm.food_name}
                      onChange={(e) => setCalorieForm({ ...calorieForm, food_name: e.target.value })}
                      placeholder="Enter food name..."
                      className="input"
                      required
                    />
                  </div>

                  <div className="grid-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Calories
                      </label>
                      <input
                        type="number"
                        value={calorieForm.calories}
                        onChange={(e) => setCalorieForm({ ...calorieForm, calories: e.target.value })}
                        placeholder="Enter calories..."
                        className="input"
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
                        onChange={(e) => setCalorieForm({ ...calorieForm, category: e.target.value as any })}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={calorieForm.description}
                      onChange={(e) => setCalorieForm({ ...calorieForm, description: e.target.value })}
                      placeholder="Additional notes..."
                      className="input"
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={addCalorieEntry}
                      disabled={!calorieForm.food_name || !calorieForm.calories}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Add Entry
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Workout Form */}
              {activeTab === 'workouts' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exercise Name
                    </label>
                    <input
                      type="text"
                      value={workoutForm.exercise_name}
                      onChange={(e) => setWorkoutForm({ ...workoutForm, exercise_name: e.target.value })}
                      placeholder="Enter exercise name..."
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Workout Type
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={workoutForm.isDuration}
                          onChange={(e) => {
                            setWorkoutForm({
                              ...workoutForm,
                              isDuration: e.target.checked,
                              isReps: !e.target.checked,
                              type: e.target.checked ? 'duration' : 'reps'
                            });
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Duration-based workout</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={workoutForm.isReps}
                          onChange={(e) => {
                            setWorkoutForm({
                              ...workoutForm,
                              isReps: e.target.checked,
                              isDuration: !e.target.checked,
                              type: e.target.checked ? 'reps' : 'duration'
                            });
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Repetition-based workout</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid-2">
                    {workoutForm.isDuration && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Duration (minutes)
                        </label>
                        <input
                          type="number"
                          value={workoutForm.duration_minutes}
                          onChange={(e) => setWorkoutForm({ ...workoutForm, duration_minutes: e.target.value })}
                          placeholder="Enter duration..."
                          className="input"
                          min="1"
                          required
                        />
                      </div>
                    )}

                    {workoutForm.isReps && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Repetitions
                        </label>
                        <input
                          type="number"
                          value={workoutForm.repetitions}
                          onChange={(e) => setWorkoutForm({ ...workoutForm, repetitions: e.target.value })}
                          placeholder="Enter reps..."
                          className="input"
                          min="1"
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
                        value={workoutForm.calories_burned}
                        onChange={(e) => setWorkoutForm({ ...workoutForm, calories_burned: e.target.value })}
                        placeholder="Enter calories burned..."
                        className="input"
                        min="1"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={addWorkoutEntry}
                      disabled={!workoutForm.exercise_name || !workoutForm.calories_burned || 
                        (workoutForm.isDuration && !workoutForm.duration_minutes) ||
                        (workoutForm.isReps && !workoutForm.repetitions)}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Add Workout
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Sleep Form */}
              {activeTab === 'sleep' && (
                <div className="space-y-4">
                  <div className="grid-2">
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
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration (hours)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={sleepForm.duration_hours}
                      onChange={(e) => setSleepForm({ ...sleepForm, duration_hours: e.target.value })}
                      placeholder="Enter sleep duration..."
                      className="input"
                      min="0.5"
                      max="24"
                      required
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={addSleepEntry}
                      disabled={!sleepForm.sleep_time || !sleepForm.wake_time || !sleepForm.duration_hours}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Add Sleep Entry
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Weight Form */}
              {activeTab === 'progress' && (
                <div className="space-y-4">
                  <div className="grid-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Weight (kg)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={weightForm.weight}
                        onChange={(e) => setWeightForm({ ...weightForm, weight: e.target.value })}
                        placeholder="Enter weight..."
                        className="input"
                        min="20"
                        max="300"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Body Fat % (Optional)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={weightForm.body_fat}
                        onChange={(e) => setWeightForm({ ...weightForm, body_fat: e.target.value })}
                        placeholder="Enter body fat %..."
                        className="input"
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={addWeightEntry}
                      disabled={!weightForm.weight}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Add Weight Entry
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BodyTracker;