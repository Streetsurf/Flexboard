import React, { useState, useEffect } from 'react';
import { Dumbbell, Target, Utensils, TrendingUp, BarChart3, Edit2, Trash2, Plus, Save, X, User, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';

interface UserProfile {
  id: string;
  age: number;
  gender: 'male' | 'female';
  height: number; // cm
  weight: number; // kg
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal_mode: 'cutting' | 'bulking' | 'maintenance';
  target_weight?: number;
  body_fat_percentage?: number;
}

interface CalorieEntry {
  id: string;
  food_name: string;
  category: string;
  calories: number;
  description?: string;
  date: string;
  user_id: string;
}

interface WorkoutEntry {
  id: string;
  exercise_name: string;
  duration_minutes?: number;
  repetitions?: number;
  calories_burned: number;
  date: string;
  user_id: string;
}

interface BodyProgress {
  id: string;
  weight: number;
  body_fat_percentage?: number;
  date: string;
  user_id: string;
}

const BodyTracker: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'target' | 'calories' | 'workout' | 'progress' | 'stats'>('profile');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [calorieEntries, setCalorieEntries] = useState<CalorieEntry[]>([]);
  const [workoutEntries, setWorkoutEntries] = useState<WorkoutEntry[]>([]);
  const [bodyProgress, setBodyProgress] = useState<BodyProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAddCalorie, setShowAddCalorie] = useState(false);
  const [showAddWorkout, setShowAddWorkout] = useState(false);
  const [showAddProgress, setShowAddProgress] = useState(false);
  const [editingCalorie, setEditingCalorie] = useState<CalorieEntry | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutEntry | null>(null);
  const [editingProgress, setEditingProgress] = useState<BodyProgress | null>(null);
  const { user } = useAuth();

  // Form states
  const [profileForm, setProfileForm] = useState({
    age: 25,
    gender: 'male' as 'male' | 'female',
    height: 170,
    weight: 70,
    activity_level: 'moderate' as UserProfile['activity_level'],
    goal_mode: 'maintenance' as UserProfile['goal_mode'],
    target_weight: 70,
    body_fat_percentage: 15
  });

  const [calorieForm, setCalorieForm] = useState({
    food_name: '',
    category: 'breakfast',
    calories: 0,
    description: ''
  });

  const [workoutForm, setWorkoutForm] = useState({
    exercise_name: '',
    duration_minutes: 30,
    repetitions: 0,
    calories_burned: 0
  });

  const [progressForm, setProgressForm] = useState({
    weight: 70,
    body_fat_percentage: 15
  });

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchTodayCalories();
      fetchTodayWorkouts();
      fetchRecentProgress();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      // This would fetch from a body_profiles table
      // For now, using mock data
      setUserProfile({
        id: user?.id || '',
        age: 25,
        gender: 'male',
        height: 170,
        weight: 70,
        activity_level: 'moderate',
        goal_mode: 'maintenance',
        target_weight: 70,
        body_fat_percentage: 15
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayCalories = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      // Mock data for now
      setCalorieEntries([
        {
          id: '1',
          food_name: 'Nasi Gudeg',
          category: 'lunch',
          calories: 450,
          description: 'Dengan ayam dan telur',
          date: today,
          user_id: user?.id || ''
        }
      ]);
    } catch (error) {
      console.error('Error fetching calorie entries:', error);
    }
  };

  const fetchTodayWorkouts = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      // Mock data for now
      setWorkoutEntries([
        {
          id: '1',
          exercise_name: 'Push Up',
          repetitions: 20,
          calories_burned: 50,
          date: today,
          user_id: user?.id || ''
        }
      ]);
    } catch (error) {
      console.error('Error fetching workout entries:', error);
    }
  };

  const fetchRecentProgress = async () => {
    try {
      // Mock data for now
      setBodyProgress([
        {
          id: '1',
          weight: 70,
          body_fat_percentage: 15,
          date: format(new Date(), 'yyyy-MM-dd'),
          user_id: user?.id || ''
        }
      ]);
    } catch (error) {
      console.error('Error fetching body progress:', error);
    }
  };

  // BMR Calculation using Mifflin-St Jeor Equation
  const calculateBMR = (profile: UserProfile): number => {
    if (profile.gender === 'male') {
      return (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age) + 5;
    } else {
      return (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age) - 161;
    }
  };

  // TDEE Calculation
  const calculateTDEE = (profile: UserProfile): number => {
    const bmr = calculateBMR(profile);
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };
    return bmr * activityMultipliers[profile.activity_level];
  };

  // Target Calories based on goal
  const calculateTargetCalories = (profile: UserProfile): number => {
    const tdee = calculateTDEE(profile);
    switch (profile.goal_mode) {
      case 'cutting':
        return tdee - 500;
      case 'bulking':
        return tdee + 300;
      case 'maintenance':
      default:
        return tdee;
    }
  };

  const getActivityLevelLabel = (level: UserProfile['activity_level']): string => {
    const labels = {
      sedentary: 'Sedentary (jarang aktivitas)',
      light: 'Light (1-3x latihan per minggu)',
      moderate: 'Moderate (3-5x latihan per minggu)',
      active: 'Active (6-7x latihan per minggu)',
      very_active: 'Very Active (latihan berat setiap hari)'
    };
    return labels[level];
  };

  const getGoalModeLabel = (mode: UserProfile['goal_mode']): string => {
    const labels = {
      cutting: 'Cutting (menurunkan berat badan)',
      bulking: 'Bulking (menaikkan berat badan)',
      maintenance: 'Maintenance (mempertahankan berat badan)'
    };
    return labels[mode];
  };

  const handleSaveProfile = async () => {
    try {
      // Save to database
      setUserProfile({
        id: user?.id || '',
        ...profileForm
      });
      setShowEditProfile(false);
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const handleAddCalorie = async () => {
    try {
      const newEntry: CalorieEntry = {
        id: Date.now().toString(),
        ...calorieForm,
        date: format(new Date(), 'yyyy-MM-dd'),
        user_id: user?.id || ''
      };
      setCalorieEntries([...calorieEntries, newEntry]);
      setCalorieForm({ food_name: '', category: 'breakfast', calories: 0, description: '' });
      setShowAddCalorie(false);
    } catch (error) {
      console.error('Error adding calorie entry:', error);
    }
  };

  const handleEditCalorie = async () => {
    if (!editingCalorie) return;
    try {
      const updatedEntries = calorieEntries.map(entry =>
        entry.id === editingCalorie.id ? { ...editingCalorie, ...calorieForm } : entry
      );
      setCalorieEntries(updatedEntries);
      setEditingCalorie(null);
      setCalorieForm({ food_name: '', category: 'breakfast', calories: 0, description: '' });
      setShowAddCalorie(false);
    } catch (error) {
      console.error('Error editing calorie entry:', error);
    }
  };

  const handleDeleteCalorie = async (id: string) => {
    try {
      setCalorieEntries(calorieEntries.filter(entry => entry.id !== id));
    } catch (error) {
      console.error('Error deleting calorie entry:', error);
    }
  };

  const handleAddWorkout = async () => {
    try {
      const newEntry: WorkoutEntry = {
        id: Date.now().toString(),
        ...workoutForm,
        date: format(new Date(), 'yyyy-MM-dd'),
        user_id: user?.id || ''
      };
      setWorkoutEntries([...workoutEntries, newEntry]);
      setWorkoutForm({ exercise_name: '', duration_minutes: 30, repetitions: 0, calories_burned: 0 });
      setShowAddWorkout(false);
    } catch (error) {
      console.error('Error adding workout entry:', error);
    }
  };

  const handleEditWorkout = async () => {
    if (!editingWorkout) return;
    try {
      const updatedEntries = workoutEntries.map(entry =>
        entry.id === editingWorkout.id ? { ...editingWorkout, ...workoutForm } : entry
      );
      setWorkoutEntries(updatedEntries);
      setEditingWorkout(null);
      setWorkoutForm({ exercise_name: '', duration_minutes: 30, repetitions: 0, calories_burned: 0 });
      setShowAddWorkout(false);
    } catch (error) {
      console.error('Error editing workout entry:', error);
    }
  };

  const handleDeleteWorkout = async (id: string) => {
    try {
      setWorkoutEntries(workoutEntries.filter(entry => entry.id !== id));
    } catch (error) {
      console.error('Error deleting workout entry:', error);
    }
  };

  const handleAddProgress = async () => {
    try {
      const newEntry: BodyProgress = {
        id: Date.now().toString(),
        ...progressForm,
        date: format(new Date(), 'yyyy-MM-dd'),
        user_id: user?.id || ''
      };
      setBodyProgress([...bodyProgress, newEntry]);
      setProgressForm({ weight: 70, body_fat_percentage: 15 });
      setShowAddProgress(false);
    } catch (error) {
      console.error('Error adding progress entry:', error);
    }
  };

  const handleEditProgress = async () => {
    if (!editingProgress) return;
    try {
      const updatedEntries = bodyProgress.map(entry =>
        entry.id === editingProgress.id ? { ...editingProgress, ...progressForm } : entry
      );
      setBodyProgress(updatedEntries);
      setEditingProgress(null);
      setProgressForm({ weight: 70, body_fat_percentage: 15 });
      setShowAddProgress(false);
    } catch (error) {
      console.error('Error editing progress entry:', error);
    }
  };

  const handleDeleteProgress = async (id: string) => {
    try {
      setBodyProgress(bodyProgress.filter(entry => entry.id !== id));
    } catch (error) {
      console.error('Error deleting progress entry:', error);
    }
  };

  const openEditCalorie = (entry: CalorieEntry) => {
    setEditingCalorie(entry);
    setCalorieForm({
      food_name: entry.food_name,
      category: entry.category,
      calories: entry.calories,
      description: entry.description || ''
    });
    setShowAddCalorie(true);
  };

  const openEditWorkout = (entry: WorkoutEntry) => {
    setEditingWorkout(entry);
    setWorkoutForm({
      exercise_name: entry.exercise_name,
      duration_minutes: entry.duration_minutes || 30,
      repetitions: entry.repetitions || 0,
      calories_burned: entry.calories_burned
    });
    setShowAddWorkout(true);
  };

  const openEditProgress = (entry: BodyProgress) => {
    setEditingProgress(entry);
    setProgressForm({
      weight: entry.weight,
      body_fat_percentage: entry.body_fat_percentage || 15
    });
    setShowAddProgress(true);
  };

  const getTotalCaloriesConsumed = (): number => {
    return calorieEntries.reduce((total, entry) => total + entry.calories, 0);
  };

  const getTotalCaloriesBurned = (): number => {
    return workoutEntries.reduce((total, entry) => total + entry.calories_burned, 0);
  };

  const getCalorieStatus = (): { label: string; color: string } => {
    if (!userProfile) return { label: 'Belum ada data', color: 'text-gray-500' };
    
    const targetCalories = calculateTargetCalories(userProfile);
    const consumedCalories = getTotalCaloriesConsumed();
    const burnedCalories = getTotalCaloriesBurned();
    const netCalories = consumedCalories - burnedCalories;
    const remaining = targetCalories - netCalories;

    if (remaining > 200) {
      return { label: 'Masih bisa makan', color: 'text-green-600' };
    } else if (remaining >= 0) {
      return { label: 'Target tercapai', color: 'text-blue-600' };
    } else if (remaining >= -200) {
      return { label: 'Sedikit berlebih', color: 'text-yellow-600' };
    } else {
      return { label: 'Berlebihan', color: 'text-red-600' };
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="card animate-fadeIn">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
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
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <Dumbbell className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Body Tracker</h1>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: 'profile', label: 'Profil', icon: User },
            { id: 'target', label: 'Target', icon: Target },
            { id: 'calories', label: 'Kalori', icon: Utensils },
            { id: 'workout', label: 'Workout', icon: Activity },
            { id: 'progress', label: 'Progress', icon: TrendingUp },
            { id: 'stats', label: 'Statistik', icon: BarChart3 }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && userProfile && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Info */}
          <div className="card animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Informasi Dasar</h3>
              <button
                onClick={() => {
                  setProfileForm({
                    age: userProfile.age,
                    gender: userProfile.gender,
                    height: userProfile.height,
                    weight: userProfile.weight,
                    activity_level: userProfile.activity_level,
                    goal_mode: userProfile.goal_mode,
                    target_weight: userProfile.target_weight || userProfile.weight,
                    body_fat_percentage: userProfile.body_fat_percentage || 15
                  });
                  setShowEditProfile(true);
                }}
                className="flex items-center space-x-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-all duration-200"
                title="Edit Profil"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            </div>

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
                <span className="font-medium text-sm">{getActivityLevelLabel(userProfile.activity_level)}</span>
              </div>
            </div>
          </div>

          {/* Metabolism Calculations */}
          <div className="card animate-fadeIn">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Perhitungan Metabolisme</h3>
            
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-blue-900">BMR (Basal Metabolic Rate)</h4>
                    <p className="text-xs text-blue-700">Kalori yang dibutuhkan tubuh saat istirahat</p>
                  </div>
                  <span className="text-xl font-bold text-blue-600">{Math.round(calculateBMR(userProfile))}</span>
                </div>
              </div>

              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-green-900">TDEE (Total Daily Energy)</h4>
                    <p className="text-xs text-green-700">Total kalori yang dibutuhkan per hari</p>
                  </div>
                  <span className="text-xl font-bold text-green-600">{Math.round(calculateTDEE(userProfile))}</span>
                </div>
              </div>

              <div className="text-xs text-gray-600 space-y-1">
                <p><strong>Penjelasan:</strong></p>
                <p>• BMR dihitung menggunakan rumus Mifflin-St Jeor</p>
                <p>• TDEE = BMR × faktor aktivitas harian</p>
                <p>• Digunakan sebagai dasar perhitungan target kalori</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Target Tab */}
      {activeTab === 'target' && userProfile && (
        <div className="card animate-fadeIn">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Target Fitness</h3>
            <button
              onClick={() => {
                setProfileForm({
                  age: userProfile.age,
                  gender: userProfile.gender,
                  height: userProfile.height,
                  weight: userProfile.weight,
                  activity_level: userProfile.activity_level,
                  goal_mode: userProfile.goal_mode,
                  target_weight: userProfile.target_weight || userProfile.weight,
                  body_fat_percentage: userProfile.body_fat_percentage || 15
                });
                setShowEditProfile(true);
              }}
              className="flex items-center space-x-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-all duration-200"
              title="Edit Target"
            >
              <Edit2 className="w-3 h-3" />
              <span>Edit</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="font-medium text-purple-900 mb-2">Mode Target</h4>
                <p className="text-purple-700">{getGoalModeLabel(userProfile.goal_mode)}</p>
              </div>

              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <h4 className="font-medium text-orange-900 mb-2">Target Berat Badan</h4>
                <p className="text-orange-700">{userProfile.target_weight || userProfile.weight} kg</p>
              </div>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-900 mb-2">Kalori Target Harian</h4>
              <p className="text-2xl font-bold text-green-600">{Math.round(calculateTargetCalories(userProfile))} kal</p>
              <p className="text-xs text-green-700 mt-2">
                Berdasarkan TDEE dan mode target yang dipilih
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Calories Tab */}
      {activeTab === 'calories' && (
        <div className="space-y-6">
          {/* Calorie Summary */}
          <div className="card animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Ringkasan Kalori Hari Ini</h3>
              <button
                onClick={() => setShowAddCalorie(true)}
                className="flex items-center space-x-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-all duration-200"
              >
                <Plus className="w-3 h-3" />
                <span>Tambah</span>
              </button>
            </div>

            {userProfile && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-lg font-bold text-blue-600">{Math.round(calculateTargetCalories(userProfile))}</div>
                  <div className="text-xs text-blue-700">Target</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-lg font-bold text-green-600">{getTotalCaloriesConsumed()}</div>
                  <div className="text-xs text-green-700">Dikonsumsi</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="text-lg font-bold text-orange-600">{getTotalCaloriesBurned()}</div>
                  <div className="text-xs text-orange-700">Terbakar</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className={`text-lg font-bold ${getCalorieStatus().color}`}>
                    {Math.round(calculateTargetCalories(userProfile)) - (getTotalCaloriesConsumed() - getTotalCaloriesBurned())}
                  </div>
                  <div className="text-xs text-gray-700">Sisa</div>
                </div>
              </div>
            )}

            <div className="text-center p-3 rounded-lg border-2 border-dashed border-gray-200">
              <p className={`font-medium ${getCalorieStatus().color}`}>
                {getCalorieStatus().label}
              </p>
            </div>
          </div>

          {/* Calorie Entries */}
          <div className="card animate-fadeIn">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Makanan Hari Ini</h3>
            
            {calorieEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Utensils className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Belum ada makanan yang dicatat hari ini</p>
              </div>
            ) : (
              <div className="space-y-3">
                {calorieEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{entry.food_name}</h4>
                      <p className="text-sm text-gray-600">{entry.category} • {entry.calories} kal</p>
                      {entry.description && (
                        <p className="text-xs text-gray-500">{entry.description}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => openEditCalorie(entry)}
                        className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-all duration-200"
                        title="Edit"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteCalorie(entry.id)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-all duration-200"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Workout Tab */}
      {activeTab === 'workout' && (
        <div className="space-y-6">
          {/* Workout Summary */}
          <div className="card animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Latihan Hari Ini</h3>
              <button
                onClick={() => setShowAddWorkout(true)}
                className="flex items-center space-x-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-all duration-200"
              >
                <Plus className="w-3 h-3" />
                <span>Tambah</span>
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-lg font-bold text-purple-600">{workoutEntries.length}</div>
                <div className="text-xs text-purple-700">Latihan</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="text-lg font-bold text-orange-600">{getTotalCaloriesBurned()}</div>
                <div className="text-xs text-orange-700">Kalori Terbakar</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="text-lg font-bold text-green-600">
                  {workoutEntries.reduce((total, entry) => total + (entry.duration_minutes || 0), 0)}
                </div>
                <div className="text-xs text-green-700">Menit</div>
              </div>
            </div>
          </div>

          {/* Workout Entries */}
          <div className="card animate-fadeIn">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daftar Latihan</h3>
            
            {workoutEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Belum ada latihan yang dicatat hari ini</p>
              </div>
            ) : (
              <div className="space-y-3">
                {workoutEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{entry.exercise_name}</h4>
                      <p className="text-sm text-gray-600">
                        {entry.duration_minutes ? `${entry.duration_minutes} menit` : `${entry.repetitions} repetisi`} • {entry.calories_burned} kal terbakar
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => openEditWorkout(entry)}
                        className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-all duration-200"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteWorkout(entry.id)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-all duration-200"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress Tab */}
      {activeTab === 'progress' && (
        <div className="space-y-6">
          {/* Current Progress */}
          <div className="card animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Progress Tubuh</h3>
              <button
                onClick={() => setShowAddProgress(true)}
                className="flex items-center space-x-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-all duration-200"
              >
                <Plus className="w-3 h-3" />
                <span>Tambah</span>
              </button>
            </div>

            {bodyProgress.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-lg font-bold text-blue-600">{bodyProgress[bodyProgress.length - 1].weight}</div>
                  <div className="text-xs text-blue-700">Berat Saat Ini (kg)</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-lg font-bold text-green-600">
                    {bodyProgress[bodyProgress.length - 1].body_fat_percentage || 'N/A'}
                  </div>
                  <div className="text-xs text-green-700">Body Fat (%)</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="text-lg font-bold text-purple-600">{userProfile?.target_weight || 'N/A'}</div>
                  <div className="text-xs text-purple-700">Target (kg)</div>
                </div>
              </div>
            )}
          </div>

          {/* Progress History */}
          <div className="card animate-fadeIn">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Riwayat Progress</h3>
            
            {bodyProgress.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Belum ada data progress yang dicatat</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bodyProgress.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{format(new Date(entry.date), 'dd MMM yyyy')}</h4>
                      <p className="text-sm text-gray-600">
                        Berat: {entry.weight} kg
                        {entry.body_fat_percentage && ` • Body Fat: ${entry.body_fat_percentage}%`}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => openEditProgress(entry)}
                        className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-all duration-200"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProgress(entry.id)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-all duration-200"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="card animate-fadeIn">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Statistik Mingguan</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-600">{workoutEntries.length}</div>
              <div className="text-sm text-purple-700">Total Workout Selesai</div>
              <div className="text-xs text-purple-600 mt-1">Minggu ini</div>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">
                {bodyProgress.length > 1 
                  ? `${(bodyProgress[bodyProgress.length - 1].weight - bodyProgress[0].weight).toFixed(1)}`
                  : '0.0'
                }
              </div>
              <div className="text-sm text-blue-700">Perubahan Berat (kg)</div>
              <div className="text-xs text-blue-600 mt-1">Minggu ini</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">
                {userProfile ? Math.round((getTotalCaloriesConsumed() - getTotalCaloriesBurned() - calculateTargetCalories(userProfile)) * 7) : 0}
              </div>
              <div className="text-sm text-green-700">Status Kalori Mingguan</div>
              <div className="text-xs text-green-600 mt-1">
                {userProfile && (getTotalCaloriesConsumed() - getTotalCaloriesBurned() - calculateTargetCalories(userProfile)) > 0 ? 'Surplus' : 'Defisit'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Edit Profil</h3>
                <button
                  onClick={() => setShowEditProfile(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-all duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Umur</label>
                    <input
                      type="number"
                      value={profileForm.age}
                      onChange={(e) => setProfileForm({ ...profileForm, age: parseInt(e.target.value) || 0 })}
                      className="input"
                      min="1"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                    <select
                      value={profileForm.gender}
                      onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value as 'male' | 'female' })}
                      className="input"
                    >
                      <option value="male">Pria</option>
                      <option value="female">Wanita</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tinggi (cm)</label>
                    <input
                      type="number"
                      value={profileForm.height}
                      onChange={(e) => setProfileForm({ ...profileForm, height: parseInt(e.target.value) || 0 })}
                      className="input"
                      min="100"
                      max="250"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Berat (kg)</label>
                    <input
                      type="number"
                      value={profileForm.weight}
                      onChange={(e) => setProfileForm({ ...profileForm, weight: parseInt(e.target.value) || 0 })}
                      className="input"
                      min="30"
                      max="200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tingkat Aktivitas</label>
                  <select
                    value={profileForm.activity_level}
                    onChange={(e) => setProfileForm({ ...profileForm, activity_level: e.target.value as UserProfile['activity_level'] })}
                    className="input"
                  >
                    <option value="sedentary">Sedentary (jarang aktivitas)</option>
                    <option value="light">Light (1-3x latihan per minggu)</option>
                    <option value="moderate">Moderate (3-5x latihan per minggu)</option>
                    <option value="active">Active (6-7x latihan per minggu)</option>
                    <option value="very_active">Very Active (latihan berat setiap hari)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mode Target</label>
                  <select
                    value={profileForm.goal_mode}
                    onChange={(e) => setProfileForm({ ...profileForm, goal_mode: e.target.value as UserProfile['goal_mode'] })}
                    className="input"
                  >
                    <option value="cutting">Cutting (menurunkan berat badan)</option>
                    <option value="bulking">Bulking (menaikkan berat badan)</option>
                    <option value="maintenance">Maintenance (mempertahankan berat badan)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Berat (kg)</label>
                  <input
                    type="number"
                    value={profileForm.target_weight}
                    onChange={(e) => setProfileForm({ ...profileForm, target_weight: parseInt(e.target.value) || 0 })}
                    className="input"
                    min="30"
                    max="200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Body Fat Percentage (%)</label>
                  <input
                    type="number"
                    value={profileForm.body_fat_percentage}
                    onChange={(e) => setProfileForm({ ...profileForm, body_fat_percentage: parseInt(e.target.value) || 0 })}
                    className="input"
                    min="5"
                    max="50"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleSaveProfile}
                  className="flex-1 btn-primary"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Simpan
                </button>
                <button
                  onClick={() => setShowEditProfile(false)}
                  className="btn-secondary"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Calorie Modal */}
      {showAddCalorie && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingCalorie ? 'Edit Makanan' : 'Tambah Makanan'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddCalorie(false);
                    setEditingCalorie(null);
                    setCalorieForm({ food_name: '', category: 'breakfast', calories: 0, description: '' });
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-all duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nama Makanan</label>
                  <input
                    type="text"
                    value={calorieForm.food_name}
                    onChange={(e) => setCalorieForm({ ...calorieForm, food_name: e.target.value })}
                    className="input"
                    placeholder="Contoh: Nasi Gudeg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                  <select
                    value={calorieForm.category}
                    onChange={(e) => setCalorieForm({ ...calorieForm, category: e.target.value })}
                    className="input"
                  >
                    <option value="breakfast">Sarapan</option>
                    <option value="lunch">Makan Siang</option>
                    <option value="dinner">Makan Malam</option>
                    <option value="snack">Camilan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kalori</label>
                  <input
                    type="number"
                    value={calorieForm.calories}
                    onChange={(e) => setCalorieForm({ ...calorieForm, calories: parseInt(e.target.value) || 0 })}
                    className="input"
                    min="0"
                    placeholder="Contoh: 450"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi (Opsional)</label>
                  <textarea
                    value={calorieForm.description}
                    onChange={(e) => setCalorieForm({ ...calorieForm, description: e.target.value })}
                    className="textarea"
                    rows={3}
                    placeholder="Contoh: Dengan ayam dan telur"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={editingCalorie ? handleEditCalorie : handleAddCalorie}
                  className="flex-1 btn-primary"
                  disabled={!calorieForm.food_name || !calorieForm.calories}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingCalorie ? 'Update' : 'Simpan'}
                </button>
                <button
                  onClick={() => {
                    setShowAddCalorie(false);
                    setEditingCalorie(null);
                    setCalorieForm({ food_name: '', category: 'breakfast', calories: 0, description: '' });
                  }}
                  className="btn-secondary"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Workout Modal */}
      {showAddWorkout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingWorkout ? 'Edit Latihan' : 'Tambah Latihan'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddWorkout(false);
                    setEditingWorkout(null);
                    setWorkoutForm({ exercise_name: '', duration_minutes: 30, repetitions: 0, calories_burned: 0 });
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-all duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nama Latihan</label>
                  <input
                    type="text"
                    value={workoutForm.exercise_name}
                    onChange={(e) => setWorkoutForm({ ...workoutForm, exercise_name: e.target.value })}
                    className="input"
                    placeholder="Contoh: Push Up"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Durasi (menit)</label>
                    <input
                      type="number"
                      value={workoutForm.duration_minutes}
                      onChange={(e) => setWorkoutForm({ ...workoutForm, duration_minutes: parseInt(e.target.value) || 0 })}
                      className="input"
                      min="0"
                      placeholder="30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Repetisi</label>
                    <input
                      type="number"
                      value={workoutForm.repetitions}
                      onChange={(e) => setWorkoutForm({ ...workoutForm, repetitions: parseInt(e.target.value) || 0 })}
                      className="input"
                      min="0"
                      placeholder="20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kalori Terbakar</label>
                  <input
                    type="number"
                    value={workoutForm.calories_burned}
                    onChange={(e) => setWorkoutForm({ ...workoutForm, calories_burned: parseInt(e.target.value) || 0 })}
                    className="input"
                    min="0"
                    placeholder="50"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={editingWorkout ? handleEditWorkout : handleAddWorkout}
                  className="flex-1 btn-primary"
                  disabled={!workoutForm.exercise_name || !workoutForm.calories_burned}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingWorkout ? 'Update' : 'Simpan'}
                </button>
                <button
                  onClick={() => {
                    setShowAddWorkout(false);
                    setEditingWorkout(null);
                    setWorkoutForm({ exercise_name: '', duration_minutes: 30, repetitions: 0, calories_burned: 0 });
                  }}
                  className="btn-secondary"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Progress Modal */}
      {showAddProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingProgress ? 'Edit Progress' : 'Tambah Progress'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddProgress(false);
                    setEditingProgress(null);
                    setProgressForm({ weight: 70, body_fat_percentage: 15 });
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-all duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Berat Badan (kg)</label>
                  <input
                    type="number"
                    value={progressForm.weight}
                    onChange={(e) => setProgressForm({ ...progressForm, weight: parseFloat(e.target.value) || 0 })}
                    className="input"
                    min="30"
                    max="200"
                    step="0.1"
                    placeholder="70.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Body Fat Percentage (%) - Opsional</label>
                  <input
                    type="number"
                    value={progressForm.body_fat_percentage}
                    onChange={(e) => setProgressForm({ ...progressForm, body_fat_percentage: parseFloat(e.target.value) || 0 })}
                    className="input"
                    min="5"
                    max="50"
                    step="0.1"
                    placeholder="15.5"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={editingProgress ? handleEditProgress : handleAddProgress}
                  className="flex-1 btn-primary"
                  disabled={!progressForm.weight}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingProgress ? 'Update' : 'Simpan'}
                </button>
                <button
                  onClick={() => {
                    setShowAddProgress(false);
                    setEditingProgress(null);
                    setProgressForm({ weight: 70, body_fat_percentage: 15 });
                  }}
                  className="btn-secondary"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BodyTracker;