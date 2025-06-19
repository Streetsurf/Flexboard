import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dumbbell, Target, TrendingUp, Calendar, Plus, X, Save, Edit2, Trash2, Activity, Utensils, Scale, BarChart3 } from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, isToday } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

// Types
interface UserProfile {
  id: string;
  age: number;
  gender: 'male' | 'female';
  height: number; // cm
  weight: number; // kg
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  bmr: number;
  tdee: number;
}

interface FitnessGoal {
  id: string;
  mode: 'cutting' | 'bulking' | 'maintenance';
  targetWeight: number;
  targetDate: string;
  dailyCalories: number;
  currentWeight: number;
}

interface CalorieEntry {
  id: string;
  date: string;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  food: string;
  calories: number;
  description?: string;
}

interface WorkoutEntry {
  id: string;
  date: string;
  exercise: string;
  duration?: number; // minutes
  sets?: number;
  reps?: number;
  weight?: number; // kg
  caloriesBurned: number;
}

interface BodyProgress {
  id: string;
  date: string;
  weight: number;
  bodyFat?: number;
}

interface WeeklyStats {
  totalWorkouts: number;
  weightChange: number;
  caloriesBurned: number;
  avgDailyCalories: number;
}

const BodyTracker: React.FC = () => {
  // State management
  const [activeTab, setActiveTab] = useState<'profile' | 'goals' | 'calories' | 'workouts' | 'progress' | 'stats'>('profile');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'profile' | 'goal' | 'calorie' | 'workout' | 'progress'>('profile');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Mock data - in real app, this would come from Supabase
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal | null>(null);
  const [calorieEntries, setCalorieEntries] = useState<CalorieEntry[]>([]);
  const [workoutEntries, setWorkoutEntries] = useState<WorkoutEntry[]>([]);
  const [bodyProgress, setBodyProgress] = useState<BodyProgress[]>([]);

  // Form states
  const [profileForm, setProfileForm] = useState({
    age: 25,
    gender: 'male' as 'male' | 'female',
    height: 170,
    weight: 70,
    activityLevel: 'moderate' as UserProfile['activityLevel']
  });

  const [goalForm, setGoalForm] = useState({
    mode: 'maintenance' as FitnessGoal['mode'],
    targetWeight: 70,
    targetDate: format(new Date(), 'yyyy-MM-dd'),
    currentWeight: 70
  });

  const [calorieForm, setCalorieForm] = useState({
    category: 'breakfast' as CalorieEntry['category'],
    food: '',
    calories: 0,
    description: ''
  });

  const [workoutForm, setWorkoutForm] = useState({
    exercise: '',
    duration: 30,
    sets: 3,
    reps: 10,
    weight: 0
  });

  const [progressForm, setProgressForm] = useState({
    weight: 70,
    bodyFat: 15
  });

  // Calculations
  const calculateBMR = useCallback((age: number, gender: 'male' | 'female', height: number, weight: number): number => {
    if (gender === 'male') {
      return (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
      return (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }
  }, []);

  const calculateTDEE = useCallback((bmr: number, activityLevel: UserProfile['activityLevel']): number => {
    const multipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };
    return bmr * multipliers[activityLevel];
  }, []);

  const calculateCaloriesBurned = useCallback((exercise: string, duration: number, weight: number): number => {
    // MET values for different exercises
    const metValues: { [key: string]: number } = {
      'running': 8.0,
      'weightlifting': 6.0,
      'swimming': 8.0,
      'cycling': 7.5,
      'walking': 3.8,
      'yoga': 3.0,
      'basketball': 8.0,
      'soccer': 10.0,
      'tennis': 8.0,
      'dancing': 5.0
    };
    
    const met = metValues[exercise.toLowerCase()] || 5.0;
    return Math.round((met * weight * duration) / 60);
  }, []);

  const getDailyCalories = useCallback((tdee: number, mode: FitnessGoal['mode']): number => {
    switch (mode) {
      case 'cutting': return Math.round(tdee - 500);
      case 'bulking': return Math.round(tdee + 300);
      case 'maintenance': return Math.round(tdee);
      default: return Math.round(tdee);
    }
  }, []);

  // Initialize data
  useEffect(() => {
    // Initialize with sample data
    const bmr = calculateBMR(profileForm.age, profileForm.gender, profileForm.height, profileForm.weight);
    const tdee = calculateTDEE(bmr, profileForm.activityLevel);
    
    setUserProfile({
      id: '1',
      ...profileForm,
      bmr,
      tdee
    });

    setFitnessGoal({
      id: '1',
      mode: 'maintenance',
      targetWeight: 70,
      targetDate: format(new Date(), 'yyyy-MM-dd'),
      dailyCalories: getDailyCalories(tdee, 'maintenance'),
      currentWeight: 70
    });

    // Sample body progress data for chart
    const progressData: BodyProgress[] = [];
    for (let i = 13; i >= 0; i--) {
      const date = subDays(new Date(), i);
      progressData.push({
        id: `progress-${i}`,
        date: format(date, 'yyyy-MM-dd'),
        weight: 70 + (Math.random() - 0.5) * 2,
        bodyFat: 15 + (Math.random() - 0.5) * 2
      });
    }
    setBodyProgress(progressData);
  }, []);

  // Handlers
  const handleSaveProfile = useCallback(() => {
    const bmr = calculateBMR(profileForm.age, profileForm.gender, profileForm.height, profileForm.weight);
    const tdee = calculateTDEE(bmr, profileForm.activityLevel);
    
    const newProfile: UserProfile = {
      id: userProfile?.id || '1',
      ...profileForm,
      bmr,
      tdee
    };
    
    setUserProfile(newProfile);
    
    // Update goal calories if goal exists
    if (fitnessGoal) {
      const newDailyCalories = getDailyCalories(tdee, fitnessGoal.mode);
      setFitnessGoal(prev => prev ? { ...prev, dailyCalories: newDailyCalories } : null);
    }
    
    setShowModal(false);
    setEditingItem(null);
  }, [profileForm, userProfile, fitnessGoal, calculateBMR, calculateTDEE, getDailyCalories]);

  const handleSaveGoal = useCallback(() => {
    if (!userProfile) return;
    
    const dailyCalories = getDailyCalories(userProfile.tdee, goalForm.mode);
    
    const newGoal: FitnessGoal = {
      id: fitnessGoal?.id || '1',
      ...goalForm,
      dailyCalories
    };
    
    setFitnessGoal(newGoal);
    setShowModal(false);
    setEditingItem(null);
  }, [goalForm, userProfile, fitnessGoal, getDailyCalories]);

  const handleSaveCalorie = useCallback(() => {
    const newEntry: CalorieEntry = {
      id: editingItem?.id || `calorie-${Date.now()}`,
      date: format(selectedDate, 'yyyy-MM-dd'),
      ...calorieForm
    };
    
    if (editingItem) {
      setCalorieEntries(prev => prev.map(entry => entry.id === editingItem.id ? newEntry : entry));
    } else {
      setCalorieEntries(prev => [...prev, newEntry]);
    }
    
    setCalorieForm({ category: 'breakfast', food: '', calories: 0, description: '' });
    setShowModal(false);
    setEditingItem(null);
  }, [calorieForm, selectedDate, editingItem]);

  const handleSaveWorkout = useCallback(() => {
    if (!userProfile) return;
    
    const caloriesBurned = calculateCaloriesBurned(workoutForm.exercise, workoutForm.duration || 30, userProfile.weight);
    
    const newEntry: WorkoutEntry = {
      id: editingItem?.id || `workout-${Date.now()}`,
      date: format(selectedDate, 'yyyy-MM-dd'),
      ...workoutForm,
      caloriesBurned
    };
    
    if (editingItem) {
      setWorkoutEntries(prev => prev.map(entry => entry.id === editingItem.id ? newEntry : entry));
    } else {
      setWorkoutEntries(prev => [...prev, newEntry]);
    }
    
    setWorkoutForm({ exercise: '', duration: 30, sets: 3, reps: 10, weight: 0 });
    setShowModal(false);
    setEditingItem(null);
  }, [workoutForm, selectedDate, editingItem, userProfile, calculateCaloriesBurned]);

  const handleSaveProgress = useCallback(() => {
    const newEntry: BodyProgress = {
      id: editingItem?.id || `progress-${Date.now()}`,
      date: format(selectedDate, 'yyyy-MM-dd'),
      ...progressForm
    };
    
    if (editingItem) {
      setBodyProgress(prev => prev.map(entry => entry.id === editingItem.id ? newEntry : entry));
    } else {
      setBodyProgress(prev => [...prev, newEntry].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    }
    
    setProgressForm({ weight: 70, bodyFat: 15 });
    setShowModal(false);
    setEditingItem(null);
  }, [progressForm, selectedDate, editingItem]);

  const handleEdit = useCallback((type: string, item: any) => {
    setEditingItem(item);
    setModalType(type as any);
    
    switch (type) {
      case 'profile':
        if (userProfile) {
          setProfileForm({
            age: userProfile.age,
            gender: userProfile.gender,
            height: userProfile.height,
            weight: userProfile.weight,
            activityLevel: userProfile.activityLevel
          });
        }
        break;
      case 'goal':
        if (item) {
          setGoalForm({
            mode: item.mode,
            targetWeight: item.targetWeight,
            targetDate: item.targetDate,
            currentWeight: item.currentWeight
          });
        }
        break;
      case 'calorie':
        setCalorieForm({
          category: item.category,
          food: item.food,
          calories: item.calories,
          description: item.description || ''
        });
        break;
      case 'workout':
        setWorkoutForm({
          exercise: item.exercise,
          duration: item.duration || 30,
          sets: item.sets || 3,
          reps: item.reps || 10,
          weight: item.weight || 0
        });
        break;
      case 'progress':
        setProgressForm({
          weight: item.weight,
          bodyFat: item.bodyFat || 15
        });
        break;
    }
    
    setShowModal(true);
  }, [userProfile]);

  const handleDelete = useCallback((type: string, id: string) => {
    switch (type) {
      case 'calorie':
        setCalorieEntries(prev => prev.filter(entry => entry.id !== id));
        break;
      case 'workout':
        setWorkoutEntries(prev => prev.filter(entry => entry.id !== id));
        break;
      case 'progress':
        setBodyProgress(prev => prev.filter(entry => entry.id !== id));
        break;
    }
  }, []);

  const openModal = useCallback((type: typeof modalType) => {
    setModalType(type);
    setEditingItem(null);
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingItem(null);
    setCalorieForm({ category: 'breakfast', food: '', calories: 0, description: '' });
    setWorkoutForm({ exercise: '', duration: 30, sets: 3, reps: 10, weight: 0 });
    setProgressForm({ weight: 70, bodyFat: 15 });
  }, []);

  // Computed values
  const todayCalories = useMemo(() => {
    const today = format(selectedDate, 'yyyy-MM-dd');
    return calorieEntries.filter(entry => entry.date === today);
  }, [calorieEntries, selectedDate]);

  const todayWorkouts = useMemo(() => {
    const today = format(selectedDate, 'yyyy-MM-dd');
    return workoutEntries.filter(entry => entry.date === today);
  }, [workoutEntries, selectedDate]);

  const totalCaloriesIn = useMemo(() => {
    return todayCalories.reduce((sum, entry) => sum + entry.calories, 0);
  }, [todayCalories]);

  const totalCaloriesOut = useMemo(() => {
    return todayWorkouts.reduce((sum, entry) => sum + entry.caloriesBurned, 0);
  }, [todayWorkouts]);

  const netCalories = useMemo(() => {
    return totalCaloriesIn - totalCaloriesOut;
  }, [totalCaloriesIn, totalCaloriesOut]);

  const calorieStatus = useMemo(() => {
    if (!fitnessGoal) return { label: 'Set your goal first', color: 'text-gray-500' };
    
    const target = fitnessGoal.dailyCalories;
    const remaining = target - netCalories;
    
    if (remaining > 200) return { label: 'Masih bisa makan', color: 'text-green-600' };
    if (remaining > 0) return { label: 'Hampir tercapai', color: 'text-yellow-600' };
    if (remaining >= -100) return { label: 'Target tercapai', color: 'text-green-600' };
    if (remaining >= -300) return { label: 'Sedikit berlebih', color: 'text-orange-600' };
    return { label: 'Berlebihan', color: 'text-red-600' };
  }, [fitnessGoal, netCalories]);

  const weeklyStats = useMemo((): WeeklyStats => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    
    const weekWorkouts = workoutEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= weekStart && entryDate <= weekEnd;
    });
    
    const weekCalories = calorieEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= weekStart && entryDate <= weekEnd;
    });
    
    const currentWeight = bodyProgress[bodyProgress.length - 1]?.weight || 0;
    const weekAgoWeight = bodyProgress[bodyProgress.length - 8]?.weight || currentWeight;
    
    return {
      totalWorkouts: weekWorkouts.length,
      weightChange: currentWeight - weekAgoWeight,
      caloriesBurned: weekWorkouts.reduce((sum, entry) => sum + entry.caloriesBurned, 0),
      avgDailyCalories: weekCalories.length > 0 ? weekCalories.reduce((sum, entry) => sum + entry.calories, 0) / 7 : 0
    };
  }, [workoutEntries, calorieEntries, bodyProgress]);

  const getActivityLevelLabel = (level: UserProfile['activityLevel']) => {
    const labels = {
      sedentary: 'Sedentary (Jarang aktivitas)',
      light: 'Light (1-3x latihan per minggu)',
      moderate: 'Moderate (3-5x latihan per minggu)',
      active: 'Active (6-7x latihan per minggu)',
      very_active: 'Very Active (Latihan berat setiap hari)'
    };
    return labels[level];
  };

  const getModeLabel = (mode: FitnessGoal['mode']) => {
    const labels = {
      cutting: 'Cutting (Menurunkan berat badan)',
      bulking: 'Bulking (Menaikkan berat badan)',
      maintenance: 'Maintenance (Mempertahankan berat badan)'
    };
    return labels[mode];
  };

  const getModeColor = (mode: FitnessGoal['mode']) => {
    const colors = {
      cutting: 'text-red-600 bg-red-50 border-red-200',
      bulking: 'text-green-600 bg-green-50 border-green-200',
      maintenance: 'text-blue-600 bg-blue-50 border-blue-200'
    };
    return colors[mode];
  };

  const getCategoryLabel = (category: CalorieEntry['category']) => {
    const labels = {
      breakfast: 'Sarapan',
      lunch: 'Makan Siang',
      dinner: 'Makan Malam',
      snack: 'Cemilan'
    };
    return labels[category];
  };

  const chartData = useMemo(() => {
    return bodyProgress.map(entry => ({
      date: format(new Date(entry.date), 'MMM dd'),
      weight: entry.weight,
      bodyFat: entry.bodyFat || 0
    }));
  }, [bodyProgress]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card animate-fadeIn">
        <div className="card-header">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-white" />
            </div>
            <h2 className="card-title">Body Tracker</h2>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-6">
            {[
              { id: 'profile', label: 'Profil', icon: <Activity className="w-4 h-4" /> },
              { id: 'goals', label: 'Target', icon: <Target className="w-4 h-4" /> },
              { id: 'calories', label: 'Kalori', icon: <Utensils className="w-4 h-4" /> },
              { id: 'workouts', label: 'Workout', icon: <Dumbbell className="w-4 h-4" /> },
              { id: 'progress', label: 'Progress', icon: <Scale className="w-4 h-4" /> },
              { id: 'stats', label: 'Statistik', icon: <BarChart3 className="w-4 h-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200 flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="animate-fadeIn">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {userProfile ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Informasi Dasar</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Umur:</span>
                        <span className="font-medium">{userProfile.age} tahun</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Gender:</span>
                        <span className="font-medium">{userProfile.gender === 'male' ? 'Pria' : 'Wanita'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tinggi:</span>
                        <span className="font-medium">{userProfile.height} cm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Berat:</span>
                        <span className="font-medium">{userProfile.weight} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Aktivitas:</span>
                        <span className="font-medium text-xs">{getActivityLevelLabel(userProfile.activityLevel)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleEdit('profile', userProfile)}
                      className="w-full btn-primary"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit Profil
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Perhitungan Metabolisme</h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-blue-700 font-medium">BMR (Basal Metabolic Rate)</span>
                          <span className="text-xl font-bold text-blue-600">{Math.round(userProfile.bmr)}</span>
                        </div>
                        <p className="text-xs text-blue-600">Kalori yang dibutuhkan tubuh saat istirahat</p>
                      </div>
                      
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-green-700 font-medium">TDEE (Total Daily Energy)</span>
                          <span className="text-xl font-bold text-green-600">{Math.round(userProfile.tdee)}</span>
                        </div>
                        <p className="text-xs text-green-600">Total kalori yang dibutuhkan per hari</p>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Penjelasan:</h4>
                      <ul className="text-xs text-gray-600 space-y-1">
                        <li>• BMR dihitung menggunakan rumus Mifflin-St Jeor</li>
                        <li>• TDEE = BMR × faktor aktivitas harian</li>
                        <li>• Digunakan sebagai dasar perhitungan target kalori</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Belum ada profil. Buat profil untuk memulai tracking.</p>
                  <button
                    onClick={() => openModal('profile')}
                    className="btn-primary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Buat Profil
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Goals Tab */}
          {activeTab === 'goals' && (
            <div className="space-y-6">
              {fitnessGoal ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Target Fitness</h3>
                    <div className={`p-4 rounded-lg border ${getModeColor(fitnessGoal.mode)}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Mode:</span>
                        <span className="font-bold">{getModeLabel(fitnessGoal.mode)}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Target Berat:</span>
                        <span className="font-medium">{fitnessGoal.targetWeight} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Berat Saat Ini:</span>
                        <span className="font-medium">{fitnessGoal.currentWeight} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Target Date:</span>
                        <span className="font-medium">{format(new Date(fitnessGoal.targetDate), 'dd MMM yyyy')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sisa Hari:</span>
                        <span className="font-medium">
                          {Math.max(0, Math.ceil((new Date(fitnessGoal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} hari
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleEdit('goal', fitnessGoal)}
                      className="w-full btn-primary"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit Target
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Kalori Harian</h3>
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-purple-700 font-medium">Target Kalori Harian</span>
                        <span className="text-2xl font-bold text-purple-600">{fitnessGoal.dailyCalories}</span>
                      </div>
                      <p className="text-xs text-purple-600">
                        {fitnessGoal.mode === 'cutting' && 'TDEE - 500 kalori (defisit untuk menurunkan berat)'}
                        {fitnessGoal.mode === 'bulking' && 'TDEE + 300 kalori (surplus untuk menaikkan berat)'}
                        {fitnessGoal.mode === 'maintenance' && 'Sesuai TDEE (mempertahankan berat badan)'}
                      </p>
                    </div>
                    
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Tips:</h4>
                      <ul className="text-xs text-gray-600 space-y-1">
                        <li>• Cutting: Defisit 500 kalori = turun ~0.5kg/minggu</li>
                        <li>• Bulking: Surplus 300 kalori = naik ~0.3kg/minggu</li>
                        <li>• Maintenance: Kalori seimbang = berat stabil</li>
                        <li>• Konsistensi lebih penting dari kesempurnaan</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Belum ada target fitness. Set target untuk memulai journey.</p>
                  <button
                    onClick={() => openModal('goal')}
                    className="btn-primary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Set Target
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Calories Tab */}
          {activeTab === 'calories' && (
            <div className="space-y-6">
              {/* Date Selector */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Tracking Kalori - {format(selectedDate, 'dd MMM yyyy')}
                </h3>
                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    value={format(selectedDate, 'yyyy-MM-dd')}
                    onChange={(e) => setSelectedDate(new Date(e.target.value))}
                    className="input text-sm"
                  />
                  <button
                    onClick={() => openModal('calorie')}
                    className="btn-primary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah
                  </button>
                </div>
              </div>

              {/* Calorie Summary */}
              {fitnessGoal && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{totalCaloriesIn}</div>
                      <div className="text-xs text-blue-600">Kalori Masuk</div>
                    </div>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{totalCaloriesOut}</div>
                      <div className="text-xs text-red-600">Kalori Keluar</div>
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{netCalories}</div>
                      <div className="text-xs text-purple-600">Net Kalori</div>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">{fitnessGoal.dailyCalories}</div>
                      <div className="text-xs text-gray-600">Target Harian</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Status */}
              {fitnessGoal && (
                <div className="p-4 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">Status Kalori Hari Ini:</span>
                    <span className={`font-bold ${calorieStatus.color}`}>{calorieStatus.label}</span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    {fitnessGoal.dailyCalories - netCalories > 0 
                      ? `Sisa ${fitnessGoal.dailyCalories - netCalories} kalori lagi`
                      : `Kelebihan ${netCalories - fitnessGoal.dailyCalories} kalori`
                    }
                  </div>
                </div>
              )}

              {/* Calorie Entries */}
              <div className="space-y-4">
                {['breakfast', 'lunch', 'dinner', 'snack'].map(category => {
                  const categoryEntries = todayCalories.filter(entry => entry.category === category);
                  const categoryTotal = categoryEntries.reduce((sum, entry) => sum + entry.calories, 0);
                  
                  return (
                    <div key={category} className="p-4 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">{getCategoryLabel(category as CalorieEntry['category'])}</h4>
                        <span className="text-sm font-medium text-gray-600">{categoryTotal} kal</span>
                      </div>
                      
                      {categoryEntries.length > 0 ? (
                        <div className="space-y-2">
                          {categoryEntries.map(entry => (
                            <div key={entry.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex-1">
                                <div className="font-medium text-sm">{entry.food}</div>
                                {entry.description && (
                                  <div className="text-xs text-gray-500">{entry.description}</div>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium">{entry.calories} kal</span>
                                <button
                                  onClick={() => handleEdit('calorie', entry)}
                                  className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                                  title="Edit"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDelete('calorie', entry.id)}
                                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          Belum ada makanan untuk {getCategoryLabel(category as CalorieEntry['category']).toLowerCase()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Workouts Tab */}
          {activeTab === 'workouts' && (
            <div className="space-y-6">
              {/* Date Selector */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Workout - {format(selectedDate, 'dd MMM yyyy')}
                </h3>
                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    value={format(selectedDate, 'yyyy-MM-dd')}
                    onChange={(e) => setSelectedDate(new Date(e.target.value))}
                    className="input text-sm"
                  />
                  <button
                    onClick={() => openModal('workout')}
                    className="btn-primary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah
                  </button>
                </div>
              </div>

              {/* Workout Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{todayWorkouts.length}</div>
                    <div className="text-xs text-green-600">Total Workout</div>
                  </div>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{totalCaloriesOut}</div>
                    <div className="text-xs text-orange-600">Kalori Terbakar</div>
                  </div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {todayWorkouts.reduce((sum, entry) => sum + (entry.duration || 0), 0)}
                    </div>
                    <div className="text-xs text-purple-600">Total Menit</div>
                  </div>
                </div>
              </div>

              {/* Workout Entries */}
              <div className="space-y-4">
                {todayWorkouts.length > 0 ? (
                  todayWorkouts.map(entry => (
                    <div key={entry.id} className="p-4 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 capitalize">{entry.exercise}</h4>
                          <div className="text-sm text-gray-600 mt-1">
                            {entry.duration && `${entry.duration} menit`}
                            {entry.sets && entry.reps && ` • ${entry.sets} sets × ${entry.reps} reps`}
                            {entry.weight && ` • ${entry.weight} kg`}
                          </div>
                          <div className="text-sm font-medium text-orange-600 mt-1">
                            🔥 {entry.caloriesBurned} kalori terbakar
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit('workout', entry)}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete('workout', entry.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Dumbbell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">Belum ada workout hari ini</p>
                    <button
                      onClick={() => openModal('workout')}
                      className="btn-primary"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Tambah Workout
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Progress Tab */}
          {activeTab === 'progress' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Body Progress</h3>
                <button
                  onClick={() => openModal('progress')}
                  className="btn-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Data
                </button>
              </div>

              {/* Weight Chart */}
              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-4">Grafik Berat Badan (2 Minggu Terakhir)</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        domain={['dataMin - 1', 'dataMax + 1']}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="weight"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.1}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Progress Entries */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Data Terbaru</h4>
                {bodyProgress.slice(-7).reverse().map(entry => {
                  const isToday = format(new Date(entry.date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  
                  return (
                    <div key={entry.id} className={`p-4 rounded-lg border ${isToday ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">
                              {format(new Date(entry.date), 'dd MMM yyyy')}
                            </span>
                            {isToday && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Hari ini</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Berat: {entry.weight} kg
                            {entry.bodyFat && ` • Body Fat: ${entry.bodyFat.toFixed(1)}%`}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit('progress', entry)}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete('progress', entry.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Statistik Mingguan</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{weeklyStats.totalWorkouts}</div>
                    <div className="text-xs text-green-600">Total Workout</div>
                    <div className="text-xs text-green-500 mt-1">Minggu ini</div>
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {weeklyStats.weightChange > 0 ? '+' : ''}{weeklyStats.weightChange.toFixed(1)}
                    </div>
                    <div className="text-xs text-blue-600">Perubahan Berat (kg)</div>
                    <div className="text-xs text-blue-500 mt-1">vs minggu lalu</div>
                  </div>
                </div>
                
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{weeklyStats.caloriesBurned}</div>
                    <div className="text-xs text-orange-600">Kalori Terbakar</div>
                    <div className="text-xs text-orange-500 mt-1">Total minggu ini</div>
                  </div>
                </div>
                
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{Math.round(weeklyStats.avgDailyCalories)}</div>
                    <div className="text-xs text-purple-600">Rata-rata Kalori</div>
                    <div className="text-xs text-purple-500 mt-1">Per hari minggu ini</div>
                  </div>
                </div>
              </div>

              {/* Insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-white rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">📈 Progress Insights</h4>
                  <div className="space-y-2 text-sm">
                    {weeklyStats.totalWorkouts >= 3 && (
                      <div className="text-green-600">✅ Konsisten workout minggu ini!</div>
                    )}
                    {weeklyStats.totalWorkouts < 3 && (
                      <div className="text-yellow-600">⚠️ Coba tambah frekuensi workout</div>
                    )}
                    {Math.abs(weeklyStats.weightChange) < 0.5 && (
                      <div className="text-blue-600">📊 Berat badan stabil</div>
                    )}
                    {weeklyStats.caloriesBurned > 1000 && (
                      <div className="text-orange-600">🔥 Pembakaran kalori excellent!</div>
                    )}
                  </div>
                </div>
                
                <div className="p-4 bg-white rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">💡 Rekomendasi</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    {weeklyStats.totalWorkouts < 3 && (
                      <div>• Target minimal 3x workout per minggu</div>
                    )}
                    {weeklyStats.avgDailyCalories < 1200 && (
                      <div>• Pastikan asupan kalori cukup untuk metabolisme</div>
                    )}
                    {weeklyStats.caloriesBurned < 500 && (
                      <div>• Tingkatkan intensitas atau durasi workout</div>
                    )}
                    <div>• Konsistensi lebih penting dari intensitas</div>
                    <div>• Jangan lupa istirahat yang cukup</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingItem ? 'Edit' : 'Tambah'} {
                    modalType === 'profile' ? 'Profil' :
                    modalType === 'goal' ? 'Target' :
                    modalType === 'calorie' ? 'Kalori' :
                    modalType === 'workout' ? 'Workout' :
                    modalType === 'progress' ? 'Progress' : ''
                  }
                </h3>
                <button
                  onClick={closeModal}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Profile Form */}
              {modalType === 'profile' && (
                <form onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Umur</label>
                      <input
                        type="number"
                        value={profileForm.age}
                        onChange={(e) => setProfileForm({...profileForm, age: parseInt(e.target.value) || 0})}
                        className="input"
                        min="10"
                        max="100"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                      <select
                        value={profileForm.gender}
                        onChange={(e) => setProfileForm({...profileForm, gender: e.target.value as 'male' | 'female'})}
                        className="input"
                        required
                      >
                        <option value="male">Pria</option>
                        <option value="female">Wanita</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tinggi (cm)</label>
                      <input
                        type="number"
                        value={profileForm.height}
                        onChange={(e) => setProfileForm({...profileForm, height: parseInt(e.target.value) || 0})}
                        className="input"
                        min="100"
                        max="250"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Berat (kg)</label>
                      <input
                        type="number"
                        value={profileForm.weight}
                        onChange={(e) => setProfileForm({...profileForm, weight: parseInt(e.target.value) || 0})}
                        className="input"
                        min="30"
                        max="200"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tingkat Aktivitas</label>
                    <select
                      value={profileForm.activityLevel}
                      onChange={(e) => setProfileForm({...profileForm, activityLevel: e.target.value as UserProfile['activityLevel']})}
                      className="input"
                      required
                    >
                      <option value="sedentary">Sedentary (Jarang aktivitas)</option>
                      <option value="light">Light (1-3x latihan per minggu)</option>
                      <option value="moderate">Moderate (3-5x latihan per minggu)</option>
                      <option value="active">Active (6-7x latihan per minggu)</option>
                      <option value="very_active">Very Active (Latihan berat setiap hari)</option>
                    </select>
                  </div>
                  
                  <div className="flex space-x-3 pt-4">
                    <button type="button" onClick={closeModal} className="flex-1 btn-secondary">
                      Batal
                    </button>
                    <button type="submit" className="flex-1 btn-primary">
                      <Save className="w-4 h-4 mr-2" />
                      Simpan
                    </button>
                  </div>
                </form>
              )}

              {/* Goal Form */}
              {modalType === 'goal' && (
                <form onSubmit={(e) => { e.preventDefault(); handleSaveGoal(); }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mode Target</label>
                    <select
                      value={goalForm.mode}
                      onChange={(e) => setGoalForm({...goalForm, mode: e.target.value as FitnessGoal['mode']})}
                      className="input"
                      required
                    >
                      <option value="cutting">Cutting (Menurunkan berat badan)</option>
                      <option value="bulking">Bulking (Menaikkan berat badan)</option>
                      <option value="maintenance">Maintenance (Mempertahankan berat badan)</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Target Berat (kg)</label>
                      <input
                        type="number"
                        value={goalForm.targetWeight}
                        onChange={(e) => setGoalForm({...goalForm, targetWeight: parseFloat(e.target.value) || 0})}
                        className="input"
                        min="30"
                        max="200"
                        step="0.1"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Berat Saat Ini (kg)</label>
                      <input
                        type="number"
                        value={goalForm.currentWeight}
                        onChange={(e) => setGoalForm({...goalForm, currentWeight: parseFloat(e.target.value) || 0})}
                        className="input"
                        min="30"
                        max="200"
                        step="0.1"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
                    <input
                      type="date"
                      value={goalForm.targetDate}
                      onChange={(e) => setGoalForm({...goalForm, targetDate: e.target.value})}
                      className="input"
                      min={format(new Date(), 'yyyy-MM-dd')}
                      required
                    />
                  </div>
                  
                  <div className="flex space-x-3 pt-4">
                    <button type="button" onClick={closeModal} className="flex-1 btn-secondary">
                      Batal
                    </button>
                    <button type="submit" className="flex-1 btn-primary">
                      <Save className="w-4 h-4 mr-2" />
                      Simpan
                    </button>
                  </div>
                </form>
              )}

              {/* Calorie Form */}
              {modalType === 'calorie' && (
                <form onSubmit={(e) => { e.preventDefault(); handleSaveCalorie(); }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                    <select
                      value={calorieForm.category}
                      onChange={(e) => setCalorieForm({...calorieForm, category: e.target.value as CalorieEntry['category']})}
                      className="input"
                      required
                    >
                      <option value="breakfast">Sarapan</option>
                      <option value="lunch">Makan Siang</option>
                      <option value="dinner">Makan Malam</option>
                      <option value="snack">Cemilan</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Makanan</label>
                    <input
                      type="text"
                      value={calorieForm.food}
                      onChange={(e) => setCalorieForm({...calorieForm, food: e.target.value})}
                      className="input"
                      placeholder="Contoh: Nasi gudeg"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kalori</label>
                    <input
                      type="number"
                      value={calorieForm.calories}
                      onChange={(e) => setCalorieForm({...calorieForm, calories: parseInt(e.target.value) || 0})}
                      className="input"
                      min="1"
                      max="2000"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi (Opsional)</label>
                    <textarea
                      value={calorieForm.description}
                      onChange={(e) => setCalorieForm({...calorieForm, description: e.target.value})}
                      className="textarea"
                      rows={2}
                      placeholder="Contoh: 1 porsi sedang"
                    />
                  </div>
                  
                  <div className="flex space-x-3 pt-4">
                    <button type="button" onClick={closeModal} className="flex-1 btn-secondary">
                      Batal
                    </button>
                    <button type="submit" className="flex-1 btn-primary">
                      <Save className="w-4 h-4 mr-2" />
                      Simpan
                    </button>
                  </div>
                </form>
              )}

              {/* Workout Form */}
              {modalType === 'workout' && (
                <form onSubmit={(e) => { e.preventDefault(); handleSaveWorkout(); }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Olahraga</label>
                    <select
                      value={workoutForm.exercise}
                      onChange={(e) => setWorkoutForm({...workoutForm, exercise: e.target.value})}
                      className="input"
                      required
                    >
                      <option value="">Pilih olahraga</option>
                      <option value="running">Running</option>
                      <option value="weightlifting">Weightlifting</option>
                      <option value="swimming">Swimming</option>
                      <option value="cycling">Cycling</option>
                      <option value="walking">Walking</option>
                      <option value="yoga">Yoga</option>
                      <option value="basketball">Basketball</option>
                      <option value="soccer">Soccer</option>
                      <option value="tennis">Tennis</option>
                      <option value="dancing">Dancing</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Durasi (menit)</label>
                    <input
                      type="number"
                      value={workoutForm.duration}
                      onChange={(e) => setWorkoutForm({...workoutForm, duration: parseInt(e.target.value) || 0})}
                      className="input"
                      min="1"
                      max="300"
                      required
                    />
                  </div>
                  
                  {workoutForm.exercise === 'weightlifting' && (
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sets</label>
                        <input
                          type="number"
                          value={workoutForm.sets}
                          onChange={(e) => setWorkoutForm({...workoutForm, sets: parseInt(e.target.value) || 0})}
                          className="input"
                          min="1"
                          max="20"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reps</label>
                        <input
                          type="number"
                          value={workoutForm.reps}
                          onChange={(e) => setWorkoutForm({...workoutForm, reps: parseInt(e.target.value) || 0})}
                          className="input"
                          min="1"
                          max="50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                        <input
                          type="number"
                          value={workoutForm.weight}
                          onChange={(e) => setWorkoutForm({...workoutForm, weight: parseInt(e.target.value) || 0})}
                          className="input"
                          min="0"
                          max="300"
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex space-x-3 pt-4">
                    <button type="button" onClick={closeModal} className="flex-1 btn-secondary">
                      Batal
                    </button>
                    <button type="submit" className="flex-1 btn-primary">
                      <Save className="w-4 h-4 mr-2" />
                      Simpan
                    </button>
                  </div>
                </form>
              )}

              {/* Progress Form */}
              {modalType === 'progress' && (
                <form onSubmit={(e) => { e.preventDefault(); handleSaveProgress(); }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Berat Badan (kg)</label>
                    <input
                      type="number"
                      value={progressForm.weight}
                      onChange={(e) => setProgressForm({...progressForm, weight: parseFloat(e.target.value) || 0})}
                      className="input"
                      min="30"
                      max="200"
                      step="0.1"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Body Fat (%) - Opsional</label>
                    <input
                      type="number"
                      value={progressForm.bodyFat}
                      onChange={(e) => setProgressForm({...progressForm, bodyFat: parseFloat(e.target.value) || 0})}
                      className="input"
                      min="5"
                      max="50"
                      step="0.1"
                    />
                  </div>
                  
                  <div className="flex space-x-3 pt-4">
                    <button type="button" onClick={closeModal} className="flex-1 btn-secondary">
                      Batal
                    </button>
                    <button type="submit" className="flex-1 btn-primary">
                      <Save className="w-4 h-4 mr-2" />
                      Simpan
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