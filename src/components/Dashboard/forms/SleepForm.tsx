import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Edit2, Save, X, Moon, Clock, Sun } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { format } from 'date-fns';

interface SleepEntry {
  id: string;
  sleep_time: string;
  wake_time: string;
  duration_hours: number;
  date: string;
  created_at: string;
}

interface SleepFormProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  entries: SleepEntry[];
  onRefresh: () => void;
}

const SleepForm: React.FC<SleepFormProps> = ({
  selectedDate,
  onDateChange,
  entries,
  onRefresh
}) => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<SleepEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    sleep_time: '',
    wake_time: ''
  });

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayEntry = entries.find(entry => entry.date === selectedDateStr);

  // Calculate duration when times change
  const calculateDuration = (sleepTime: string, wakeTime: string): number => {
    if (!sleepTime || !wakeTime) return 0;
    
    const sleep = new Date(`2000-01-01T${sleepTime}:00`);
    let wake = new Date(`2000-01-01T${wakeTime}:00`);
    
    // If wake time is earlier than sleep time, assume it's the next day
    if (wake <= sleep) {
      wake = new Date(`2000-01-02T${wakeTime}:00`);
    }
    
    const diffMs = wake.getTime() - sleep.getTime();
    return Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10; // Round to 1 decimal
  };

  const duration = calculateDuration(formData.sleep_time, formData.wake_time);

  const resetForm = () => {
    setFormData({
      sleep_time: '',
      wake_time: ''
    });
    setEditingEntry(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !formData.sleep_time || !formData.wake_time) return;

    setLoading(true);
    try {
      const entryData = {
        sleep_time: formData.sleep_time,
        wake_time: formData.wake_time,
        duration_hours: duration,
        date: selectedDateStr,
        user_id: user.id
      };

      if (editingEntry) {
        const { error } = await supabase
          .from('sleep_entries')
          .update(entryData)
          .eq('id', editingEntry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sleep_entries')
          .insert([entryData]);
        if (error) throw error;
      }

      resetForm();
      onRefresh();
    } catch (error) {
      console.error('Error saving sleep entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entry: SleepEntry) => {
    setFormData({
      sleep_time: entry.sleep_time,
      wake_time: entry.wake_time
    });
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus entry tidur ini?')) return;

    try {
      const { error } = await supabase
        .from('sleep_entries')
        .delete()
        .eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch (error) {
      console.error('Error deleting sleep entry:', error);
    }
  };

  const getSleepQuality = (hours: number) => {
    if (hours >= 7 && hours <= 9) return { label: 'Baik', color: 'text-green-600', bg: 'bg-green-50 border-green-200' };
    if (hours >= 6 && hours < 7) return { label: 'Cukup', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' };
    if (hours >= 5 && hours < 6) return { label: 'Kurang', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' };
    return { label: 'Buruk', color: 'text-red-600', bg: 'bg-red-50 border-red-200' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card animate-fadeIn">
        <div className="card-header">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
              <Moon className="w-4 h-4 text-white" />
            </div>
            <h2 className="card-title">Sleep Tracker</h2>
          </div>
          {!dayEntry && (
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Entry
            </button>
          )}
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

        {/* Current Entry or Summary */}
        {dayEntry ? (
          <div className={`p-4 border rounded-xl ${getSleepQuality(dayEntry.duration_hours).bg}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Tidur Hari Ini</h3>
                <div className="flex items-center space-x-4 mt-1">
                  <span className="text-2xl font-bold text-gray-900">{dayEntry.duration_hours} jam</span>
                  <span className={`text-sm font-medium ${getSleepQuality(dayEntry.duration_hours).color}`}>
                    {getSleepQuality(dayEntry.duration_hours).label}
                  </span>
                </div>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                  <span className="flex items-center">
                    <Moon className="w-4 h-4 mr-1" />
                    Tidur: {dayEntry.sleep_time}
                  </span>
                  <span className="flex items-center">
                    <Sun className="w-4 h-4 mr-1" />
                    Bangun: {dayEntry.wake_time}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleEdit(dayEntry)}
                  className="btn-icon-secondary"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(dayEntry.id)}
                  className="btn-icon-danger"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="text-center">
              <Moon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Belum ada entry tidur untuk hari ini</p>
              <button
                onClick={() => setShowForm(true)}
                className="btn-primary mt-3"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tambah Entry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Entry Form */}
      {showForm && (
        <div className="card animate-fadeIn">
          <div className="card-header">
            <h3 className="card-title">
              {editingEntry ? 'Edit Tidur' : 'Tambah Tidur'}
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
                  Jam Tidur *
                </label>
                <input
                  type="time"
                  value={formData.sleep_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, sleep_time: e.target.value }))}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jam Bangun *
                </label>
                <input
                  type="time"
                  value={formData.wake_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, wake_time: e.target.value }))}
                  className="input"
                  required
                />
              </div>
            </div>

            {/* Duration Preview */}
            {duration > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-800">
                    Durasi tidur: <strong>{duration} jam</strong>
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${getSleepQuality(duration).bg} ${getSleepQuality(duration).color}`}>
                    {getSleepQuality(duration).label}
                  </span>
                </div>
              </div>
            )}

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
                disabled={loading || duration <= 0}
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

      {/* Recent Entries */}
      {entries.length > 0 && (
        <div className="card animate-fadeIn">
          <div className="card-header">
            <h3 className="card-title">Riwayat Tidur</h3>
            <div className="text-sm text-gray-500">
              {entries.length} entry
            </div>
          </div>

          <div className="space-y-3">
            {entries.slice(-10).reverse().map((entry, index) => {
              const quality = getSleepQuality(entry.duration_hours);
              return (
                <div
                  key={entry.id}
                  className="p-4 border border-gray-200 rounded-xl hover:shadow-sm transition-shadow stagger-item"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <span className="font-medium text-gray-900">
                          {format(new Date(entry.date), 'd MMMM yyyy')}
                        </span>
                        {entry.date === selectedDateStr && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Hari ini
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${quality.bg} ${quality.color}`}>
                          {quality.label}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="font-medium text-purple-600">
                          {entry.duration_hours} jam
                        </span>
                        <span className="flex items-center">
                          <Moon className="w-4 h-4 mr-1" />
                          {entry.sleep_time}
                        </span>
                        <span className="flex items-center">
                          <Sun className="w-4 h-4 mr-1" />
                          {entry.wake_time}
                        </span>
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
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SleepForm;