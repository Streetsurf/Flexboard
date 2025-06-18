import React, { useState, useEffect } from 'react';
import { 
  Dumbbell, 
  Plus, 
  Check, 
  X, 
  TrendingUp, 
  Target, 
  Scale, 
  Activity,
  Apple,
  Flame,
  Calendar,
  Clock,
  Edit2,
  Save,
  Trash2,
  Play,
  Pause,
  Square,
  Timer
} from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';

interface WorkoutItem {
  id: string;
  name: string;
  repetitions?: number;
  duration_minutes?: number;
  completed: boolean;
  date: string;
  timer_start_time?: string;
  is_timer_active?: boolean;
  actual_minutes?: number;
}

interface CalorieEntry {
  id: string;
  type: 'in' | 'out';
  category: string;
  amount: number;
  description: string;
  date: string;
}

interface WeightEntry {
  id: string;
  weight: number;
  bodyFat?: number;
  date: string;
  week: string; // Format: "2024-W03"
}

interface FitnessGoal {
  targetWeight: number;
  currentWeight: number;
  mode: 'cutting' | 'bulking' | 'maintenance';
  lastUpdate: string;
}

const BodyTracker: React.FC = () => {
  const { showSuccess, showError } = useNotifications();
  
  const [workouts, setWorkouts] = useState<WorkoutItem[]>([
    { id: '1', name: 'Push-up', repetitions: 15, completed: true, date: '2024-01-15' },
    { id: '2', name: 'Jogging', duration_minutes: 20, completed: true, date: '2024-01-15' },
    { id: '3', name: 'Plank', duration_minutes: 1, completed: false, date: '2024-01-15' },
    { id: '4', name: 'Squat', repetitions: 20, completed: true, date: '2024-01-15' },
    { id: '5', name: 'Pull-up', repetitions: 8, completed: false, date: '2024-01-15' }
  ]);

  const [caloriesIn, setCaloriesIn] = useState<CalorieEntry[]>([
    { id: '1', type: 'in', category: 'Sarapan', amount: 450, description: 'Nasi gudeg + teh', date: '2024-01-15' },
    { id: '2', type: 'in', category: 'Makan Siang', amount: 650, description: 'Ayam bakar + nasi', date: '2024-01-15' },
    { id: '3', type: 'in', category: 'Snack', amount: 200, description: 'Pisang + kacang', date: '2024-01-15' }
  ]);

  const [caloriesOut, setCaloriesOut] = useState<CalorieEntry[]>([
    { id: '1', type: 'out', category: 'Workout', amount: 320, description: 'Push-up + Jogging + Squat', date: '2024-01-15' }
  ]);

  // Weekly weight entries with proper state management
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([
    { id: '1', weight: 72.5, bodyFat: 18.2, date: '2024-01-15', week: '2024-W03' },
    { id: '2', weight: 72.8, bodyFat: 18.5, date: '2024-01-08', week: '2024-W02' },
    { id: '3', weight: 73.1, bodyFat: 18.8, date: '2024-01-01', week: '2024-W01' },
    { id: '4', weight: 73.0, bodyFat: 18.6, date: '2023-12-25', week: '2023-W52' },
    { id: '5', weight: 73.3, bodyFat: 19.0, date: '2023-12-18', week: '2023-W51' },
    { id: '6', weight: 73.5, bodyFat: 19.2, date: '2023-12-11', week: '2023-W50' },
    { id: '7', weight: 73.8, bodyFat: 19.5, date: '2023-12-04', week: '2023-W49' }
  ]);

  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal>({
    targetWeight: 70.0,
    currentWeight: 72.5,
    mode: 'cutting',
    lastUpdate: '2024-01-15'
  });

  const [showAddWorkout, setShowAddWorkout] = useState(false);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [showAddWeight, setShowAddWeight] = useState(false);
  const [showEditGoal, setShowEditGoal] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutItem | null>(null);
  const [editingMeal, setEditingMeal] = useState<CalorieEntry | null>(null);
  const [editingWeight, setEditingWeight] = useState<WeightEntry | null>(null);
  const [newWorkout, setNewWorkout] = useState({
    name: '',
    repetitions: '',
    duration_minutes: '',
    hasRepetitions: false,
    hasDuration: false
  });
  const [newMeal, setNewMeal] = useState({ category: 'Sarapan', amount: '', description: '' });
  const [newWeight, setNewWeight] = useState({ weight: '', bodyFat: '' });
  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Confirmation states for delete operations
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    show: boolean;
    type: 'workout' | 'meal' | 'weight' | null;
    id: string;
    name: string;
  }>({
    show: false,
    type: null,
    id: '',
    name: ''
  });

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTimer) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  // Update current weight in fitness goal when weight entries change
  useEffect(() => {
    if (weightEntries.length > 0) {
      setFitnessGoal(prev => ({
        ...prev,
        currentWeight: weightEntries[0].weight
      }));
    }
  }, [weightEntries]);

  // Calculate statistics
  const completedWorkouts = workouts.filter(w => w.completed).length;
  const totalWorkouts = workouts.length;
  const workoutProgress = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0;

  const totalCaloriesIn = caloriesIn.reduce((sum, entry) => sum + entry.amount, 0);
  const totalCaloriesOut = caloriesOut.reduce((sum, entry) => sum + entry.amount, 0);
  const calorieBalance = totalCaloriesIn - totalCaloriesOut;

  const currentWeight = weightEntries.length > 0 ? weightEntries[0].weight : fitnessGoal.currentWeight;
  const weightChange = weightEntries.length >= 2 ? 
    Number((weightEntries[0].weight - weightEntries[6]?.weight || 0).toFixed(1)) : 0;

  const weeklyWorkouts = workouts.filter(w => w.completed).length;

  // Helper functions with Indonesian locale
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDateIndonesian = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getWeekString = (date: Date): string => {
    const year = date.getFullYear();
    const week = getWeekNumber(date);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  };

  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  // Delete confirmation handlers
  const showDeleteConfirmation = (type: 'workout' | 'meal' | 'weight', id: string, name: string) => {
    setDeleteConfirmation({
      show: true,
      type,
      id,
      name
    });
  };

  const hideDeleteConfirmation = () => {
    setDeleteConfirmation({
      show: false,
      type: null,
      id: '',
      name: ''
    });
  };

  const confirmDelete = () => {
    const { type, id } = deleteConfirmation;
    
    try {
      switch (type) {
        case 'workout':
          setWorkouts(prev => prev.filter(w => w.id !== id));
          showSuccess('Workout Dihapus', 'Workout berhasil dihapus dari daftar');
          break;
        case 'meal':
          setCaloriesIn(prev => prev.filter(m => m.id !== id));
          showSuccess('Makanan Dihapus', 'Data makanan berhasil dihapus');
          break;
        case 'weight':
          setWeightEntries(prev => {
            const newEntries = prev.filter(w => w.id !== id);
            return newEntries;
          });
          showSuccess('Data Berat Dihapus', 'Data berat badan berhasil dihapus');
          break;
      }
    } catch (error) {
      showError('Error', 'Gagal menghapus data');
    } finally {
      hideDeleteConfirmation();
    }
  };

  // Handle functions
  const toggleWorkout = (id: string) => {
    const workout = workouts.find(w => w.id === id);
    if (!workout) return;

    setWorkouts(workouts.map(w => 
      w.id === id ? { ...w, completed: !w.completed } : w
    ));

    if (!workout.completed) {
      showSuccess('Workout Selesai! 💪', `${workout.name} berhasil diselesaikan!`);
    }
  };

  const startTimer = (workoutId: string) => {
    const workout = workouts.find(w => w.id === workoutId);
    if (!workout || !workout.duration_minutes) return;

    if (activeTimer && activeTimer !== workoutId) {
      pauseTimer(activeTimer);
    }

    setWorkouts(workouts.map(w => 
      w.id === workoutId 
        ? { ...w, timer_start_time: new Date().toISOString(), is_timer_active: true }
        : { ...w, is_timer_active: false }
    ));

    setActiveTimer(workoutId);
    setTimerSeconds(0);
  };

  const pauseTimer = (workoutId: string) => {
    const workout = workouts.find(w => w.id === workoutId);
    if (!workout) return;

    const additionalMinutes = Math.round((timerSeconds / 60) * 100) / 100;
    const newActualMinutes = Math.round(((workout.actual_minutes || 0) + additionalMinutes) * 100) / 100;

    setWorkouts(workouts.map(w => 
      w.id === workoutId 
        ? { 
            ...w, 
            actual_minutes: newActualMinutes,
            is_timer_active: false,
            timer_start_time: undefined
          }
        : w
    ));

    setActiveTimer(null);
    setTimerSeconds(0);
  };

  const finishWorkout = (workoutId: string) => {
    const workout = workouts.find(w => w.id === workoutId);
    if (!workout) return;

    let finalActualMinutes = workout.actual_minutes || 0;
    
    if (activeTimer === workoutId) {
      const additionalMinutes = Math.round((timerSeconds / 60) * 100) / 100;
      finalActualMinutes = Math.round((finalActualMinutes + additionalMinutes) * 100) / 100;
    }

    setWorkouts(workouts.map(w => 
      w.id === workoutId 
        ? { 
            ...w, 
            completed: true,
            actual_minutes: finalActualMinutes,
            is_timer_active: false,
            timer_start_time: undefined
          }
        : w
    ));

    if (activeTimer === workoutId) {
      setActiveTimer(null);
      setTimerSeconds(0);
    }

    showSuccess('Workout Selesai! 💪', `${workout.name} berhasil diselesaikan!`);
  };

  const editWorkout = (workout: WorkoutItem) => {
    setEditingWorkout(workout);
    setNewWorkout({
      name: workout.name,
      repetitions: workout.repetitions?.toString() || '',
      duration_minutes: workout.duration_minutes?.toString() || '',
      hasRepetitions: !!workout.repetitions,
      hasDuration: !!workout.duration_minutes
    });
    setShowAddWorkout(true);
  };

  const updateWorkout = () => {
    if (!editingWorkout || !newWorkout.name.trim()) return;
    
    const updatedWorkout: WorkoutItem = {
      ...editingWorkout,
      name: newWorkout.name.trim(),
      repetitions: newWorkout.hasRepetitions && newWorkout.repetitions ? parseInt(newWorkout.repetitions) : undefined,
      duration_minutes: newWorkout.hasDuration && newWorkout.duration_minutes ? parseInt(newWorkout.duration_minutes) : undefined
    };
    
    setWorkouts(workouts.map(workout => 
      workout.id === editingWorkout.id ? updatedWorkout : workout
    ));
    
    cancelEdit();
    showSuccess('Workout Diperbarui', 'Workout berhasil diperbarui!');
  };

  const addWorkout = () => {
    if (!newWorkout.name.trim()) return;
    
    const workout: WorkoutItem = {
      id: Date.now().toString(),
      name: newWorkout.name.trim(),
      repetitions: newWorkout.hasRepetitions && newWorkout.repetitions ? parseInt(newWorkout.repetitions) : undefined,
      duration_minutes: newWorkout.hasDuration && newWorkout.duration_minutes ? parseInt(newWorkout.duration_minutes) : undefined,
      completed: false,
      date: new Date().toISOString().split('T')[0]
    };
    
    setWorkouts([...workouts, workout]);
    cancelEdit();
    showSuccess('Workout Ditambahkan', `${workout.name} berhasil ditambahkan ke daftar!`);
  };

  const editMeal = (meal: CalorieEntry) => {
    setEditingMeal(meal);
    setNewMeal({
      category: meal.category,
      amount: meal.amount.toString(),
      description: meal.description
    });
    setShowAddMeal(true);
  };

  const updateMeal = () => {
    if (!editingMeal || !newMeal.description.trim() || !newMeal.amount) return;
    
    setCaloriesIn(caloriesIn.map(meal => 
      meal.id === editingMeal.id 
        ? { 
            ...meal, 
            category: newMeal.category,
            amount: parseInt(newMeal.amount),
            description: newMeal.description.trim()
          }
        : meal
    ));
    setEditingMeal(null);
    setNewMeal({ category: 'Sarapan', amount: '', description: '' });
    setShowAddMeal(false);
    showSuccess('Makanan Diperbarui', 'Data makanan berhasil diperbarui!');
  };

  const addMeal = () => {
    if (!newMeal.description.trim() || !newMeal.amount) return;
    
    const meal: CalorieEntry = {
      id: Date.now().toString(),
      type: 'in',
      category: newMeal.category,
      amount: parseInt(newMeal.amount),
      description: newMeal.description.trim(),
      date: new Date().toISOString().split('T')[0]
    };
    
    setCaloriesIn([...caloriesIn, meal]);
    setNewMeal({ category: 'Sarapan', amount: '', description: '' });
    setShowAddMeal(false);
    showSuccess('Makanan Ditambahkan', `${meal.description} (${meal.amount} kcal) berhasil ditambahkan!`);
  };

  const editWeight = (weight: WeightEntry) => {
    setEditingWeight(weight);
    setNewWeight({
      weight: weight.weight.toString(),
      bodyFat: weight.bodyFat?.toString() || ''
    });
    setShowAddWeight(true);
  };

  const updateWeight = () => {
    if (!editingWeight || !newWeight.weight) return;
    
    setWeightEntries(prev => {
      const newEntries = prev.map(weight => 
        weight.id === editingWeight.id 
          ? { 
              ...weight, 
              weight: parseFloat(newWeight.weight),
              bodyFat: newWeight.bodyFat ? parseFloat(newWeight.bodyFat) : undefined
            }
          : weight
      );
      return newEntries;
    });
    
    setEditingWeight(null);
    setNewWeight({ weight: '', bodyFat: '' });
    setShowAddWeight(false);
    showSuccess('Data Berat Diperbarui', 'Data berat badan berhasil diperbarui!');
  };

  const addWeight = () => {
    if (!newWeight.weight) return;
    
    const currentDate = new Date();
    const weight: WeightEntry = {
      id: Date.now().toString(),
      weight: parseFloat(newWeight.weight),
      bodyFat: newWeight.bodyFat ? parseFloat(newWeight.bodyFat) : undefined,
      date: currentDate.toISOString().split('T')[0],
      week: getWeekString(currentDate)
    };
    
    setWeightEntries(prev => [weight, ...prev]);
    setNewWeight({ weight: '', bodyFat: '' });
    setShowAddWeight(false);
    showSuccess('Data Berat Ditambahkan', `Berat ${weight.weight} kg berhasil dicatat!`);
  };

  const updateGoal = () => {
    setFitnessGoal({
      ...fitnessGoal,
      lastUpdate: new Date().toISOString().split('T')[0]
    });
    setShowEditGoal(false);
    showSuccess('Goal Diperbarui', 'Target fitness Anda berhasil diperbarui!');
  };

  const cancelEdit = () => {
    setEditingWorkout(null);
    setEditingMeal(null);
    setEditingWeight(null);
    setNewWorkout({
      name: '',
      repetitions: '',
      duration_minutes: '',
      hasRepetitions: false,
      hasDuration: false
    });
    setNewMeal({ category: 'Sarapan', amount: '', description: '' });
    setNewWeight({ weight: '', bodyFat: '' });
    setShowAddWorkout(false);
    setShowAddMeal(false);
    setShowAddWeight(false);
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Breadcrumbs */}
      <nav className="breadcrumbs">
        <span>Dashboard</span>
        <span className="breadcrumb-separator">/</span>
        <span className="text-gray-900 font-medium">Body</span>
      </nav>

      {/* 💪 1. WORKOUT CHECKLIST */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center space-x-2 lg:space-x-3 min-w-0 flex-1">
            <div className="w-6 h-6 lg:w-8 lg:h-8 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Dumbbell className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="card-title text-sm lg:text-base truncate">Workout Checklist</h2>
              <p className="text-xs text-gray-500">{completedWorkouts} dari {totalWorkouts} selesai</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddWorkout(true)}
            className="btn-primary text-xs lg:text-sm px-2 lg:px-3 py-1.5 lg:py-2 flex-shrink-0 ml-2"
          >
            <Plus className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
            <span className="hidden sm:inline">Add Workout</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-3 lg:mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs lg:text-sm font-medium text-gray-700">Progress Hari Ini</span>
            <span className="text-xs lg:text-sm text-gray-600">{workoutProgress}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill progress-fill-success" 
              style={{ width: `${workoutProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Workout List */}
        <div className="space-y-2">
          {workouts.map((workout, index) => (
            <div
              key={workout.id}
              className={`p-2 lg:p-3 border rounded-xl transition-all duration-200 hover-lift ${
                workout.completed
                  ? 'bg-green-50 border-green-200'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start space-x-2 lg:space-x-3 flex-1 min-w-0">
                  <button
                    onClick={() => toggleWorkout(workout.id)}
                    className={`w-4 h-4 lg:w-5 lg:h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 hover-scale flex-shrink-0 mt-0.5 ${
                      workout.completed
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 hover:border-green-500'
                    }`}
                  >
                    {workout.completed && <Check className="w-2 h-2 lg:w-3 lg:h-3" />}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 gap-1">
                      <span className={`text-xs lg:text-sm font-medium truncate ${workout.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                        {workout.name}
                      </span>
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        {workout.repetitions && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                            {workout.repetitions}x
                          </span>
                        )}
                        {workout.duration_minutes && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
                            {workout.duration_minutes}m
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Timer Display */}
                    {activeTimer === workout.id && (
                      <div className="mt-1 text-blue-600 font-medium text-xs animate-pulse">
                        ⏱️ {formatTime(timerSeconds)}
                      </div>
                    )}
                    
                    {/* Actual Time Display */}
                    {workout.actual_minutes && workout.actual_minutes > 0 && (
                      <div className="mt-1 text-green-600 text-xs">
                        Actual: {workout.actual_minutes}m
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center space-x-0.5 lg:space-x-1 flex-shrink-0">
                  {/* Timer Controls */}
                  {workout.duration_minutes && !workout.completed && (
                    <>
                      {activeTimer === workout.id ? (
                        <>
                          <button
                            onClick={() => pauseTimer(workout.id)}
                            className="p-1 lg:p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg transition-all duration-200 hover-scale"
                            title="Pause timer"
                          >
                            <Pause className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => finishWorkout(workout.id)}
                            className="p-1 lg:p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition-all duration-200 hover-scale"
                            title="Finish workout"
                          >
                            <Square className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => startTimer(workout.id)}
                          className="p-1 lg:p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition-all duration-200 hover-scale"
                          title="Start timer"
                        >
                          <Play className="w-3 h-3" />
                        </button>
                      )}
                    </>
                  )}
                  
                  <button
                    onClick={() => editWorkout(workout)}
                    className="p-1 lg:p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-all duration-200 hover-scale"
                    title="Edit workout"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => showDeleteConfirmation('workout', workout.id, workout.name)}
                    className="p-1 lg:p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 hover-scale"
                    title="Delete workout"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add/Edit Workout Modal */}
        {showAddWorkout && (
          <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-4 lg:p-6">
                <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4">
                  {editingWorkout ? 'Edit Workout' : 'Add New Workout'}
                </h3>
                
                <div className="space-y-4">
                  {/* Workout Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Workout *
                    </label>
                    <input
                      type="text"
                      value={newWorkout.name}
                      onChange={(e) => setNewWorkout({ ...newWorkout, name: e.target.value })}
                      placeholder="e.g., Push-up, Jogging, Plank"
                      className="input"
                      autoFocus
                    />
                  </div>

                  {/* Repetitions Checkbox and Input */}
                  <div>
                    <label className="flex items-center space-x-2 mb-2">
                      <input
                        type="checkbox"
                        checked={newWorkout.hasRepetitions}
                        onChange={(e) => setNewWorkout({ ...newWorkout, hasRepetitions: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Ada Repetisi</span>
                    </label>
                    {newWorkout.hasRepetitions && (
                      <input
                        type="number"
                        value={newWorkout.repetitions}
                        onChange={(e) => setNewWorkout({ ...newWorkout, repetitions: e.target.value })}
                        placeholder="Jumlah repetisi"
                        className="input"
                        min="1"
                      />
                    )}
                  </div>

                  {/* Duration Checkbox and Input */}
                  <div>
                    <label className="flex items-center space-x-2 mb-2">
                      <input
                        type="checkbox"
                        checked={newWorkout.hasDuration}
                        onChange={(e) => setNewWorkout({ ...newWorkout, hasDuration: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Ada Waktu (Timer)</span>
                    </label>
                    {newWorkout.hasDuration && (
                      <div className="space-y-2">
                        <input
                          type="number"
                          value={newWorkout.duration_minutes}
                          onChange={(e) => setNewWorkout({ ...newWorkout, duration_minutes: e.target.value })}
                          placeholder="Durasi dalam menit"
                          className="input"
                          min="1"
                        />
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <Timer className="w-4 h-4 text-purple-500" />
                          <span>Timer akan tersedia saat workout dimulai</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button 
                    onClick={editingWorkout ? updateWorkout : addWorkout} 
                    className="btn-primary flex-1"
                    disabled={!newWorkout.name.trim()}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingWorkout ? 'Update' : 'Add'} Workout
                  </button>
                  <button onClick={cancelEdit} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🍎 2. CALORIE TRACKER */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center space-x-2 lg:space-x-3 min-w-0 flex-1">
            <div className="w-6 h-6 lg:w-8 lg:h-8 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Apple className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="card-title text-sm lg:text-base truncate">Calorie Tracker</h2>
              <p className="text-xs text-gray-500">
                {calorieBalance > 0 ? `+${calorieBalance} surplus` : `${calorieBalance} defisit`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddMeal(true)}
            className="btn-primary text-xs lg:text-sm px-2 lg:px-3 py-1.5 lg:py-2 flex-shrink-0 ml-2"
          >
            <Plus className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
            <span className="hidden sm:inline">Add Meal</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {/* Calorie Summary */}
        <div className="grid grid-cols-2 gap-3 lg:gap-4 mb-3 lg:mb-4">
          <div className="p-2 lg:p-3 bg-green-50 rounded-xl border border-green-200">
            <div className="flex items-center justify-between">
              <span className="text-xs lg:text-sm font-medium text-green-700">Kalori Masuk</span>
              <Apple className="w-3 h-3 lg:w-4 lg:h-4 text-green-600" />
            </div>
            <div className="text-lg lg:text-xl font-bold text-green-600">{totalCaloriesIn}</div>
            <div className="text-xs text-green-600">kcal</div>
          </div>
          <div className="p-2 lg:p-3 bg-orange-50 rounded-xl border border-orange-200">
            <div className="flex items-center justify-between">
              <span className="text-xs lg:text-sm font-medium text-orange-700">Kalori Keluar</span>
              <Flame className="w-3 h-3 lg:w-4 lg:h-4 text-orange-600" />
            </div>
            <div className="text-lg lg:text-xl font-bold text-orange-600">{totalCaloriesOut}</div>
            <div className="text-xs text-orange-600">kcal</div>
          </div>
        </div>

        {/* Calorie Balance Progress */}
        <div className="mb-3 lg:mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs lg:text-sm font-medium text-gray-700">Balance</span>
            <span className={`text-xs lg:text-sm font-medium ${calorieBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {calorieBalance > 0 ? `+${calorieBalance}` : calorieBalance} kcal
            </span>
          </div>
          <div className="progress-bar">
            <div 
              className={`progress-fill ${calorieBalance > 0 ? 'progress-fill-error' : 'progress-fill-success'}`}
              style={{ width: `${Math.min(Math.abs(calorieBalance) / 10, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Recent Meals */}
        <div>
          <h4 className="text-xs lg:text-sm font-medium text-gray-700 mb-2">Makanan Hari Ini</h4>
          <div className="space-y-2">
            {caloriesIn.slice(0, 3).map((meal, index) => (
              <div key={meal.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg gap-2">
                <div className="flex-1 min-w-0">
                  <span className="text-xs lg:text-sm font-medium text-gray-900 block truncate">{meal.category}</span>
                  <p className="text-xs text-gray-600 truncate">{meal.description}</p>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span className="text-xs lg:text-sm font-medium text-gray-900">{meal.amount} kcal</span>
                  <div className="flex items-center space-x-0.5">
                    <button
                      onClick={() => editMeal(meal)}
                      className="p-1 text-blue-500 hover:bg-blue-50 rounded transition-all duration-200"
                      title="Edit meal"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => showDeleteConfirmation('meal', meal.id, meal.description)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded transition-all duration-200"
                      title="Delete meal"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add/Edit Meal Modal */}
        {showAddMeal && (
          <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-4 lg:p-6">
                <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4">
                  {editingMeal ? 'Edit Meal' : 'Add Meal'}
                </h3>
                <div className="space-y-3">
                  <select
                    value={newMeal.category}
                    onChange={(e) => setNewMeal({ ...newMeal, category: e.target.value })}
                    className="input"
                  >
                    <option value="Sarapan">Sarapan</option>
                    <option value="Makan Siang">Makan Siang</option>
                    <option value="Makan Malam">Makan Malam</option>
                    <option value="Snack">Snack</option>
                  </select>
                  <input
                    type="text"
                    value={newMeal.description}
                    onChange={(e) => setNewMeal({ ...newMeal, description: e.target.value })}
                    placeholder="Deskripsi makanan"
                    className="input"
                  />
                  <input
                    type="number"
                    value={newMeal.amount}
                    onChange={(e) => setNewMeal({ ...newMeal, amount: e.target.value })}
                    placeholder="Kalori (kcal)"
                    className="input"
                  />
                </div>
                <div className="flex space-x-3 mt-4">
                  <button 
                    onClick={editingMeal ? updateMeal : addMeal} 
                    className="btn-primary flex-1"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingMeal ? 'Update' : 'Add'} Meal
                  </button>
                  <button onClick={cancelEdit} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ⚖️ 3. BODY PROGRESS CHART - WEEKLY */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center space-x-2 lg:space-x-3 min-w-0 flex-1">
            <div className="w-6 h-6 lg:w-8 lg:h-8 bg-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Scale className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
            </div>
            <h2 className="card-title text-sm lg:text-base truncate">Weekly Body Progress</h2>
          </div>
          <button
            onClick={() => setShowAddWeight(true)}
            className="btn-primary text-xs lg:text-sm px-2 lg:px-3 py-1.5 lg:py-2 flex-shrink-0 ml-2"
          >
            <Plus className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
            <span className="hidden sm:inline">Add Entry</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {/* Weight Chart Simulation - Weekly */}
        <div className="mb-3 lg:mb-4 p-3 lg:p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs lg:text-sm font-medium text-gray-700">Berat Badan (7 minggu terakhir)</span>
            <TrendingUp className="w-3 h-3 lg:w-4 lg:h-4 text-blue-600" />
          </div>
          
          {/* Simple Line Chart Representation */}
          <div className="h-24 lg:h-32 flex items-end space-x-1 lg:space-x-2">
            {weightEntries.slice(0, 7).reverse().map((entry, index) => {
              const minWeight = Math.min(...weightEntries.slice(0, 7).map(e => e.weight));
              const maxWeight = Math.max(...weightEntries.slice(0, 7).map(e => e.weight));
              const range = maxWeight - minWeight || 1;
              const height = ((entry.weight - minWeight) / range) * 80 + 20; // 20-100% height
              
              return (
                <div key={entry.id} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-blue-500 rounded-t-sm transition-all duration-500"
                    style={{ height: `${height}%` }}
                  ></div>
                  <span className="text-xs text-gray-600 mt-1">{entry.weight}kg</span>
                  <span className="text-xs text-gray-500 truncate">{entry.week}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weight Log - Weekly */}
        <div>
          <h4 className="text-xs lg:text-sm font-medium text-gray-700 mb-2">Log 7 Minggu Terakhir</h4>
          <div className="space-y-2">
            {weightEntries.slice(0, 7).map((entry, index) => (
              <div key={entry.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg gap-2">
                <div className="flex-1 min-w-0">
                  <span className="text-xs lg:text-sm font-medium text-gray-900">{entry.weight} kg</span>
                  {entry.bodyFat && (
                    <span className="text-xs text-gray-600 ml-2">({entry.bodyFat}% fat)</span>
                  )}
                  <div className="text-xs text-gray-500">Week {entry.week}</div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span className="text-xs text-gray-500">{formatDateIndonesian(entry.date)}</span>
                  <div className="flex items-center space-x-0.5">
                    <button
                      onClick={() => editWeight(entry)}
                      className="p-1 text-blue-500 hover:bg-blue-50 rounded transition-all duration-200"
                      title="Edit weight"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => showDeleteConfirmation('weight', entry.id, `${entry.weight} kg`)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded transition-all duration-200"
                      title="Delete weight"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add/Edit Weight Modal */}
        {showAddWeight && (
          <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-4 lg:p-6">
                <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4">
                  {editingWeight ? 'Edit Weekly Weight Entry' : 'Add Weekly Weight Entry'}
                </h3>
                <div className="space-y-3">
                  <input
                    type="number"
                    step="0.1"
                    value={newWeight.weight}
                    onChange={(e) => setNewWeight({ ...newWeight, weight: e.target.value })}
                    placeholder="Berat badan (kg)"
                    className="input"
                    autoFocus
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={newWeight.bodyFat}
                    onChange={(e) => setNewWeight({ ...newWeight, bodyFat: e.target.value })}
                    placeholder="Body fat % (opsional)"
                    className="input"
                  />
                </div>
                <div className="flex space-x-3 mt-4">
                  <button 
                    onClick={editingWeight ? updateWeight : addWeight} 
                    className="btn-primary flex-1"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingWeight ? 'Update' : 'Save'} Entry
                  </button>
                  <button onClick={cancelEdit} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🎯 4. FITNESS GOAL SUMMARY */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center space-x-2 lg:space-x-3 min-w-0 flex-1">
            <div className="w-6 h-6 lg:w-8 lg:h-8 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Target className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
            </div>
            <h2 className="card-title text-sm lg:text-base truncate">Fitness Goal Summary</h2>
          </div>
          <button
            onClick={() => setShowEditGoal(true)}
            className="btn-secondary text-xs lg:text-sm px-2 lg:px-3 py-1.5 lg:py-2 flex-shrink-0 ml-2"
          >
            <Edit2 className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
            <span className="hidden sm:inline">Edit Goal</span>
            <span className="sm:hidden">Edit</span>
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <div className="p-2 lg:p-3 bg-blue-50 rounded-xl border border-blue-200">
            <div className="text-xs lg:text-sm font-medium text-blue-700">Berat Target</div>
            <div className="text-lg lg:text-xl font-bold text-blue-600">{fitnessGoal.targetWeight} kg</div>
          </div>
          <div className="p-2 lg:p-3 bg-green-50 rounded-xl border border-green-200">
            <div className="text-xs lg:text-sm font-medium text-green-700">Berat Saat Ini</div>
            <div className="text-lg lg:text-xl font-bold text-green-600">{fitnessGoal.currentWeight} kg</div>
          </div>
          <div className="p-2 lg:p-3 bg-purple-50 rounded-xl border border-purple-200">
            <div className="text-xs lg:text-sm font-medium text-purple-700">Mode</div>
            <div className="text-xs lg:text-sm font-bold text-purple-600 capitalize">{fitnessGoal.mode}</div>
          </div>
          <div className="p-2 lg:p-3 bg-gray-50 rounded-xl border border-gray-200">
            <div className="text-xs lg:text-sm font-medium text-gray-700">Update Terakhir</div>
            <div className="text-xs lg:text-sm font-bold text-gray-600">
              {formatDateIndonesian(fitnessGoal.lastUpdate)}
            </div>
          </div>
        </div>

        {/* Edit Goal Modal */}
        {showEditGoal && (
          <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-4 lg:p-6">
                <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4">Edit Fitness Goal</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={fitnessGoal.targetWeight}
                      onChange={(e) => setFitnessGoal({ ...fitnessGoal, targetWeight: parseFloat(e.target.value) || 0 })}
                      placeholder="Target weight (kg)"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={fitnessGoal.currentWeight}
                      onChange={(e) => setFitnessGoal({ ...fitnessGoal, currentWeight: parseFloat(e.target.value) || 0 })}
                      placeholder="Current weight (kg)"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mode
                    </label>
                    <select
                      value={fitnessGoal.mode}
                      onChange={(e) => setFitnessGoal({ ...fitnessGoal, mode: e.target.value as any })}
                      className="input"
                    >
                      <option value="cutting">Cutting (Turun berat)</option>
                      <option value="bulking">Bulking (Naik berat)</option>
                      <option value="maintenance">Maintenance (Pertahankan)</option>
                    </select>
                  </div>
                </div>
                <div className="flex space-x-3 mt-4">
                  <button onClick={updateGoal} className="btn-primary flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    Update Goal
                  </button>
                  <button onClick={() => setShowEditGoal(false)} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 📊 STATISTICS RING */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center space-x-2 lg:space-x-3">
            <div className="w-6 h-6 lg:w-8 lg:h-8 bg-indigo-500 rounded-xl flex items-center justify-center">
              <Activity className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
            </div>
            <h2 className="card-title text-sm lg:text-base">Weekly Statistics</h2>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <div className="stat-card stat-card-primary">
            <div className="stat-value text-lg lg:text-xl">{currentWeight} kg</div>
            <div className="stat-label text-xs">Berat Terakhir</div>
          </div>
          <div className={`stat-card ${weightChange < 0 ? 'stat-card-success' : weightChange > 0 ? 'stat-card-error' : 'stat-card-warning'}`}>
            <div className="stat-value text-lg lg:text-xl">
              {weightChange > 0 ? '+' : ''}{weightChange} kg
            </div>
            <div className="stat-label text-xs">Perubahan 7 Minggu</div>
          </div>
          <div className="stat-card stat-card-success">
            <div className="stat-value text-lg lg:text-xl">{weeklyWorkouts}</div>
            <div className="stat-label text-xs">Workout Selesai</div>
          </div>
          <div className={`stat-card ${calorieBalance > 0 ? 'stat-card-error' : 'stat-card-success'}`}>
            <div className="stat-value text-lg lg:text-xl">
              {calorieBalance > 0 ? 'Surplus' : 'Defisit'}
            </div>
            <div className="stat-label text-xs">Status Kalori</div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-4 lg:p-6">
              {/* Icon */}
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-5 h-5 lg:w-6 lg:h-6 text-red-600" />
              </div>
              
              {/* Content */}
              <div className="text-center mb-4 lg:mb-6">
                <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-2">
                  Hapus {deleteConfirmation.type === 'workout' ? 'Workout' : deleteConfirmation.type === 'meal' ? 'Makanan' : 'Data Berat'}
                </h3>
                <p className="text-sm lg:text-base text-gray-600 leading-relaxed">
                  Apakah Anda yakin ingin menghapus "{deleteConfirmation.name}"?
                </p>
              </div>
              
              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={hideDeleteConfirmation}
                  className="flex-1 px-3 lg:px-4 py-2 lg:py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 text-sm lg:text-base"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-3 lg:px-4 py-2 lg:py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all duration-200 text-sm lg:text-base"
                >
                  Hapus
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