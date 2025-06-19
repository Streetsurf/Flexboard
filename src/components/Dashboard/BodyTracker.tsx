import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  User, 
  Target, 
  Utensils, 
  Activity, 
  TrendingUp, 
  BarChart3, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  Moon,
  Upload,
  Image,
  Clock,
  Dumbbell,
  Scale,
  Award
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { format, addDays, subDays, isToday, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import BodyTrackerDashboard from './BodyTrackerDashboard';

// Types
interface UserProfile {
  age: number;
  gender: 'male' | 'female';
  height: number;
  weight: number;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: 'cutting' | 'bulking' | 'maintenance';
  target_weight?: number;
  avatar_url?: string;
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

const BodyTracker: React.FC = () => {
  // State management
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'calories' | 'workout' | 'progress' | 'sleep'>('dashboard');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile state
  const [profile, setProfile] = useState<UserProfile>({
    age: 25,
    gender: 'male',
    height: 170,
    weight: 70,
    activity_level: 'moderate',
    goal: 'maintenance'
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Data states
  const [calorieEntries, setCalorieEntries] = useState<CalorieEntry[]>([]);
  const [workoutEntries, setWorkoutEntries] = useState<WorkoutEntry[]>([]);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [sleepEntries, setSleepEntries] = useState<SleepEntry[]>([]);

  // Modal states
  const [showCalorieModal, setShowCalorieModal] = useState(false);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);

  // Form states
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
    wake_time: ''
  });

  // Memoized date string
  const dateStr = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);

  // Calculate BMR and TDEE
  const calculateBMR = useCallback((profile: UserProfile) => {
    const { age, gender, height, weight } = profile;
    if (gender === 'male') {
      return (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
      return (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }
  }, []);

  const calculateTDEE = useCallback((bmr: number, activityLevel: string) => {
    const multipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };
    return bmr * (multipliers[activityLevel as keyof typeof multipliers] || 1.55);
  }, []);

  const calculateTargetCalories = useCallback((tdee: number, goal: string) => {
    switch (goal) {
      case 'cutting': return tdee - 500;
      case 'bulking': return tdee + 300;
      case 'maintenance': return tdee;
      default: return tdee;
    }
  }, []);

  // Calculations
  const bmr = useMemo(() => calculateBMR(profile), [profile, calculateBMR]);
  const tdee = useMemo(() => calculateTDEE(bmr, profile.activity_level), [bmr, profile.activity_level, calculateTDEE]);
  const targetCalories = useMemo(() => calculateTargetCalories(tdee, profile.goal), [tdee, profile.goal, calculateTargetCalories]);

  // Daily totals
  const dailyCaloriesIn = useMemo(() => 
    calorieEntries.reduce((sum, entry) => sum + entry.calories, 0), 
    [calorieEntries]
  );

  const dailyCaloriesOut = useMemo(() => 
    workoutEntries.reduce((sum, entry) => sum + entry.calories_burned, 0), 
    [workoutEntries]
  );

  // Date navigation
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

  // Data fetching
  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Fetch all data for the selected date
      const [caloriesRes, workoutsRes, weightsRes, sleepsRes] = await Promise.all([
        supabase.from('calorie_entries').select('*').eq('user_id', user.id).eq('date', dateStr).order('created_at'),
        supabase.from('workout_entries').select('*').eq('user_id', user.id).eq('date', dateStr).order('created_at'),
        supabase.from('weight_entries').select('*').eq('user_id', user.id).eq('date', dateStr).order('created_at'),
        supabase.from('sleep_entries').select('*').eq('user_id', user.id).eq('date', dateStr).order('created_at')
      ]);

      if (caloriesRes.data) setCalorieEntries(caloriesRes.data);
      if (workoutsRes.data) setWorkoutEntries(workoutsRes.data);
      if (weightsRes.data) setWeightEntries(weightsRes.data);
      if (sleepsRes.data) setSleepEntries(sleepsRes.data);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, dateStr]);

  // Fetch weight data for chart
  const fetchWeightData = useCallback(async () => {
    if (!user?.id) return [];
    
    try {
      const { data, error } = await supabase
        .from('weight_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true })
        .limit(30);

      if (error) throw error;
      
      return data?.map(entry => ({
        date: format(new Date(entry.date), 'MMM dd'),
        weight: entry.weight,
        body_fat: entry.body_fat
      })) || [];
    } catch (error) {
      console.error('Error fetching weight data:', error);
      return [];
    }
  }, [user?.id]);

  const [weightChartData, setWeightChartData] = useState<any[]>([]);

  useEffect(() => {
    fetchWeightData().then(setWeightChartData);
  }, [fetchWeightData, weightEntries]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [fetchData]);

  // File upload handler
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
          setProfile(prev => ({ ...prev, avatar_url: resizedDataUrl }));
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

  // CRUD operations
  const handleSaveCalorie = async (e: React.FormEvent) => {
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

      if (editingEntry) {
        const { data, error } = await supabase
          .from('calorie_entries')
          .update(entryData)
          .eq('id', editingEntry.id)
          .select()
          .single();

        if (error) throw error;
        setCalorieEntries(prev => prev.map(entry => entry.id === editingEntry.id ? data : entry));
      } else {
        const { data, error } = await supabase
          .from('calorie_entries')
          .insert([entryData])
          .select()
          .single();

        if (error) throw error;
        setCalorieEntries(prev => [...prev, data]);
      }

      setShowCalorieModal(false);
      setEditingEntry(null);
      setCalorieForm({ food_name: '', calories: '', category: 'breakfast', description: '' });
    } catch (error) {
      console.error('Error saving calorie entry:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workoutForm.exercise_name.trim() || !workoutForm.calories_burned) return;

    setSaving(true);
    try {
      const entryData = {
        exercise_name: workoutForm.exercise_name.trim(),
        type: workoutForm.type,
        duration_minutes: workoutForm.type === 'duration' ? parseInt(workoutForm.duration_minutes) || null : null,
        repetitions: workoutForm.type === 'reps' ? parseInt(workoutForm.repetitions) || null : null,
        calories_burned: parseInt(workoutForm.calories_burned),
        date: dateStr,
        user_id: user?.id
      };

      if (editingEntry) {
        const { data, error } = await supabase
          .from('workout_entries')
          .update(entryData)
          .eq('id', editingEntry.id)
          .select()
          .single();

        if (error) throw error;
        setWorkoutEntries(prev => prev.map(entry => entry.id === editingEntry.id ? data : entry));
      } else {
        const { data, error } = await supabase
          .from('workout_entries')
          .insert([entryData])
          .select()
          .single();

        if (error) throw error;
        setWorkoutEntries(prev => [...prev, data]);
      }

      setShowWorkoutModal(false);
      setEditingEntry(null);
      setWorkoutForm({ exercise_name: '', type: 'duration', duration_minutes: '', repetitions: '', calories_burned: '' });
    } catch (error) {
      console.error('Error saving workout entry:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWeight = async (e: React.FormEvent) => {
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

      if (editingEntry) {
        const { data, error } = await supabase
          .from('weight_entries')
          .update(entryData)
          .eq('id', editingEntry.id)
          .select()
          .single();

        if (error) throw error;
        setWeightEntries(prev => prev.map(entry => entry.id === editingEntry.id ? data : entry));
      } else {
        const { data, error } = await supabase
          .from('weight_entries')
          .insert([entryData])
          .select()
          .single();

        if (error) throw error;
        setWeightEntries(prev => [...prev, data]);
      }

      setShowWeightModal(false);
      setEditingEntry(null);
      setWeightForm({ weight: '', body_fat: '' });
    } catch (error) {
      console.error('Error saving weight entry:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSleep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sleepForm.sleep_time || !sleepForm.wake_time) return;

    setSaving(true);
    try {
      // Calculate duration
      const sleepTime = new Date(`2000-01-01T${sleepForm.sleep_time}:00`);
      const wakeTime = new Date(`2000-01-01T${sleepForm.wake_time}:00`);
      
      let duration = (wakeTime.getTime() - sleepTime.getTime()) / (1000 * 60 * 60);
      if (duration < 0) duration += 24; // Handle overnight sleep

      const entryData = {
        sleep_time: sleepForm.sleep_time,
        wake_time: sleepForm.wake_time,
        duration_hours: Math.round(duration * 10) / 10,
        date: dateStr,
        user_id: user?.id
      };

      if (editingEntry) {
        const { data, error } = await supabase
          .from('sleep_entries')
          .update(entryData)
          .eq('id', editingEntry.id)
          .select()
          .single();

        if (error) throw error;
        setSleepEntries(prev => prev.map(entry => entry.id === editingEntry.id ? data : entry));
      } else {
        const { data, error } = await supabase
          .from('sleep_entries')
          .insert([entryData])
          .select()
          .single();

        if (error) throw error;
        setSleepEntries(prev => [...prev, data]);
      }

      setShowSleepModal(false);
      setEditingEntry(null);
      setSleepForm({ sleep_time: '', wake_time: '' });
    } catch (error) {
      console.error('Error saving sleep entry:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (type: string, id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const { error } = await supabase
        .from(`${type}_entries`)
        .delete()
        .eq('id', id);

      if (error) throw error;

      switch (type) {
        case 'calorie':
          setCalorieEntries(prev => prev.filter(entry => entry.id !== id));
          break;
        case 'workout':
          setWorkoutEntries(prev => prev.filter(entry => entry.id !== id));
          break;
        case 'weight':
          setWeightEntries(prev => prev.filter(entry => entry.id !== id));
          break;
        case 'sleep':
          setSleepEntries(prev => prev.filter(entry => entry.id !== id));
          break;
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const openEditModal = (type: string, entry: any) => {
    setEditingEntry(entry);
    
    switch (type) {
      case 'calorie':
        setCalorieForm({
          food_name: entry.food_name,
          calories: entry.calories.toString(),
          category: entry.category,
          description: entry.description || ''
        });
        setShowCalorieModal(true);
        break;
      case 'workout':
        setWorkoutForm({
          exercise_name: entry.exercise_name,
          type: entry.type,
          duration_minutes: entry.duration_minutes?.toString() || '',
          repetitions: entry.repetitions?.toString() || '',
          calories_burned: entry.calories_burned.toString()
        });
        setShowWorkoutModal(true);
        break;
      case 'weight':
        setWeightForm({
          weight: entry.weight.toString(),
          body_fat: entry.body_fat?.toString() || ''
        });
        setShowWeightModal(true);
        break;
      case 'sleep':
        setSleepForm({
          sleep_time: entry.sleep_time,
          wake_time: entry.wake_time
        });
        setShowSleepModal(true);
        break;
    }
  };

  // Calculate sleep duration preview
  const sleepDurationPreview = useMemo(() => {
    if (!sleepForm.sleep_time || !sleepForm.wake_time) return null;
    
    const sleepTime = new Date(`2000-01-01T${sleepForm.sleep_time}:00`);
    const wakeTime = new Date(`2000-01-01T${sleepForm.wake_time}:00`);
    
    let duration = (wakeTime.getTime() - sleepTime.getTime()) / (1000 * 60 * 60);
    if (duration < 0) duration += 24;
    
    return Math.round(duration * 10) / 10;
  }, [sleepForm.sleep_time, sleepForm.wake_time]);

  // Get sleep quality status
  const getSleepQuality = (hours: number) => {
    if (hours >= 7) return { label: 'Baik', color: 'text-green-600', bg: 'bg-green-50 border-green-200' };
    if (hours >= 6) return { label: 'Cukup', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' };
    return { label: 'Kurang', color: 'text-red-600', bg: 'bg-red-50 border-red-200' };
  };

  // Get calorie status
  const getCalorieStatus = () => {
    const remaining = targetCalories - dailyCaloriesIn;
    if (remaining > 200) return { label: 'Masih bisa makan', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' };
    if (remaining > 0) return { label: 'Mendekati target', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' };
    if (remaining > -200) return { label: 'Target tercapai', color: 'text-green-600', bg: 'bg-green-50 border-green-200' };
    return { label: 'Berlebihan', color: 'text-red-600', bg: 'bg-red-50 border-red-200' };
  };

  const calorieStatus = getCalorieStatus();

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
      {/* Tab Navigation */}
      <div className="card animate-fadeIn">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3, color: 'text-blue-600' },
              { id: 'profile', label: 'Profil', icon: User, color: 'text-purple-600' },
              { id: 'calories', label: 'Kalori', icon: Utensils, color: 'text-green-600' },
              { id: 'workout', label: 'Workout', icon: Dumbbell, color: 'text-orange-600' },
              { id: 'progress', label: 'Progress', icon: TrendingUp, color: 'text-indigo-600' },
              { id: 'sleep', label: 'Sleep', icon: Moon, color: 'text-purple-600' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? `border-blue-500 ${tab.color}`
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
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
                  {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: { localize: { day: (n: number) => ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][n], month: (n: number) => ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][n] } } })}
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
                Hari Ini
              </button>
            )}
          </div>
        </div>
      )}

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && <BodyTrackerDashboard />}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Profile Card */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <h2 className="card-title">Profil Pengguna</h2>
              </div>
              {!isEditingProfile && (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="btn-secondary text-sm"
                >
                  <Edit2 className="w-3 h-3 mr-1.5" />
                  Edit Profil
                </button>
              )}
            </div>

            {isEditingProfile ? (
              <form onSubmit={(e) => { e.preventDefault(); setIsEditingProfile(false); }} className="space-y-6">
                {/* Avatar Upload */}
                <div className="flex items-center space-x-6">
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
                      className="btn-secondary text-sm disabled:opacity-50"
                    >
                      <Upload className="w-3 h-3 mr-1.5" />
                      {uploading ? 'Uploading...' : 'Upload Foto'}
                    </button>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                  </div>
                </div>

                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Informasi Dasar
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Umur (tahun)
                      </label>
                      <input
                        type="number"
                        value={profile.age}
                        onChange={(e) => setProfile(prev => ({ ...prev, age: parseInt(e.target.value) || 0 }))}
                        className="input"
                        min="10"
                        max="100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Gender
                      </label>
                      <select
                        value={profile.gender}
                        onChange={(e) => setProfile(prev => ({ ...prev, gender: e.target.value as 'male' | 'female' }))}
                        className="input"
                      >
                        <option value="male">Pria</option>
                        <option value="female">Wanita</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Tinggi (cm)
                      </label>
                      <input
                        type="number"
                        value={profile.height}
                        onChange={(e) => setProfile(prev => ({ ...prev, height: parseInt(e.target.value) || 0 }))}
                        className="input"
                        min="100"
                        max="250"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Berat Badan (kg)
                      </label>
                      <input
                        type="number"
                        value={profile.weight}
                        onChange={(e) => setProfile(prev => ({ ...prev, weight: parseInt(e.target.value) || 0 }))}
                        className="input"
                        min="30"
                        max="200"
                        step="0.1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Tingkat Aktivitas
                    </label>
                    <select
                      value={profile.activity_level}
                      onChange={(e) => setProfile(prev => ({ ...prev, activity_level: e.target.value as any }))}
                      className="input"
                    >
                      <option value="sedentary">Sedentary (jarang aktivitas)</option>
                      <option value="light">Light (ringan, 1-3x latihan per minggu)</option>
                      <option value="moderate">Moderate (sedang, 3-5x latihan per minggu)</option>
                      <option value="active">Active (aktif, latihan intensif 6-7x per minggu)</option>
                      <option value="very_active">Very Active (sangat aktif, latihan berat setiap hari)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Target Fitness
                    </label>
                    <select
                      value={profile.goal}
                      onChange={(e) => setProfile(prev => ({ ...prev, goal: e.target.value as any }))}
                      className="input"
                    >
                      <option value="cutting">Cutting (menurunkan berat badan)</option>
                      <option value="bulking">Bulking (menaikkan berat badan)</option>
                      <option value="maintenance">Maintenance (mempertahankan berat badan)</option>
                    </select>
                  </div>

                  {profile.goal !== 'maintenance' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Target Berat Badan (kg)
                      </label>
                      <input
                        type="number"
                        value={profile.target_weight || ''}
                        onChange={(e) => setProfile(prev => ({ ...prev, target_weight: parseFloat(e.target.value) || undefined }))}
                        className="input"
                        min="30"
                        max="200"
                        step="0.1"
                        placeholder="Opsional"
                      />
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    <Save className="w-3 h-3 mr-1.5" />
                    Simpan Profil
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="btn-secondary"
                  >
                    Batal
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                {/* Profile Display */}
                <div className="flex items-center space-x-6">
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
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {profile.gender === 'male' ? 'Pria' : 'Wanita'}, {profile.age} tahun
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {profile.height} cm • {profile.weight} kg
                    </p>
                    <p className="text-gray-500 text-sm">
                      {profile.activity_level === 'sedentary' && 'Sedentary'}
                      {profile.activity_level === 'light' && 'Light Activity'}
                      {profile.activity_level === 'moderate' && 'Moderate Activity'}
                      {profile.activity_level === 'active' && 'Active'}
                      {profile.activity_level === 'very_active' && 'Very Active'}
                    </p>
                  </div>
                </div>

                {/* Metabolism Calculations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2 text-sm">BMR (Basal Metabolic Rate)</h4>
                    <div className="text-2xl font-bold text-blue-600 mb-1">{Math.round(bmr)}</div>
                    <p className="text-blue-700 text-xs">Kalori yang dibutuhkan tubuh saat istirahat</p>
                  </div>

                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <h4 className="font-medium text-green-900 mb-2 text-sm">TDEE (Total Daily Energy)</h4>
                    <div className="text-2xl font-bold text-green-600 mb-1">{Math.round(tdee)}</div>
                    <p className="text-green-700 text-xs">Total kalori yang dibutuhkan per hari</p>
                  </div>
                </div>

                {/* Target Information */}
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <h4 className="font-medium text-purple-900 mb-2 text-sm">Target Kalori Harian</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-purple-600">{Math.round(targetCalories)}</div>
                      <p className="text-purple-700 text-xs">
                        {profile.goal === 'cutting' && 'Defisit 500 kalori untuk menurunkan berat badan'}
                        {profile.goal === 'bulking' && 'Surplus 300 kalori untuk menaikkan berat badan'}
                        {profile.goal === 'maintenance' && 'Kalori sesuai TDEE untuk mempertahankan berat badan'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-purple-900 capitalize">
                        {profile.goal === 'cutting' && 'Cutting'}
                        {profile.goal === 'bulking' && 'Bulking'}
                        {profile.goal === 'maintenance' && 'Maintenance'}
                      </div>
                      {profile.target_weight && (
                        <div className="text-xs text-purple-700">
                          Target: {profile.target_weight} kg
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Calculation Explanation */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3 text-sm">Penjelasan:</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• BMR dihitung menggunakan rumus Mifflin-St Jeor</li>
                    <li>• TDEE = BMR × faktor aktivitas harian</li>
                    <li>• Digunakan sebagai dasar perhitungan target kalori</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Calories Tab */}
      {activeTab === 'calories' && (
        <div className="space-y-6">
          {/* Calorie Summary */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <Utensils className="w-4 h-4 text-white" />
                </div>
                <h2 className="card-title">Kalori Tracker</h2>
              </div>
              <button
                onClick={() => setShowCalorieModal(true)}
                className="btn-primary text-sm"
              >
                <Plus className="w-3 h-3 mr-1.5" />
                Tambah Makanan
              </button>
            </div>

            {/* Daily Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                <h3 className="font-medium text-green-900 mb-2 text-sm">Target Kalori</h3>
                <div className="text-2xl font-bold text-green-600">{Math.round(targetCalories)}</div>
                <p className="text-green-700 text-xs">Kalori harian yang dibutuhkan</p>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <h3 className="font-medium text-blue-900 mb-2 text-sm">Kalori Masuk</h3>
                <div className="text-2xl font-bold text-blue-600">{dailyCaloriesIn}</div>
                <p className="text-blue-700 text-xs">Total kalori dari makanan</p>
              </div>

              <div className={`p-4 rounded-xl border ${calorieStatus.bg}`}>
                <h3 className={`font-medium mb-2 text-sm ${calorieStatus.color}`}>Status</h3>
                <div className={`text-2xl font-bold ${calorieStatus.color}`}>
                  {Math.abs(targetCalories - dailyCaloriesIn)}
                </div>
                <p className={`text-xs ${calorieStatus.color}`}>{calorieStatus.label}</p>
              </div>
            </div>

            {/* Calorie Entries */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 text-sm">Makanan Hari Ini</h3>
              
              {calorieEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Utensils className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Belum ada makanan yang dicatat</p>
                  <button
                    onClick={() => setShowCalorieModal(true)}
                    className="text-blue-600 hover:text-blue-700 text-xs mt-1"
                  >
                    Tambah makanan pertama
                  </button>
                </div>
              ) : (
                calorieEntries.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors stagger-item"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-gray-900 text-sm">{entry.food_name}</h4>
                          <span className="badge badge-gray text-xs">{entry.category}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{entry.calories} kalori</p>
                        {entry.description && (
                          <p className="text-xs text-gray-500">{entry.description}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => openEditModal('calorie', entry)}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteEntry('calorie', entry.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
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
        <div className="space-y-6">
          <div className="card animate-fadeIn">
            <div className="card-header">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Dumbbell className="w-4 h-4 text-white" />
                </div>
                <h2 className="card-title">Workout Tracker</h2>
              </div>
              <button
                onClick={() => setShowWorkoutModal(true)}
                className="btn-primary text-sm"
              >
                <Plus className="w-3 h-3 mr-1.5" />
                Tambah Workout
              </button>
            </div>

            {/* Daily Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                <h3 className="font-medium text-orange-900 mb-2 text-sm">Total Workout</h3>
                <div className="text-2xl font-bold text-orange-600">{workoutEntries.length}</div>
                <p className="text-orange-700 text-xs">Latihan hari ini</p>
              </div>

              <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                <h3 className="font-medium text-red-900 mb-2 text-sm">Kalori Terbakar</h3>
                <div className="text-2xl font-bold text-red-600">{dailyCaloriesOut}</div>
                <p className="text-red-700 text-xs">Total kalori keluar</p>
              </div>
            </div>

            {/* Workout Entries */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 text-sm">Workout Hari Ini</h3>
              
              {workoutEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Dumbbell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Belum ada workout yang dicatat</p>
                  <button
                    onClick={() => setShowWorkoutModal(true)}
                    className="text-blue-600 hover:text-blue-700 text-xs mt-1"
                  >
                    Tambah workout pertama
                  </button>
                </div>
              ) : (
                workoutEntries.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors stagger-item"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-sm mb-1">{entry.exercise_name}</h4>
                        <div className="flex items-center space-x-3 text-sm text-gray-600">
                          <span>
                            {entry.type === 'duration' 
                              ? `${entry.duration_minutes} menit`
                              : `${entry.repetitions}x`
                            }
                          </span>
                          <span>•</span>
                          <span>{entry.calories_burned} kalori</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => openEditModal('workout', entry)}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteEntry('workout', entry.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
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
          {/* Weight Tracking */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                  <Scale className="w-4 h-4 text-white" />
                </div>
                <h2 className="card-title">Progress & Statistics</h2>
              </div>
              <button
                onClick={() => setShowWeightModal(true)}
                className="btn-primary text-sm"
              >
                <Plus className="w-3 h-3 mr-1.5" />
                Catat Berat
              </button>
            </div>

            {/* Current Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                <h3 className="font-medium text-indigo-900 mb-2 text-sm">Berat Saat Ini</h3>
                <div className="text-2xl font-bold text-indigo-600">
                  {weightEntries.length > 0 ? `${weightEntries[weightEntries.length - 1].weight} kg` : `${profile.weight} kg`}
                </div>
              </div>

              <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                <h3 className="font-medium text-purple-900 mb-2 text-sm">Target</h3>
                <div className="text-2xl font-bold text-purple-600">
                  {profile.target_weight ? `${profile.target_weight} kg` : '-'}
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                <h3 className="font-medium text-green-900 mb-2 text-sm">BMI</h3>
                <div className="text-2xl font-bold text-green-600">
                  {((profile.weight / ((profile.height / 100) ** 2))).toFixed(1)}
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <h3 className="font-medium text-blue-900 mb-2 text-sm">Progress</h3>
                <div className="text-2xl font-bold text-blue-600">
                  {profile.target_weight 
                    ? `${Math.abs(profile.weight - profile.target_weight).toFixed(1)} kg`
                    : '-'
                  }
                </div>
                <p className="text-blue-700 text-xs">
                  {profile.target_weight 
                    ? profile.goal === 'cutting' ? 'to lose' : 'to gain'
                    : 'Set target'
                  }
                </p>
              </div>
            </div>

            {/* Weight Chart */}
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-4 text-sm">Grafik Berat Badan</h3>
              {weightChartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightChartData}>
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
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="#6366f1"
                        strokeWidth={3}
                        dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#6366f1', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-gray-500 text-sm">Belum ada data berat badan</p>
                    <button
                      onClick={() => setShowWeightModal(true)}
                      className="text-blue-600 hover:text-blue-700 text-xs mt-1"
                    >
                      Catat berat badan pertama
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Weight Entries */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 text-sm">Riwayat Berat Badan</h3>
              
              {weightEntries.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <Scale className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Belum ada catatan berat badan</p>
                </div>
              ) : (
                weightEntries.slice().reverse().map((entry, index) => (
                  <div
                    key={entry.id}
                    className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors stagger-item"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <span className="font-medium text-gray-900 text-sm">{entry.weight} kg</span>
                          {entry.body_fat && (
                            <span className="text-sm text-gray-600">Body Fat: {entry.body_fat}%</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(entry.date), 'd MMM yyyy')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => openEditModal('weight', entry)}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteEntry('weight', entry.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
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
          <div className="card animate-fadeIn">
            <div className="card-header">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Moon className="w-4 h-4 text-white" />
                </div>
                <h2 className="card-title">Sleep Tracker</h2>
              </div>
              <button
                onClick={() => setShowSleepModal(true)}
                className="btn-primary text-sm"
              >
                <Plus className="w-3 h-3 mr-1.5" />
                Catat Tidur
              </button>
            </div>

            {/* Sleep Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                <h3 className="font-medium text-purple-900 mb-2 text-sm">Tidur Hari Ini</h3>
                <div className="text-2xl font-bold text-purple-600">
                  {sleepEntries.length > 0 ? `${sleepEntries[0].duration_hours}h` : '-'}
                </div>
                <p className="text-purple-700 text-xs">Durasi tidur</p>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <h3 className="font-medium text-blue-900 mb-2 text-sm">Rata-rata Minggu</h3>
                <div className="text-2xl font-bold text-blue-600">7.2h</div>
                <p className="text-blue-700 text-xs">7 hari terakhir</p>
              </div>

              <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                <h3 className="font-medium text-green-900 mb-2 text-sm">Kualitas</h3>
                <div className="text-2xl font-bold text-green-600">Baik</div>
                <p className="text-green-700 text-xs">Berdasarkan durasi</p>
              </div>
            </div>

            {/* Sleep Entries */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 text-sm">Riwayat Tidur</h3>
              
              {sleepEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Moon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Belum ada catatan tidur</p>
                  <button
                    onClick={() => setShowSleepModal(true)}
                    className="text-blue-600 hover:text-blue-700 text-xs mt-1"
                  >
                    Catat tidur pertama
                  </button>
                </div>
              ) : (
                sleepEntries.map((entry, index) => {
                  const quality = getSleepQuality(entry.duration_hours);
                  return (
                    <div
                      key={entry.id}
                      className={`p-3 border rounded-lg hover:border-gray-300 transition-colors stagger-item ${quality.bg}`}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-1">
                            <span className="font-medium text-gray-900 text-sm">
                              {entry.sleep_time} - {entry.wake_time}
                            </span>
                            <span className={`badge ${quality.bg} ${quality.color} border-0`}>
                              {quality.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            Durasi: {entry.duration_hours} jam
                          </p>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => openEditModal('sleep', entry)}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteEntry('sleep', entry.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Calorie Modal */}
      {showCalorieModal && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingEntry ? 'Edit Makanan' : 'Tambah Makanan'}
                </h3>
                <button
                  onClick={() => {
                    setShowCalorieModal(false);
                    setEditingEntry(null);
                    setCalorieForm({ food_name: '', calories: '', category: 'breakfast', description: '' });
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCalorie} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nama Makanan
                  </label>
                  <input
                    type="text"
                    value={calorieForm.food_name}
                    onChange={(e) => setCalorieForm(prev => ({ ...prev, food_name: e.target.value }))}
                    placeholder="Contoh: Nasi Goreng"
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Kalori
                  </label>
                  <input
                    type="number"
                    value={calorieForm.calories}
                    onChange={(e) => setCalorieForm(prev => ({ ...prev, calories: e.target.value }))}
                    placeholder="Contoh: 350"
                    className="input"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Kategori
                  </label>
                  <select
                    value={calorieForm.category}
                    onChange={(e) => setCalorieForm(prev => ({ ...prev, category: e.target.value as any }))}
                    className="input"
                  >
                    <option value="breakfast">Sarapan</option>
                    <option value="lunch">Makan siang</option>
                    <option value="dinner">Makan sore/malam</option>
                    <option value="snack">Cemilan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Deskripsi (Opsional)
                  </label>
                  <textarea
                    value={calorieForm.description}
                    onChange={(e) => setCalorieForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Contoh: Dengan telur dan sayuran"
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
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Menyimpan...' : editingEntry ? 'Update' : 'Simpan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCalorieModal(false);
                      setEditingEntry(null);
                      setCalorieForm({ food_name: '', calories: '', category: 'breakfast', description: '' });
                    }}
                    className="btn-secondary"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Workout Modal */}
      {showWorkoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingEntry ? 'Edit Workout' : 'Tambah Workout'}
                </h3>
                <button
                  onClick={() => {
                    setShowWorkoutModal(false);
                    setEditingEntry(null);
                    setWorkoutForm({ exercise_name: '', type: 'duration', duration_minutes: '', repetitions: '', calories_burned: '' });
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveWorkout} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nama Latihan
                  </label>
                  <input
                    type="text"
                    value={workoutForm.exercise_name}
                    onChange={(e) => setWorkoutForm(prev => ({ ...prev, exercise_name: e.target.value }))}
                    placeholder="Contoh: Push Up, Lari, Squat"
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tipe Latihan
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={workoutForm.type === 'duration'}
                        onChange={(e) => setWorkoutForm(prev => ({ ...prev, type: e.target.checked ? 'duration' : 'reps' }))}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Durasi (menit)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={workoutForm.type === 'reps'}
                        onChange={(e) => setWorkoutForm(prev => ({ ...prev, type: e.target.checked ? 'reps' : 'duration' }))}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Repetisi</span>
                    </label>
                  </div>
                </div>

                {workoutForm.type === 'duration' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Durasi (menit)
                    </label>
                    <input
                      type="number"
                      value={workoutForm.duration_minutes}
                      onChange={(e) => setWorkoutForm(prev => ({ ...prev, duration_minutes: e.target.value }))}
                      placeholder="Contoh: 30"
                      className="input"
                      min="1"
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Repetisi
                    </label>
                    <input
                      type="number"
                      value={workoutForm.repetitions}
                      onChange={(e) => setWorkoutForm(prev => ({ ...prev, repetitions: e.target.value }))}
                      placeholder="Contoh: 20"
                      className="input"
                      min="1"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Kalori Terbakar
                  </label>
                  <input
                    type="number"
                    value={workoutForm.calories_burned}
                    onChange={(e) => setWorkoutForm(prev => ({ ...prev, calories_burned: e.target.value }))}
                    placeholder="Contoh: 150"
                    className="input"
                    min="1"
                    required
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 btn-primary disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Menyimpan...' : editingEntry ? 'Update' : 'Simpan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowWorkoutModal(false);
                      setEditingEntry(null);
                      setWorkoutForm({ exercise_name: '', type: 'duration', duration_minutes: '', repetitions: '', calories_burned: '' });
                    }}
                    className="btn-secondary"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Weight Modal */}
      {showWeightModal && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingEntry ? 'Edit Berat Badan' : 'Catat Berat Badan'}
                </h3>
                <button
                  onClick={() => {
                    setShowWeightModal(false);
                    setEditingEntry(null);
                    setWeightForm({ weight: '', body_fat: '' });
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveWeight} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Berat Badan (kg)
                  </label>
                  <input
                    type="number"
                    value={weightForm.weight}
                    onChange={(e) => setWeightForm(prev => ({ ...prev, weight: e.target.value }))}
                    placeholder="Contoh: 70.5"
                    className="input"
                    min="30"
                    max="200"
                    step="0.1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Body Fat % (Opsional)
                  </label>
                  <input
                    type="number"
                    value={weightForm.body_fat}
                    onChange={(e) => setWeightForm(prev => ({ ...prev, body_fat: e.target.value }))}
                    placeholder="Contoh: 15.5"
                    className="input"
                    min="5"
                    max="50"
                    step="0.1"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 btn-primary disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Menyimpan...' : editingEntry ? 'Update' : 'Simpan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowWeightModal(false);
                      setEditingEntry(null);
                      setWeightForm({ weight: '', body_fat: '' });
                    }}
                    className="btn-secondary"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Sleep Modal */}
      {showSleepModal && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingEntry ? 'Edit Tidur' : 'Catat Tidur'}
                </h3>
                <button
                  onClick={() => {
                    setShowSleepModal(false);
                    setEditingEntry(null);
                    setSleepForm({ sleep_time: '', wake_time: '' });
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSleep} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Jam Tidur
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Jam Bangun
                  </label>
                  <input
                    type="time"
                    value={sleepForm.wake_time}
                    onChange={(e) => setSleepForm(prev => ({ ...prev, wake_time: e.target.value }))}
                    className="input"
                    required
                  />
                </div>

                {sleepDurationPreview && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        Durasi: {sleepDurationPreview} jam
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 btn-primary disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Menyimpan...' : editingEntry ? 'Update' : 'Simpan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSleepModal(false);
                      setEditingEntry(null);
                      setSleepForm({ sleep_time: '', wake_time: '' });
                    }}
                    className="btn-secondary"
                  >
                    Batal
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