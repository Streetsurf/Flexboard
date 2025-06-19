import React, { useState, useEffect } from 'react';
import { Dumbbell, Plus, X, Save, Edit2, Target, TrendingUp, Calendar, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';

interface BodyMetric {
  id: string;
  date: string;
  weight?: number;
  body_fat?: number;
  muscle_mass?: number;
  water_percentage?: number;
  notes?: string;
  user_id: string;
  created_at: string;
}

interface WorkoutSession {
  id: string;
  date: string;
  exercise_name: string;
  sets: number;
  reps: number;
  weight: number;
  duration_minutes?: number;
  notes?: string;
  user_id: string;
  created_at: string;
}

const BodyTracker: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'workouts' | 'goals'>('metrics');
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<BodyMetric | WorkoutSession | null>(null);
  const { user } = useAuth();

  // Form states
  const [metricForm, setMetricForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    weight: '',
    body_fat: '',
    muscle_mass: '',
    water_percentage: '',
    notes: ''
  });

  const [workoutForm, setWorkoutForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    exercise_name: '',
    sets: '',
    reps: '',
    weight: '',
    duration_minutes: '',
    notes: ''
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // For now, we'll use mock data since the tables don't exist yet
      setMetrics([]);
      setWorkouts([]);
      
    } catch (error) {
      console.error('Error fetching body tracker data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement when database tables are created
    console.log('Adding metric:', metricForm);
    setShowAddModal(false);
    resetForms();
  };

  const handleAddWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement when database tables are created
    console.log('Adding workout:', workoutForm);
    setShowAddModal(false);
    resetForms();
  };

  const resetForms = () => {
    setMetricForm({
      date: format(new Date(), 'yyyy-MM-dd'),
      weight: '',
      body_fat: '',
      muscle_mass: '',
      water_percentage: '',
      notes: ''
    });
    setWorkoutForm({
      date: format(new Date(), 'yyyy-MM-dd'),
      exercise_name: '',
      sets: '',
      reps: '',
      weight: '',
      duration_minutes: '',
      notes: ''
    });
    setEditingItem(null);
  };

  const closeModal = () => {
    setShowAddModal(false);
    resetForms();
  };

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
            Add {activeTab === 'metrics' ? 'Metric' : 'Workout'}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'metrics', label: 'Body Metrics', icon: TrendingUp },
              { id: 'workouts', label: 'Workouts', icon: Dumbbell },
              { id: 'goals', label: 'Goals', icon: Target }
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

        {/* Content based on active tab */}
        {activeTab === 'metrics' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="stat-card">
                <div className="stat-value text-blue-600">--</div>
                <div className="stat-label">Current Weight</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-green-600">--</div>
                <div className="stat-label">Body Fat %</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-purple-600">--</div>
                <div className="stat-label">Muscle Mass</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-orange-600">--</div>
                <div className="stat-label">Water %</div>
              </div>
            </div>

            {/* Metrics List */}
            <div className="space-y-3">
              {metrics.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm font-medium mb-2">No body metrics recorded yet</p>
                  <p className="text-xs">Start tracking your body composition and progress</p>
                </div>
              ) : (
                metrics.map((metric) => (
                  <div key={metric.id} className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{format(new Date(metric.date), 'MMM d, yyyy')}</h3>
                        <div className="text-sm text-gray-600 mt-1">
                          {metric.weight && <span>Weight: {metric.weight}kg </span>}
                          {metric.body_fat && <span>Body Fat: {metric.body_fat}% </span>}
                        </div>
                      </div>
                      <button
                        onClick={() => setEditingItem(metric)}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'workouts' && (
          <div className="space-y-6">
            {/* Workout Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="stat-card">
                <div className="stat-value text-blue-600">0</div>
                <div className="stat-label">This Week</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-green-600">0</div>
                <div className="stat-label">This Month</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-purple-600">0</div>
                <div className="stat-label">Total Sessions</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-orange-600">0h</div>
                <div className="stat-label">Total Time</div>
              </div>
            </div>

            {/* Workouts List */}
            <div className="space-y-3">
              {workouts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Dumbbell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm font-medium mb-2">No workouts recorded yet</p>
                  <p className="text-xs">Start logging your exercise sessions</p>
                </div>
              ) : (
                workouts.map((workout) => (
                  <div key={workout.id} className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{workout.exercise_name}</h3>
                        <div className="text-sm text-gray-600 mt-1">
                          {format(new Date(workout.date), 'MMM d, yyyy')} • {workout.sets} sets × {workout.reps} reps
                          {workout.weight && <span> @ {workout.weight}kg</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => setEditingItem(workout)}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'goals' && (
          <div className="space-y-6">
            <div className="text-center py-8 text-gray-500">
              <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm font-medium mb-2">Fitness Goals</p>
              <p className="text-xs">Set and track your fitness objectives</p>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Add {activeTab === 'metrics' ? 'Body Metric' : 'Workout'}
                </h3>
                <button
                  onClick={closeModal}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {activeTab === 'metrics' ? (
                <form onSubmit={handleAddMetric} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={metricForm.date}
                      onChange={(e) => setMetricForm({ ...metricForm, date: e.target.value })}
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
                        value={metricForm.weight}
                        onChange={(e) => setMetricForm({ ...metricForm, weight: e.target.value })}
                        className="input"
                        placeholder="70.5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Body Fat (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={metricForm.body_fat}
                        onChange={(e) => setMetricForm({ ...metricForm, body_fat: e.target.value })}
                        className="input"
                        placeholder="15.5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Muscle Mass (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={metricForm.muscle_mass}
                        onChange={(e) => setMetricForm({ ...metricForm, muscle_mass: e.target.value })}
                        className="input"
                        placeholder="45.2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Water (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={metricForm.water_percentage}
                        onChange={(e) => setMetricForm({ ...metricForm, water_percentage: e.target.value })}
                        className="input"
                        placeholder="60.0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <textarea
                      value={metricForm.notes}
                      onChange={(e) => setMetricForm({ ...metricForm, notes: e.target.value })}
                      className="textarea"
                      rows={3}
                      placeholder="Any additional notes..."
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button type="submit" className="flex-1 btn-primary">
                      <Save className="w-4 h-4 mr-2" />
                      Save Metric
                    </button>
                    <button type="button" onClick={closeModal} className="btn-secondary">
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
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
                      placeholder="Push-ups, Squats, etc."
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
                        required
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
                        required
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                    <input
                      type="number"
                      value={workoutForm.duration_minutes}
                      onChange={(e) => setWorkoutForm({ ...workoutForm, duration_minutes: e.target.value })}
                      className="input"
                      placeholder="30"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <textarea
                      value={workoutForm.notes}
                      onChange={(e) => setWorkoutForm({ ...workoutForm, notes: e.target.value })}
                      className="textarea"
                      rows={3}
                      placeholder="How did it feel? Any observations..."
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button type="submit" className="flex-1 btn-primary">
                      <Save className="w-4 h-4 mr-2" />
                      Save Workout
                    </button>
                    <button type="button" onClick={closeModal} className="btn-secondary">
                      Cancel
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