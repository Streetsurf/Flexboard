import React, { useState, useEffect } from 'react';
import { 
  Dumbbell, 
  Plus, 
  X, 
  Save, 
  Edit2, 
  Target, 
  TrendingUp, 
  Calendar, 
  Clock,
  Utensils,
  Activity,
  Scale,
  BarChart3,
  Flame,
  CheckCircle,
  AlertTriangle,
  Info,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Interfaces
interface WorkoutSession {
  id: string;
  date: string;
  exercise_name: string;
  duration_minutes: number;
  sets?: number;
  reps?: number;
  weight?: number;
  calories_burned: number;
  completed: boolean;
  user_id: string;
  created_at: string;
}

interface FoodEntry {
  id: string;
  date: string;
  food_name: string;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  description?: string;
  user_id: string;
  created_at: string;
}

interface BodyProgress {
  id: string;
  date: string;
  weight: number;
  body_fat_percentage?: number;
  user_id: string;
  created_at: string;
}

interface FitnessGoal {
  id: string;
  target_weight: number;
  current_weight: number;
  mode: 'cutting' | 'bulking' | 'maintenance';
  target_date?: string;
  daily_calorie_target: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

const BodyTracker: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'workout' | 'calories' | 'progress' | 'goals' | 'stats'>('workout');
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [foods, setFoods] = useState<FoodEntry[]>([]);
  const [bodyProgress, setBodyProgress] = useState<BodyProgress[]>([]);
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  const { user } = useAuth();

  // Form states
  const [workoutForm, setWorkoutForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    exercise_name: '',
    duration_minutes: '',
    sets: '',
    reps: '',
    weight: ''
  });

  const [foodForm, setFoodForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    food_name: '',
    category: 'breakfast' as FoodEntry['category'],
    calories: '',
    description: ''
  });

  const [progressForm, setProgressForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    weight: '',
    body_fat_percentage: ''
  });

  const [goalForm, setGoalForm] = useState({
    target_weight: '',
    current_weight: '',
    mode: 'maintenance' as FitnessGoal['mode'],
    target_date: '',
    daily_calorie_target: ''
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Mock data for now - replace with actual Supabase calls when tables are created
      setWorkouts([
        {
          id: '1',
          date: format(new Date(), 'yyyy-MM-dd'),
          exercise_name: 'Push-ups',
          duration_minutes: 30,
          sets: 3,
          reps: 15,
          calories_burned: 150,
          completed: true,
          user_id: user?.id || '',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          date: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
          exercise_name: 'Running',
          duration_minutes: 45,
          calories_burned: 450,
          completed: true,
          user_id: user?.id || '',
          created_at: new Date().toISOString()
        }
      ]);
      
      setFoods([
        {
          id: '1',
          date: format(new Date(), 'yyyy-MM-dd'),
          food_name: 'Oatmeal with banana',
          category: 'breakfast',
          calories: 350,
          description: 'Healthy breakfast',
          user_id: user?.id || '',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          date: format(new Date(), 'yyyy-MM-dd'),
          food_name: 'Grilled chicken salad',
          category: 'lunch',
          calories: 420,
          description: 'Protein-rich lunch',
          user_id: user?.id || '',
          created_at: new Date().toISOString()
        }
      ]);

      setBodyProgress([
        {
          id: '1',
          date: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
          weight: 70.5,
          body_fat_percentage: 15.2,
          user_id: user?.id || '',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          date: format(new Date(), 'yyyy-MM-dd'),
          weight: 70.2,
          body_fat_percentage: 15.0,
          user_id: user?.id || '',
          created_at: new Date().toISOString()
        }
      ]);

      setFitnessGoal({
        id: '1',
        target_weight: 68,
        current_weight: 70.2,
        mode: 'cutting',
        target_date: format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        daily_calorie_target: 2000,
        user_id: user?.id || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error fetching body tracker data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate calories burned based on exercise and duration
  const calculateCaloriesBurned = (exercise: string, duration: number): number => {
    const caloriesPerMinute: { [key: string]: number } = {
      'push-ups': 5,
      'squats': 6,
      'running': 10,
      'cycling': 8,
      'swimming': 12,
      'walking': 4,
      'weightlifting': 6,
      'yoga': 3,
      'default': 5
    };
    
    const rate = caloriesPerMinute[exercise.toLowerCase()] || caloriesPerMinute.default;
    return Math.round(rate * duration);
  };

  // Get today's calorie summary
  const getTodayCalorieSummary = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayFoods = foods.filter(f => f.date === today);
    const todayWorkouts = workouts.filter(w => w.date === today && w.completed);
    
    const caloriesIn = todayFoods.reduce((sum, food) => sum + food.calories, 0);
    const caloriesOut = todayWorkouts.reduce((sum, workout) => sum + workout.calories_burned, 0);
    const netCalories = caloriesIn - caloriesOut;
    const target = fitnessGoal?.daily_calorie_target || 2000;
    const remaining = target - netCalories;
    
    return { caloriesIn, caloriesOut, netCalories, target, remaining };
  };

  // Get calorie status with descriptive labels
  const getCalorieStatus = () => {
    const { remaining, target } = getTodayCalorieSummary();
    const percentage = (remaining / target) * 100;
    
    if (remaining > target * 0.3) return { label: 'Masih bisa makan', color: 'text-green-600', bg: 'bg-green-50' };
    if (remaining > 0) return { label: 'Mendekati target', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    if (remaining >= -target * 0.1) return { label: 'Target tercapai', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (remaining >= -target * 0.2) return { label: 'Sedikit berlebih', color: 'text-orange-600', bg: 'bg-orange-50' };
    return { label: 'Berlebihan', color: 'text-red-600', bg: 'bg-red-50' };
  };

  // Get weekly stats
  const getWeeklyStats = () => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    
    const weekWorkouts = workouts.filter(w => {
      const workoutDate = new Date(w.date);
      return workoutDate >= weekStart && workoutDate <= weekEnd && w.completed;
    });
    
    const currentWeight = bodyProgress[bodyProgress.length - 1]?.weight || 0;
    const lastWeekWeight = bodyProgress[bodyProgress.length - 2]?.weight || currentWeight;
    const weightChange = currentWeight - lastWeekWeight;
    
    const weeklyCalories = getTodayCalorieSummary(); // Simplified for demo
    
    return {
      totalWorkouts: weekWorkouts.length,
      weightChange,
      calorieStatus: weeklyCalories.remaining > 0 ? 'Dalam target' : 'Berlebih'
    };
  };

  // CRUD Operations
  const handleAddWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    const calories = calculateCaloriesBurned(workoutForm.exercise_name, parseInt(workoutForm.duration_minutes));
    
    const workoutData: WorkoutSession = {
      id: editingItem?.id || Date.now().toString(),
      date: workoutForm.date,
      exercise_name: workoutForm.exercise_name,
      duration_minutes: parseInt(workoutForm.duration_minutes),
      sets: workoutForm.sets ? parseInt(workoutForm.sets) : undefined,
      reps: workoutForm.reps ? parseInt(workoutForm.reps) : undefined,
      weight: workoutForm.weight ? parseFloat(workoutForm.weight) : undefined,
      calories_burned: calories,
      completed: true,
      user_id: user?.id || '',
      created_at: editingItem?.created_at || new Date().toISOString()
    };
    
    if (editingItem) {
      setWorkouts(workouts.map(w => w.id === editingItem.id ? workoutData : w));
    } else {
      setWorkouts([...workouts, workoutData]);
    }
    
    setShowAddModal(false);
    setEditingItem(null);
    resetForms();
  };

  const handleAddFood = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const foodData: FoodEntry = {
      id: editingItem?.id || Date.now().toString(),
      date: foodForm.date,
      food_name: foodForm.food_name,
      category: foodForm.category,
      calories: parseInt(foodForm.calories),
      description: foodForm.description,
      user_id: user?.id || '',
      created_at: editingItem?.created_at || new Date().toISOString()
    };
    
    if (editingItem) {
      setFoods(foods.map(f => f.id === editingItem.id ? foodData : f));
    } else {
      setFoods([...foods, foodData]);
    }
    
    setShowAddModal(false);
    setEditingItem(null);
    resetForms();
  };

  const handleAddProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const progressData: BodyProgress = {
      id: editingItem?.id || Date.now().toString(),
      date: progressForm.date,
      weight: parseFloat(progressForm.weight),
      body_fat_percentage: progressForm.body_fat_percentage ? parseFloat(progressForm.body_fat_percentage) : undefined,
      user_id: user?.id || '',
      created_at: editingItem?.created_at || new Date().toISOString()
    };
    
    if (editingItem) {
      setBodyProgress(bodyProgress.map(p => p.id === editingItem.id ? progressData : p));
    } else {
      setBodyProgress([...bodyProgress, progressData]);
    }
    
    setShowAddModal(false);
    setEditingItem(null);
    resetForms();
  };

  const handleUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedGoal: FitnessGoal = {
      id: fitnessGoal?.id || Date.now().toString(),
      target_weight: parseFloat(goalForm.target_weight),
      current_weight: parseFloat(goalForm.current_weight),
      mode: goalForm.mode,
      target_date: goalForm.target_date,
      daily_calorie_target: parseInt(goalForm.daily_calorie_target),
      user_id: user?.id || '',
      created_at: fitnessGoal?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    setFitnessGoal(updatedGoal);
    setShowAddModal(false);
    resetForms();
  };

  // Edit functions
  const handleEditWorkout = (workout: WorkoutSession) => {
    setEditingItem(workout);
    setWorkoutForm({
      date: workout.date,
      exercise_name: workout.exercise_name,
      duration_minutes: workout.duration_minutes.toString(),
      sets: workout.sets?.toString() || '',
      reps: workout.reps?.toString() || '',
      weight: workout.weight?.toString() || ''
    });
    setShowAddModal(true);
    setShowDropdown(null);
  };

  const handleEditFood = (food: FoodEntry) => {
    setEditingItem(food);
    setFoodForm({
      date: food.date,
      food_name: food.food_name,
      category: food.category,
      calories: food.calories.toString(),
      description: food.description || ''
    });
    setShowAddModal(true);
    setShowDropdown(null);
  };

  const handleEditProgress = (progress: BodyProgress) => {
    setEditingItem(progress);
    setProgressForm({
      date: progress.date,
      weight: progress.weight.toString(),
      body_fat_percentage: progress.body_fat_percentage?.toString() || ''
    });
    setShowAddModal(true);
    setShowDropdown(null);
  };

  // Delete functions
  const handleDeleteWorkout = (id: string) => {
    if (confirm('Are you sure you want to delete this workout?')) {
      setWorkouts(workouts.filter(w => w.id !== id));
    }
    setShowDropdown(null);
  };

  const handleDeleteFood = (id: string) => {
    if (confirm('Are you sure you want to delete this food entry?')) {
      setFoods(foods.filter(f => f.id !== id));
    }
    setShowDropdown(null);
  };

  const handleDeleteProgress = (id: string) => {
    if (confirm('Are you sure you want to delete this progress entry?')) {
      setBodyProgress(bodyProgress.filter(p => p.id !== id));
    }
    setShowDropdown(null);
  };

  const resetForms = () => {
    setWorkoutForm({
      date: format(new Date(), 'yyyy-MM-dd'),
      exercise_name: '',
      duration_minutes: '',
      sets: '',
      reps: '',
      weight: ''
    });
    setFoodForm({
      date: format(new Date(), 'yyyy-MM-dd'),
      food_name: '',
      category: 'breakfast',
      calories: '',
      description: ''
    });
    setProgressForm({
      date: format(new Date(), 'yyyy-MM-dd'),
      weight: '',
      body_fat_percentage: ''
    });
    setGoalForm({
      target_weight: '',
      current_weight: '',
      mode: 'maintenance',
      target_date: '',
      daily_calorie_target: ''
    });
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingItem(null);
    resetForms();
  };

  // Dropdown component
  const ActionDropdown: React.FC<{ 
    itemId: string; 
    onEdit: () => void; 
    onDelete: () => void; 
  }> = ({ itemId, onEdit, onDelete }) => (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(showDropdown === itemId ? null : itemId)}
        className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      
      {showDropdown === itemId && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(null)}
          />
          <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[120px]">
            <button
              onClick={onEdit}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
            >
              <Edit2 className="w-3 h-3" />
              <span>Edit</span>
            </button>
            <button
              onClick={onDelete}
              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete</span>
            </button>
          </div>
        </>
      )}
    </div>
  );

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

  const calorySummary = getTodayCalorieSummary();
  const calorieStatus = getCalorieStatus();
  const weeklyStats = getWeeklyStats();

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
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Data
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-6">
            {[
              { id: 'workout', label: 'Workout', icon: Dumbbell },
              { id: 'calories', label: 'Calories', icon: Utensils },
              { id: 'progress', label: 'Progress', icon: TrendingUp },
              { id: 'goals', label: 'Goals', icon: Target },
              { id: 'stats', label: 'Stats', icon: BarChart3 }
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

        {/* Workout Tracker Tab */}
        {activeTab === 'workout' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="stat-card">
                <div className="stat-value text-blue-600">{workouts.filter(w => w.completed).length}</div>
                <div className="stat-label">Total Workouts</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-green-600">{weeklyStats.totalWorkouts}</div>
                <div className="stat-label">This Week</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-orange-600">
                  {workouts.reduce((sum, w) => sum + (w.completed ? w.calories_burned : 0), 0)}
                </div>
                <div className="stat-label">Calories Burned</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-purple-600">
                  {Math.round(workouts.reduce((sum, w) => sum + (w.completed ? w.duration_minutes : 0), 0) / 60)}h
                </div>
                <div className="stat-label">Total Time</div>
              </div>
            </div>

            <div className="space-y-3">
              {workouts.map((workout) => (
                <div key={workout.id} className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${workout.completed ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <div>
                        <h3 className="font-medium text-gray-900">{workout.exercise_name}</h3>
                        <div className="text-sm text-gray-600">
                          {format(new Date(workout.date), 'MMM d')} • {workout.duration_minutes}min • {workout.calories_burned} cal
                          {workout.sets && workout.reps && (
                            <span> • {workout.sets}×{workout.reps}</span>
                          )}
                          {workout.weight && (
                            <span> • {workout.weight}kg</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-2">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-medium text-orange-600">{workout.calories_burned}</span>
                      </div>
                      <ActionDropdown
                        itemId={workout.id}
                        onEdit={() => handleEditWorkout(workout)}
                        onDelete={() => handleDeleteWorkout(workout.id)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Calorie Tracker Tab */}
        {activeTab === 'calories' && (
          <div className="space-y-6">
            {/* Calorie Summary */}
            <div className={`p-4 rounded-lg border-2 ${calorieStatus.bg} border-opacity-50`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Today's Calories</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${calorieStatus.color} ${calorieStatus.bg}`}>
                  {calorieStatus.label}
                </span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{calorySummary.caloriesIn}</div>
                  <div className="text-xs text-gray-600">Calories In</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{calorySummary.caloriesOut}</div>
                  <div className="text-xs text-gray-600">Calories Out</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{calorySummary.netCalories}</div>
                  <div className="text-xs text-gray-600">Net Calories</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{Math.abs(calorySummary.remaining)}</div>
                  <div className="text-xs text-gray-600">{calorySummary.remaining > 0 ? 'Remaining' : 'Over'}</div>
                </div>
              </div>
            </div>

            {/* Food Entries */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Food Entries</h4>
              {foods.map((food) => (
                <div key={food.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{food.food_name}</h3>
                      <div className="text-sm text-gray-600">
                        {food.category.charAt(0).toUpperCase() + food.category.slice(1)} • {format(new Date(food.date), 'MMM d')}
                        {food.description && (
                          <span> • {food.description}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <div className="text-lg font-semibold text-green-600">{food.calories}</div>
                        <div className="text-xs text-gray-500">calories</div>
                      </div>
                      <ActionDropdown
                        itemId={food.id}
                        onEdit={() => handleEditFood(food)}
                        onDelete={() => handleDeleteFood(food.id)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Body Progress Tab */}
        {activeTab === 'progress' && (
          <div className="space-y-6">
            {/* Current Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="stat-card">
                <div className="stat-value text-blue-600">
                  {bodyProgress[bodyProgress.length - 1]?.weight || '--'}kg
                </div>
                <div className="stat-label">Current Weight</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-green-600">
                  {bodyProgress[bodyProgress.length - 1]?.body_fat_percentage || '--'}%
                </div>
                <div className="stat-label">Body Fat</div>
              </div>
              <div className="stat-card">
                <div className={`stat-value ${weeklyStats.weightChange > 0 ? 'text-red-600' : weeklyStats.weightChange < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                  {weeklyStats.weightChange > 0 ? '+' : ''}{weeklyStats.weightChange.toFixed(1)}kg
                </div>
                <div className="stat-label">Weekly Change</div>
              </div>
            </div>

            {/* Weight Chart */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-4">Weight Progress</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bodyProgress}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => format(new Date(value), 'MMM d')}
                    />
                    <YAxis tick={{ fontSize: 12 }} domain={['dataMin - 1', 'dataMax + 1']} />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), 'MMM d, yyyy')}
                      formatter={(value: any) => [`${value}kg`, 'Weight']}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Progress Entries */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Progress Entries</h4>
              {bodyProgress.map((progress) => (
                <div key={progress.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{format(new Date(progress.date), 'MMM d, yyyy')}</h3>
                      <div className="text-sm text-gray-600">
                        Weight: {progress.weight}kg
                        {progress.body_fat_percentage && (
                          <span> • Body Fat: {progress.body_fat_percentage}%</span>
                        )}
                      </div>
                    </div>
                    <ActionDropdown
                      itemId={progress.id}
                      onEdit={() => handleEditProgress(progress)}
                      onDelete={() => handleDeleteProgress(progress.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fitness Goals Tab */}
        {activeTab === 'goals' && (
          <div className="space-y-6">
            {fitnessGoal ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border-2 ${
                  fitnessGoal.mode === 'cutting' ? 'bg-red-50 border-red-200' :
                  fitnessGoal.mode === 'bulking' ? 'bg-green-50 border-green-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Current Goal</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      fitnessGoal.mode === 'cutting' ? 'bg-red-100 text-red-700' :
                      fitnessGoal.mode === 'bulking' ? 'bg-green-100 text-green-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {fitnessGoal.mode.charAt(0).toUpperCase() + fitnessGoal.mode.slice(1)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{fitnessGoal.current_weight}kg</div>
                      <div className="text-xs text-gray-600">Current</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{fitnessGoal.target_weight}kg</div>
                      <div className="text-xs text-gray-600">Target</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {Math.abs(fitnessGoal.target_weight - fitnessGoal.current_weight).toFixed(1)}kg
                      </div>
                      <div className="text-xs text-gray-600">To Go</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{fitnessGoal.daily_calorie_target}</div>
                      <div className="text-xs text-gray-600">Daily Calories</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setGoalForm({
                      target_weight: fitnessGoal.target_weight.toString(),
                      current_weight: fitnessGoal.current_weight.toString(),
                      mode: fitnessGoal.mode,
                      target_date: fitnessGoal.target_date || '',
                      daily_calorie_target: fitnessGoal.daily_calorie_target.toString()
                    });
                    setShowAddModal(true);
                  }}
                  className="btn-secondary w-full"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Update Goal
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm font-medium mb-2">No fitness goal set</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn-primary"
                >
                  Set Your Goal
                </button>
              </div>
            )}
          </div>
        )}

        {/* Weekly Statistics Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="stat-card-primary">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-blue-900">Workouts Completed</h3>
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-600">{weeklyStats.totalWorkouts}</div>
                <div className="text-sm text-blue-700">This week</div>
              </div>

              <div className={`stat-card ${weeklyStats.weightChange < 0 ? 'stat-card-success' : weeklyStats.weightChange > 0 ? 'stat-card-warning' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">Weight Change</h3>
                  <Scale className="w-5 h-5 text-gray-600" />
                </div>
                <div className={`text-2xl font-bold ${weeklyStats.weightChange < 0 ? 'text-green-600' : weeklyStats.weightChange > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                  {weeklyStats.weightChange > 0 ? '+' : ''}{weeklyStats.weightChange.toFixed(1)}kg
                </div>
                <div className="text-sm text-gray-600">Weekly change</div>
              </div>

              <div className="stat-card">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">Calorie Status</h3>
                  <Info className="w-5 h-5 text-gray-600" />
                </div>
                <div className="text-lg font-bold text-gray-900">{weeklyStats.calorieStatus}</div>
                <div className="text-sm text-gray-600">This week</div>
              </div>
            </div>

            {/* Additional insights */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-gray-900 mb-3">Weekly Insights</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p>• You've completed {weeklyStats.totalWorkouts} workout sessions this week</p>
                <p>• Your weight has {weeklyStats.weightChange < 0 ? 'decreased' : weeklyStats.weightChange > 0 ? 'increased' : 'remained stable'} by {Math.abs(weeklyStats.weightChange).toFixed(1)}kg</p>
                <p>• Your calorie intake is {weeklyStats.calorieStatus.toLowerCase()}</p>
                {fitnessGoal && (
                  <p>• You're {Math.abs(fitnessGoal.target_weight - fitnessGoal.current_weight).toFixed(1)}kg away from your {fitnessGoal.mode} goal</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Data Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingItem ? 'Edit' : 'Add'} {activeTab === 'workout' ? 'Workout' : 
                       activeTab === 'calories' ? 'Food Entry' : 
                       activeTab === 'progress' ? 'Body Progress' : 'Fitness Goal'}
                </h3>
                <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Workout Form */}
              {activeTab === 'workout' && (
                <form onSubmit={handleAddWorkout} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={workoutForm.date}
                      onChange={(e) => setWorkoutForm({ ...workoutForm, date: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Exercise Name</label>
                    <input
                      type="text"
                      value={workoutForm.exercise_name}
                      onChange={(e) => setWorkoutForm({ ...workoutForm, exercise_name: e.target.value })}
                      className="input"
                      placeholder="Push-ups, Running, etc."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                    <input
                      type="number"
                      value={workoutForm.duration_minutes}
                      onChange={(e) => setWorkoutForm({ ...workoutForm, duration_minutes: e.target.value })}
                      className="input"
                      placeholder="30"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sets</label>
                      <input
                        type="number"
                        value={workoutForm.sets}
                        onChange={(e) => setWorkoutForm({ ...workoutForm, sets: e.target.value })}
                        className="input"
                        placeholder="3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Reps</label>
                      <input
                        type="number"
                        value={workoutForm.reps}
                        onChange={(e) => setWorkoutForm({ ...workoutForm, reps: e.target.value })}
                        className="input"
                        placeholder="12"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={workoutForm.weight}
                        onChange={(e) => setWorkoutForm({ ...workoutForm, weight: e.target.value })}
                        className="input"
                        placeholder="20"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-3 pt-4">
                    <button type="submit" className="flex-1 btn-primary">
                      <Save className="w-4 h-4 mr-2" />
                      {editingItem ? 'Update' : 'Save'} Workout
                    </button>
                    <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                  </div>
                </form>
              )}

              {/* Food Form */}
              {activeTab === 'calories' && (
                <form onSubmit={handleAddFood} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={foodForm.date}
                      onChange={(e) => setFoodForm({ ...foodForm, date: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Food Name</label>
                    <input
                      type="text"
                      value={foodForm.food_name}
                      onChange={(e) => setFoodForm({ ...foodForm, food_name: e.target.value })}
                      className="input"
                      placeholder="Chicken breast, Rice, etc."
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      <select
                        value={foodForm.category}
                        onChange={(e) => setFoodForm({ ...foodForm, category: e.target.value as FoodEntry['category'] })}
                        className="input"
                        required
                      >
                        <option value="breakfast">Breakfast</option>
                        <option value="lunch">Lunch</option>
                        <option value="dinner">Dinner</option>
                        <option value="snack">Snack</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Calories</label>
                      <input
                        type="number"
                        value={foodForm.calories}
                        onChange={(e) => setFoodForm({ ...foodForm, calories: e.target.value })}
                        className="input"
                        placeholder="350"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={foodForm.description}
                      onChange={(e) => setFoodForm({ ...foodForm, description: e.target.value })}
                      className="textarea"
                      rows={3}
                      placeholder="Additional details..."
                    />
                  </div>
                  <div className="flex space-x-3 pt-4">
                    <button type="submit" className="flex-1 btn-primary">
                      <Save className="w-4 h-4 mr-2" />
                      {editingItem ? 'Update' : 'Save'} Food
                    </button>
                    <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                  </div>
                </form>
              )}

              {/* Progress Form */}
              {activeTab === 'progress' && (
                <form onSubmit={handleAddProgress} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={progressForm.date}
                      onChange={(e) => setProgressForm({ ...progressForm, date: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={progressForm.weight}
                        onChange={(e) => setProgressForm({ ...progressForm, weight: e.target.value })}
                        className="input"
                        placeholder="70.5"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Body Fat (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={progressForm.body_fat_percentage}
                        onChange={(e) => setProgressForm({ ...progressForm, body_fat_percentage: e.target.value })}
                        className="input"
                        placeholder="15.5"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-3 pt-4">
                    <button type="submit" className="flex-1 btn-primary">
                      <Save className="w-4 h-4 mr-2" />
                      {editingItem ? 'Update' : 'Save'} Progress
                    </button>
                    <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                  </div>
                </form>
              )}

              {/* Goal Form */}
              {activeTab === 'goals' && (
                <form onSubmit={handleUpdateGoal} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Current Weight (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={goalForm.current_weight}
                        onChange={(e) => setGoalForm({ ...goalForm, current_weight: e.target.value })}
                        className="input"
                        placeholder="70.5"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Target Weight (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={goalForm.target_weight}
                        onChange={(e) => setGoalForm({ ...goalForm, target_weight: e.target.value })}
                        className="input"
                        placeholder="68.0"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mode</label>
                    <select
                      value={goalForm.mode}
                      onChange={(e) => setGoalForm({ ...goalForm, mode: e.target.value as FitnessGoal['mode'] })}
                      className="input"
                      required
                    >
                      <option value="cutting">Cutting (Lose weight)</option>
                      <option value="bulking">Bulking (Gain weight)</option>
                      <option value="maintenance">Maintenance (Maintain weight)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Target Date</label>
                      <input
                        type="date"
                        value={goalForm.target_date}
                        onChange={(e) => setGoalForm({ ...goalForm, target_date: e.target.value })}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Daily Calories</label>
                      <input
                        type="number"
                        value={goalForm.daily_calorie_target}
                        onChange={(e) => setGoalForm({ ...goalForm, daily_calorie_target: e.target.value })}
                        className="input"
                        placeholder="2000"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex space-x-3 pt-4">
                    <button type="submit" className="flex-1 btn-primary">
                      <Save className="w-4 h-4 mr-2" />
                      Save Goal
                    </button>
                    <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
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