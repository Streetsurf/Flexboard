import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Edit2, Save, X, Dumbbell, Clock, RotateCcw } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { format } from 'date-fns';

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

interface WorkoutFormProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  entries: WorkoutEntry[];
  onRefresh: () => void;
}

const WorkoutForm: React.FC<WorkoutFormProps> = ({
  selectedDate,
  onDateChange,
  entries,
  onRefresh
}) => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WorkoutEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    exercise_name: '',
    type: 'duration' as const,
    duration_minutes: '',
    repetitions: '',
    calories_burned: ''
  });

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayEntries = entries.filter(entry => entry.date === selectedDateStr);
  const totalCaloriesBurned = dayEntries.reduce((sum, entry) => sum + entry.calories_burned, 0);

  const resetForm = () => {
    setFormData({
      exercise_name: '',
      type: 'duration',
      duration_minutes: '',
      repetitions: '',
      calories_burned: ''
    });
    setEditingEntry(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !formData.exercise_name || !formData.calories_burned) return;

    setLoading(true);
    try {
      const entryData = {
        exercise_name: formData.exercise_name,
        type: formData.type,
        duration_minutes: formData.type === 'duration' ? parseInt(formData.duration_minutes) || null : null,
        repetitions: formData.type === 'reps' ? parseInt(formData.repetitions) || null : null,
        calories_burned: parseInt(formData.calories_burned),
        date: selectedDateStr,
        user_id: user.id
      };

      if (editingEntry) {
        const { error } = await supabase
          .from('workout_entries')
          .update(entryData)
          .eq('id', editingEntry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('workout_entries')
          .insert([entryData]);
        if (error) throw error;
      }

      resetForm();
      onRefresh();
    } catch (error) {
      console.error('Error saving workout entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entry: WorkoutEntry) => {
    setFormData({
      exercise_name: entry.exercise_name,
      type: entry.type,
      duration_minutes: entry.duration_minutes?.toString() || '',
      repetitions: entry.repetitions?.toString() || '',
      calories_burned: entry.calories_burned.toString()
    });
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus entry workout ini?')) return;

    try {
      const { error } = await supabase
        .from('workout_entries')
        .delete()
        .eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch (error) {
      console.error('Error deleting workout entry:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card animate-fadeIn">
        <div className="card-header">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-white" />
            </div>
            <h2 className="card-title">Workout Tracker</h2>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Workout
          </button>
        </div>

        {/* Date Picker */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tanggal
          </label>
          <input
            type="date"
            value={selectedDateStr}
            onChange={(e) => onDateChange(new Date(e.target.value))}
            className="input"
          />
        </div>

        {/* Daily Summary */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-blue-900">Total Kalori Terbakar</h3>
              <p className="text-sm text-blue-700">{dayEntries.length} latihan</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-900">{totalCaloriesBurned.toLocaleString()}</div>
              <div className="text-sm text-blue-700">kalori</div>
            </div>
          </div>
        </div>
      </div>

      {/* Entry Form */}
      {showForm && (
        <div className="card animate-fadeIn">
          <div className="card-header">
            <h3 className="card-title">
              {editingEntry ? 'Edit Workout' : 'Tambah Workout'}
            </h3>
            <button
              onClick={resetForm}
              className="btn-icon-secondary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Latihan *
                </label>
                <input
                  type="text"
                  value={formData.exercise_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, exercise_name: e.target.value }))}
                  className="input"
                  placeholder="Push up, Lari, Angkat beban"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipe Latihan *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="input"
                  required
                >
                  <option value="duration">Durasi (menit)</option>
                  <option value="reps">Repetisi</option>
                </select>
              </div>

              {formData.type === 'duration' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Durasi (menit) *
                  </label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: e.target.value }))}
                    className="input"
                    placeholder="30"
                    min="1"
                    required
                  />
                </div>
              )}

              {formData.type === 'reps' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Repetisi *
                  </label>
                  <input
                    type="number"
                    value={formData.repetitions}
                    onChange={(e) => setFormData(prev => ({ ...prev, repetitions: e.target.value }))}
                    className="input"
                    placeholder="20"
                    min="1"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kalori Terbakar *
                </label>
                <input
                  type="number"
                  value={formData.calories_burned}
                  onChange={(e) => setFormData(prev => ({ ...prev, calories_burned: e.target.value }))}
                  className="input"
                  placeholder="150"
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {editingEntry ? 'Update' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Entries List */}
      <div className="card animate-fadeIn">
        <div className="card-header">
          <h3 className="card-title">Workout Hari Ini</h3>
          <div className="text-sm text-gray-500">
            {format(selectedDate, 'd MMMM yyyy')}
          </div>
        </div>

        {dayEntries.length === 0 ? (
          <div className="text-center py-8">
            <Dumbbell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Belum ada workout untuk hari ini</p>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary mt-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Workout Pertama
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {dayEntries.map((entry, index) => (
              <div
                key={entry.id}
                className="p-4 border border-gray-200 rounded-xl hover:shadow-sm transition-shadow stagger-item"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-gray-900">{entry.exercise_name}</h4>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {entry.type === 'duration' ? 'Durasi' : 'Repetisi'}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="font-medium text-blue-600">
                        {entry.calories_burned.toLocaleString()} kalori
                      </span>
                      {entry.type === 'duration' && entry.duration_minutes && (
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {entry.duration_minutes} menit
                        </span>
                      )}
                      {entry.type === 'reps' && entry.repetitions && (
                        <span className="flex items-center">
                          <RotateCcw className="w-4 h-4 mr-1" />
                          {entry.repetitions} reps
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(entry)}
                      className="btn-icon-secondary"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="btn-icon-danger"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkoutForm;