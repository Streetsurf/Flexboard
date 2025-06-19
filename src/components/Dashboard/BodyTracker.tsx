import React, { useState, useEffect } from 'react';
import { 
  User, 
  Target, 
  Utensils, 
  Activity, 
  TrendingUp, 
  BarChart3, 
  Edit2, 
  Trash2, 
  Plus,
  Save,
  X,
  Calendar,
  Clock,
  Flame,
  Award
} from 'lucide-react';
import BodyTrackerDashboard from './BodyTrackerDashboard';

interface UserProfile {
  age: number;
  gender: 'male' | 'female';
  height: number;
  weight: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
}

interface FitnessGoal {
  mode: 'cutting' | 'bulking' | 'maintenance';
  targetWeight: number;
  targetCalories: number;
}

interface CalorieEntry {
  id: string;
  type: 'food' | 'exercise';
  name: string;
  calories: number;
  category?: string;
  description?: string;
  date: string;
}

interface WorkoutEntry {
  id: string;
  name: string;
  duration: number;
  caloriesBurned: number;
  completed: boolean;
  date: string;
}

interface BodyProgress {
  id: string;
  weight: number;
  bodyFat?: number;
  date: string;
}

type ActiveTab = 'dashboard' | 'profile' | 'target' | 'calories' | 'workout' | 'progress' | 'stats';

const BodyTracker: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  
  const [profile, setProfile] = useState<UserProfile>({
    age: 25,
    gender: 'male',
    height: 170,
    weight: 70,
    activityLevel: 'moderate'
  });

  const [goal, setGoal] = useState<FitnessGoal>({
    mode: 'cutting',
    targetWeight: 65,
    targetCalories: 2046
  });

  const [calorieEntries, setCalorieEntries] = useState<CalorieEntry[]>([
    {
      id: '1',
      type: 'food',
      name: 'Nasi Goreng',
      calories: 450,
      category: 'Makanan Utama',
      description: 'Nasi goreng ayam dengan telur',
      date: '2024-01-15'
    },
    {
      id: '2',
      type: 'exercise',
      name: 'Jogging 30 menit',
      calories: -300,
      category: 'Cardio',
      description: 'Jogging pagi di taman',
      date: '2024-01-15'
    }
  ]);

  const [workoutEntries, setWorkoutEntries] = useState<WorkoutEntry[]>([
    {
      id: '1',
      name: 'Push Up',
      duration: 15,
      caloriesBurned: 50,
      completed: true,
      date: '2024-01-15'
    },
    {
      id: '2',
      name: 'Plank',
      duration: 10,
      caloriesBurned: 30,
      completed: false,
      date: '2024-01-15'
    }
  ]);

  const [bodyProgress, setBodyProgress] = useState<BodyProgress[]>([
    { id: '1', weight: 72, bodyFat: 18, date: '2024-01-08' },
    { id: '2', weight: 71.5, bodyFat: 17.8, date: '2024-01-09' },
    { id: '3', weight: 71, bodyFat: 17.5, date: '2024-01-10' },
    { id: '4', weight: 70.8, bodyFat: 17.3, date: '2024-01-11' },
    { id: '5', weight: 70.5, bodyFat: 17, date: '2024-01-12' },
    { id: '6', weight: 70.2, bodyFat: 16.8, date: '2024-01-13' },
    { id: '7', weight: 70, bodyFat: 16.5, date: '2024-01-14' }
  ]);

  const [editingProfile, setEditingProfile] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const [showAddCalorie, setShowAddCalorie] = useState(false);
  const [showAddWorkout, setShowAddWorkout] = useState(false);
  const [showAddProgress, setShowAddProgress] = useState(false);

  const [newCalorieEntry, setNewCalorieEntry] = useState({
    type: 'food' as 'food' | 'exercise',
    name: '',
    calories: 0,
    category: '',
    description: ''
  });

  const [newWorkoutEntry, setNewWorkoutEntry] = useState({
    name: '',
    duration: 0,
    caloriesBurned: 0
  });

  const [newProgressEntry, setNewProgressEntry] = useState({
    weight: 0,
    bodyFat: 0
  });

  const [editingCalorie, setEditingCalorie] = useState<CalorieEntry | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutEntry | null>(null);
  const [editingProgress, setEditingProgress] = useState<BodyProgress | null>(null);

  // Calculation functions
  const calculateBMR = (profile: UserProfile): number => {
    const { age, gender, height, weight } = profile;
    if (gender === 'male') {
      return (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
      return (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }
  };

  const calculateTDEE = (bmr: number, activityLevel: string): number => {
    const multipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };
    return bmr * (multipliers[activityLevel as keyof typeof multipliers] || 1.55);
  };

  const calculateTargetCalories = (tdee: number, mode: string): number => {
    switch (mode) {
      case 'cutting': return tdee - 500;
      case 'bulking': return tdee + 300;
      case 'maintenance': return tdee;
      default: return tdee;
    }
  };

  const bmr = calculateBMR(profile);
  const tdee = calculateTDEE(bmr, profile.activityLevel);
  const targetCalories = calculateTargetCalories(tdee, goal.mode);

  const todayCalories = calorieEntries
    .filter(entry => entry.date === '2024-01-15')
    .reduce((sum, entry) => sum + entry.calories, 0);

  const todayWorkouts = workoutEntries.filter(entry => entry.date === '2024-01-15');
  const completedWorkouts = todayWorkouts.filter(workout => workout.completed);

  const calorieDeficit = targetCalories - todayCalories;

  // CRUD Functions
  const handleSaveProfile = () => {
    setEditingProfile(false);
  };

  const handleSaveGoal = () => {
    const newTargetCalories = calculateTargetCalories(tdee, goal.mode);
    setGoal({ ...goal, targetCalories: newTargetCalories });
    setEditingGoal(false);
  };

  const handleAddCalorie = () => {
    const newEntry: CalorieEntry = {
      id: Date.now().toString(),
      ...newCalorieEntry,
      date: '2024-01-15'
    };
    setCalorieEntries([...calorieEntries, newEntry]);
    setNewCalorieEntry({ type: 'food', name: '', calories: 0, category: '', description: '' });
    setShowAddCalorie(false);
  };

  const handleEditCalorie = (entry: CalorieEntry) => {
    setEditingCalorie(entry);
    setNewCalorieEntry({
      type: entry.type,
      name: entry.name,
      calories: entry.calories,
      category: entry.category || '',
      description: entry.description || ''
    });
    setShowAddCalorie(true);
  };

  const handleUpdateCalorie = () => {
    if (editingCalorie) {
      setCalorieEntries(calorieEntries.map(entry => 
        entry.id === editingCalorie.id 
          ? { ...entry, ...newCalorieEntry }
          : entry
      ));
      setEditingCalorie(null);
      setNewCalorieEntry({ type: 'food', name: '', calories: 0, category: '', description: '' });
      setShowAddCalorie(false);
    }
  };

  const handleDeleteCalorie = (id: string) => {
    setCalorieEntries(calorieEntries.filter(entry => entry.id !== id));
  };

  const handleAddWorkout = () => {
    const newEntry: WorkoutEntry = {
      id: Date.now().toString(),
      ...newWorkoutEntry,
      completed: false,
      date: '2024-01-15'
    };
    setWorkoutEntries([...workoutEntries, newEntry]);
    setNewWorkoutEntry({ name: '', duration: 0, caloriesBurned: 0 });
    setShowAddWorkout(false);
  };

  const handleEditWorkout = (entry: WorkoutEntry) => {
    setEditingWorkout(entry);
    setNewWorkoutEntry({
      name: entry.name,
      duration: entry.duration,
      caloriesBurned: entry.caloriesBurned
    });
    setShowAddWorkout(true);
  };

  const handleUpdateWorkout = () => {
    if (editingWorkout) {
      setWorkoutEntries(workoutEntries.map(entry => 
        entry.id === editingWorkout.id 
          ? { ...entry, ...newWorkoutEntry }
          : entry
      ));
      setEditingWorkout(null);
      setNewWorkoutEntry({ name: '', duration: 0, caloriesBurned: 0 });
      setShowAddWorkout(false);
    }
  };

  const handleDeleteWorkout = (id: string) => {
    setWorkoutEntries(workoutEntries.filter(entry => entry.id !== id));
  };

  const toggleWorkoutComplete = (id: string) => {
    setWorkoutEntries(workoutEntries.map(entry => 
      entry.id === id ? { ...entry, completed: !entry.completed } : entry
    ));
  };

  const handleAddProgress = () => {
    const newEntry: BodyProgress = {
      id: Date.now().toString(),
      ...newProgressEntry,
      date: '2024-01-15'
    };
    setBodyProgress([...bodyProgress, newEntry]);
    setNewProgressEntry({ weight: 0, bodyFat: 0 });
    setShowAddProgress(false);
  };

  const handleEditProgress = (entry: BodyProgress) => {
    setEditingProgress(entry);
    setNewProgressEntry({
      weight: entry.weight,
      bodyFat: entry.bodyFat || 0
    });
    setShowAddProgress(true);
  };

  const handleUpdateProgress = () => {
    if (editingProgress) {
      setBodyProgress(bodyProgress.map(entry => 
        entry.id === editingProgress.id 
          ? { ...entry, ...newProgressEntry }
          : entry
      ));
      setEditingProgress(null);
      setNewProgressEntry({ weight: 0, bodyFat: 0 });
      setShowAddProgress(false);
    }
  };

  const handleDeleteProgress = (id: string) => {
    setBodyProgress(bodyProgress.filter(entry => entry.id !== id));
  };

  const getCalorieStatus = () => {
    const remaining = targetCalories - todayCalories;
    if (remaining > 500) return { text: 'Masih bisa makan', color: 'text-blue-600' };
    if (remaining > 0) return { text: 'Target hampir tercapai', color: 'text-green-600' };
    if (remaining > -200) return { text: 'Sedikit berlebih', color: 'text-yellow-600' };
    return { text: 'Berlebihan', color: 'text-red-600' };
  };

  const getActivityLevelText = (level: string) => {
    const levels = {
      sedentary: 'Sedentary (jarang aktivitas)',
      light: 'Light (1-3x latihan per minggu)',
      moderate: 'Moderate (3-5x latihan per minggu)',
      active: 'Active (latihan intensif 6-7x per minggu)',
      very_active: 'Very Active (latihan berat setiap hari)'
    };
    return levels[level as keyof typeof levels] || level;
  };

  const getModeText = (mode: string) => {
    const modes = {
      cutting: 'Cutting (menurunkan berat badan)',
      bulking: 'Bulking (menaikkan berat badan)',
      maintenance: 'Maintenance (mempertahankan berat badan)'
    };
    return modes[mode as keyof typeof modes] || mode;
  };

  const calorieStatus = getCalorieStatus();

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'target', label: 'Target', icon: Target },
    { id: 'calories', label: 'Kalori', icon: Utensils },
    { id: 'workout', label: 'Workout', icon: Activity },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
    { id: 'stats', label: 'Statistik', icon: BarChart3 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card animate-fadeIn">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <h2 className="card-title">Body Tracker</h2>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && <BodyTrackerDashboard />}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Profile */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h3 className="card-title">Informasi Dasar</h3>
              <button
                onClick={() => setEditingProfile(!editingProfile)}
                className="flex items-center space-x-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-all duration-200"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            </div>

            {editingProfile ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Umur</label>
                    <input
                      type="number"
                      value={profile.age}
                      onChange={(e) => setProfile({...profile, age: parseInt(e.target.value)})}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select
                      value={profile.gender}
                      onChange={(e) => setProfile({...profile, gender: e.target.value as 'male' | 'female'})}
                      className="input"
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
                      value={profile.height}
                      onChange={(e) => setProfile({...profile, height: parseInt(e.target.value)})}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Berat (kg)</label>
                    <input
                      type="number"
                      value={profile.weight}
                      onChange={(e) => setProfile({...profile, weight: parseInt(e.target.value)})}
                      className="input"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tingkat Aktivitas</label>
                  <select
                    value={profile.activityLevel}
                    onChange={(e) => setProfile({...profile, activityLevel: e.target.value as any})}
                    className="input"
                  >
                    <option value="sedentary">Sedentary (jarang aktivitas)</option>
                    <option value="light">Light (1-3x latihan per minggu)</option>
                    <option value="moderate">Moderate (3-5x latihan per minggu)</option>
                    <option value="active">Active (latihan intensif 6-7x per minggu)</option>
                    <option value="very_active">Very Active (latihan berat setiap hari)</option>
                  </select>
                </div>
                <div className="flex space-x-2">
                  <button onClick={handleSaveProfile} className="btn-primary">
                    <Save className="w-4 h-4 mr-2" />
                    Simpan
                  </button>
                  <button onClick={() => setEditingProfile(false)} className="btn-secondary">
                    <X className="w-4 h-4 mr-2" />
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Umur:</span>
                  <span className="font-medium">{profile.age} tahun</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Gender:</span>
                  <span className="font-medium">{profile.gender === 'male' ? 'Pria' : 'Wanita'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tinggi:</span>
                  <span className="font-medium">{profile.height} cm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Berat:</span>
                  <span className="font-medium">{profile.weight} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Aktivitas:</span>
                  <span className="font-medium">{getActivityLevelText(profile.activityLevel)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Metabolism Calculations */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h3 className="card-title">Perhitungan Metabolisme</h3>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-blue-700 font-medium">BMR (Basal Metabolic Rate)</span>
                  <span className="text-xl font-bold text-blue-600">{Math.round(bmr)}</span>
                </div>
                <p className="text-xs text-blue-600">Kalori yang dibutuhkan tubuh saat istirahat</p>
              </div>

              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-green-700 font-medium">TDEE (Total Daily Energy)</span>
                  <span className="text-xl font-bold text-green-600">{Math.round(tdee)}</span>
                </div>
                <p className="text-xs text-green-600">Total kalori yang dibutuhkan per hari</p>
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
      {activeTab === 'target' && (
        <div className="card animate-fadeIn">
          <div className="card-header">
            <h3 className="card-title">Target Fitness</h3>
            <button
              onClick={() => setEditingGoal(!editingGoal)}
              className="flex items-center space-x-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-all duration-200"
            >
              <Edit2 className="w-3 h-3" />
              <span>Edit</span>
            </button>
          </div>

          {editingGoal ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode Target</label>
                <select
                  value={goal.mode}
                  onChange={(e) => setGoal({...goal, mode: e.target.value as any})}
                  className="input"
                >
                  <option value="cutting">Cutting (menurunkan berat badan)</option>
                  <option value="bulking">Bulking (menaikkan berat badan)</option>
                  <option value="maintenance">Maintenance (mempertahankan berat badan)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Berat Badan (kg)</label>
                <input
                  type="number"
                  value={goal.targetWeight}
                  onChange={(e) => setGoal({...goal, targetWeight: parseFloat(e.target.value)})}
                  className="input"
                />
              </div>
              <div className="flex space-x-2">
                <button onClick={handleSaveGoal} className="btn-primary">
                  <Save className="w-4 h-4 mr-2" />
                  Simpan
                </button>
                <button onClick={() => setEditingGoal(false)} className="btn-secondary">
                  <X className="w-4 h-4 mr-2" />
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Mode Saat Ini</h4>
                  <p className="text-blue-700">{getModeText(goal.mode)}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-900 mb-2">Target Berat Badan</h4>
                  <p className="text-green-700 text-xl font-bold">{goal.targetWeight} kg</p>
                </div>
              </div>
              
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="font-medium text-yellow-900 mb-2">Kalori Harian Target</h4>
                <p className="text-yellow-700 text-2xl font-bold">{Math.round(targetCalories)} kalori</p>
                <p className="text-xs text-yellow-600 mt-1">
                  {goal.mode === 'cutting' && 'TDEE dikurangi 500 kalori untuk defisit'}
                  {goal.mode === 'bulking' && 'TDEE ditambah 300 kalori untuk surplus'}
                  {goal.mode === 'maintenance' && 'Kalori sesuai TDEE untuk mempertahankan berat'}
                </p>
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
              <h3 className="card-title">Ringkasan Kalori Hari Ini</h3>
              <button
                onClick={() => setShowAddCalorie(true)}
                className="btn-icon-primary"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="stat-card bg-blue-50 border-blue-200">
                <div className="stat-value text-blue-600">{Math.round(targetCalories)}</div>
                <div className="stat-label">Target Kalori</div>
              </div>
              <div className="stat-card bg-green-50 border-green-200">
                <div className="stat-value text-green-600">{todayCalories}</div>
                <div className="stat-label">Kalori Masuk</div>
              </div>
              <div className="stat-card bg-orange-50 border-orange-200">
                <div className="stat-value text-orange-600">{Math.round(targetCalories - todayCalories)}</div>
                <div className="stat-label">Sisa Kalori</div>
              </div>
              <div className="stat-card">
                <div className={`stat-value ${calorieStatus.color}`}>
                  {calorieStatus.text}
                </div>
                <div className="stat-label">Status</div>
              </div>
            </div>
          </div>

          {/* Calorie Entries */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h3 className="card-title">Catatan Kalori</h3>
            </div>

            <div className="space-y-3">
              {calorieEntries.filter(entry => entry.date === '2024-01-15').map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${entry.type === 'food' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <div>
                      <h4 className="font-medium text-gray-900">{entry.name}</h4>
                      <p className="text-xs text-gray-600">{entry.category} • {entry.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`font-medium ${entry.calories > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {entry.calories > 0 ? '+' : ''}{entry.calories} kcal
                    </span>
                    <button
                      onClick={() => handleEditCalorie(entry)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteCalorie(entry.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Calorie Modal */}
          {showAddCalorie && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl p-6 w-full max-w-md">
                
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {editingCalorie ? 'Edit Kalori' : 'Tambah Kalori'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowAddCalorie(false);
                      setEditingCalorie(null);
                      setNewCalorieEntry({ type: 'food', name: '', calories: 0, category: '', description: '' });
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipe</label>
                    <select
                      value={newCalorieEntry.type}
                      onChange={(e) => setNewCalorieEntry({...newCalorieEntry, type: e.target.value as 'food' | 'exercise'})}
                      className="input"
                    >
                      <option value="food">Makanan</option>
                      <option value="exercise">Olahraga</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
                    <input
                      type="text"
                      value={newCalorieEntry.name}
                      onChange={(e) => setNewCalorieEntry({...newCalorieEntry, name: e.target.value})}
                      className="input"
                      placeholder="Nama makanan/olahraga"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kalori</label>
                    <input
                      type="number"
                      value={newCalorieEntry.calories}
                      onChange={(e) => setNewCalorieEntry({...newCalorieEntry, calories: parseInt(e.target.value)})}
                      className="input"
                      placeholder="Jumlah kalori"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                    <input
                      type="text"
                      value={newCalorieEntry.category}
                      onChange={(e) => setNewCalorieEntry({...newCalorieEntry, category: e.target.value})}
                      className="input"
                      placeholder="Kategori"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                    <textarea
                      value={newCalorieEntry.description}
                      onChange={(e) => setNewCalorieEntry({...newCalorieEntry, description: e.target.value})}
                      className="textarea"
                      rows={2}
                      placeholder="Deskripsi tambahan"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={editingCalorie ? handleUpdateCalorie : handleAddCalorie}
                    className="flex-1 btn-primary"
                  >
                    {editingCalorie ? 'Update' : 'Tambah'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddCalorie(false);
                      setEditingCalorie(null);
                      setNewCalorieEntry({ type: 'food', name: '', calories: 0, category: '', description: '' });
                    }}
                    className="flex-1 btn-secondary"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Workout Tab */}
      {activeTab === 'workout' && (
        <div className="space-y-6">
          {/* Workout Summary */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h3 className="card-title">Workout Hari Ini</h3>
              <button
                onClick={() => setShowAddWorkout(true)}
                className="btn-icon-primary"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="stat-card bg-blue-50 border-blue-200">
                <div className="stat-value text-blue-600">{todayWorkouts.length}</div>
                <div className="stat-label">Total Workout</div>
              </div>
              <div className="stat-card bg-green-50 border-green-200">
                <div className="stat-value text-green-600">{completedWorkouts.length}</div>
                <div className="stat-label">Selesai</div>
              </div>
              <div className="stat-card bg-orange-50 border-orange-200">
                <div className="stat-value text-orange-600">
                  {completedWorkouts.reduce((sum, workout) => sum + workout.caloriesBurned, 0)}
                </div>
                <div className="stat-label">Kalori Terbakar</div>
              </div>
            </div>
          </div>

          {/* Workout List */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h3 className="card-title">Daftar Workout</h3>
            </div>

            <div className="space-y-3">
              {todayWorkouts.map((workout) => (
                <div key={workout.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => toggleWorkoutComplete(workout.id)}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        workout.completed
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 hover:border-green-500'
                      }`}
                    >
                      {workout.completed && <span className="text-xs">✓</span>}
                    </button>
                    <div>
                      <h4 className={`font-medium ${workout.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                        {workout.name}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {workout.duration} menit • {workout.caloriesBurned} kalori
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditWorkout(workout)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteWorkout(workout.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Workout Modal */}
          {showAddWorkout && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {editingWorkout ? 'Edit Workout' : 'Tambah Workout'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowAddWorkout(false);
                      setEditingWorkout(null);
                      setNewWorkoutEntry({ name: '', duration: 0, caloriesBurned: 0 });
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Latihan</label>
                    <input
                      type="text"
                      value={newWorkoutEntry.name}
                      onChange={(e) => setNewWorkoutEntry({...newWorkoutEntry, name: e.target.value})}
                      className="input"
                      placeholder="Nama latihan"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Durasi (menit)</label>
                    <input
                      type="number"
                      value={newWorkoutEntry.duration}
                      onChange={(e) => setNewWorkoutEntry({...newWorkoutEntry, duration: parseInt(e.target.value)})}
                      className="input"
                      placeholder="Durasi dalam menit"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kalori Terbakar</label>
                    <input
                      type="number"
                      value={newWorkoutEntry.caloriesBurned}
                      onChange={(e) => setNewWorkoutEntry({...newWorkoutEntry, caloriesBurned: parseInt(e.target.value)})}
                      className="input"
                      placeholder="Estimasi kalori terbakar"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={editingWorkout ? handleUpdateWorkout : handleAddWorkout}
                    className="flex-1 btn-primary"
                  >
                    {editingWorkout ? 'Update' : 'Tambah'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddWorkout(false);
                      setEditingWorkout(null);
                      setNewWorkoutEntry({ name: '', duration: 0, caloriesBurned: 0 });
                    }}
                    className="flex-1 btn-secondary"
                  >
                    Batal
                  </button>
                </div>
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
              <h3 className="card-title">Progress Terkini</h3>
              <button
                onClick={() => setShowAddProgress(true)}
                className="btn-icon-primary"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="stat-card bg-blue-50 border-blue-200">
                <div className="stat-value text-blue-600">{bodyProgress[bodyProgress.length - 1]?.weight || 0}</div>
                <div className="stat-label">Berat Saat Ini (kg)</div>
              </div>
              <div className="stat-card bg-green-50 border-green-200">
                <div className="stat-value text-green-600">{goal.targetWeight}</div>
                <div className="stat-label">Target Berat (kg)</div>
              </div>
              <div className="stat-card bg-orange-50 border-orange-200">
                <div className="stat-value text-orange-600">
                  {bodyProgress[bodyProgress.length - 1]?.bodyFat || 0}%
                </div>
                <div className="stat-label">Body Fat</div>
              </div>
              <div className="stat-card bg-purple-50 border-purple-200">
                <div className="stat-value text-purple-600">
                  {Math.abs((bodyProgress[bodyProgress.length - 1]?.weight || 0) - goal.targetWeight).toFixed(1)}
                </div>
                <div className="stat-label">Sisa Target (kg)</div>
              </div>
            </div>
          </div>

          {/* Progress Chart */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h3 className="card-title">Grafik Berat Badan</h3>
            </div>

            <div className="h-64 flex items-end justify-between space-x-2 p-4">
              {bodyProgress.slice(-7).map((entry, index) => {
                const maxWeight = Math.max(...bodyProgress.map(p => p.weight));
                const minWeight = Math.min(...bodyProgress.map(p => p.weight));
                const height = ((entry.weight - minWeight) / (maxWeight - minWeight)) * 200 + 20;
                
                return (
                  <div key={entry.id} className="flex flex-col items-center">
                    <div
                      className="bg-blue-500 rounded-t w-8 transition-all duration-500 hover:bg-blue-600"
                      style={{ height: `${height}px` }}
                    ></div>
                    <div className="text-xs text-gray-600 mt-2 text-center">
                      <div className="font-medium">{entry.weight}kg</div>
                      <div>{new Date(entry.date).getDate()}/{new Date(entry.date).getMonth() + 1}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progress History */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h3 className="card-title">Riwayat Progress</h3>
            </div>

            <div className="space-y-3">
              {bodyProgress.slice(-5).reverse().map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {new Date(entry.date).toLocaleDateString('id-ID')}
                      </h4>
                      <p className="text-xs text-gray-600">
                        Berat: {entry.weight}kg
                        {entry.bodyFat && ` • Body Fat: ${entry.bodyFat}%`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditProgress(entry)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteProgress(entry.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Progress Modal */}
          {showAddProgress && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {editingProgress ? 'Edit Progress' : 'Tambah Progress'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowAddProgress(false);
                      setEditingProgress(null);
                      setNewProgressEntry({ weight: 0, bodyFat: 0 });
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Berat Badan (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newProgressEntry.weight}
                      onChange={(e) => setNewProgressEntry({...newProgressEntry, weight: parseFloat(e.target.value)})}
                      className="input"
                      placeholder="Berat badan"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Body Fat (%) - Opsional</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newProgressEntry.bodyFat}
                      onChange={(e) => setNewProgressEntry({...newProgressEntry, bodyFat: parseFloat(e.target.value)})}
                      className="input"
                      placeholder="Persentase body fat"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={editingProgress ? handleUpdateProgress : handleAddProgress}
                    className="flex-1 btn-primary"
                  >
                    {editingProgress ? 'Update' : 'Tambah'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddProgress(false);
                      setEditingProgress(null);
                      setNewProgressEntry({ weight: 0, bodyFat: 0 });
                    }}
                    className="flex-1 btn-secondary"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* Weekly Stats */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h3 className="card-title">Statistik Mingguan</h3>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="stat-card bg-green-50 border-green-200">
                <div className="stat-value text-green-600">{completedWorkouts.length}</div>
                <div className="stat-label">Workout Selesai</div>
              </div>
              <div className="stat-card bg-blue-50 border-blue-200">
                <div className="stat-value text-blue-600">
                  {bodyProgress.length > 1 
                    ? (bodyProgress[bodyProgress.length - 1].weight - bodyProgress[0].weight).toFixed(1)
                    : '0'
                  }
                </div>
                <div className="stat-label">Perubahan Berat (kg)</div>
              </div>
              <div className="stat-card bg-orange-50 border-orange-200">
                <div className="stat-value text-orange-600">
                  {calorieDeficit > 0 ? 'Defisit' : 'Surplus'}
                </div>
                <div className="stat-label">Status Kalori</div>
              </div>
              <div className="stat-card bg-purple-50 border-purple-200">
                <div className="stat-value text-purple-600">7.2</div>
                <div className="stat-label">Rata-rata Tidur (jam)</div>
              </div>
            </div>
          </div>

          {/* Monthly Overview */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h3 className="card-title">Ringkasan Bulanan</h3>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Target Progress</h4>
                <div className="flex justify-between items-center">
                  <span className="text-blue-700">Berat badan menuju target</span>
                  <span className="text-blue-600 font-bold">
                    {Math.abs((bodyProgress[bodyProgress.length - 1]?.weight || 0) - goal.targetWeight).toFixed(1)} kg lagi
                  </span>
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-900 mb-2">Konsistensi Workout</h4>
                <div className="flex justify-between items-center">
                  <span className="text-green-700">Workout minggu ini</span>
                  <span className="text-green-600 font-bold">{completedWorkouts.length}/7 hari</span>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="font-medium text-yellow-900 mb-2">Kalori Management</h4>
                <div className="flex justify-between items-center">
                  <span className="text-yellow-700">Status kalori harian</span>
                  <span className={`font-bold ${calorieStatus.color}`}>{calorieStatus.text}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BodyTracker;