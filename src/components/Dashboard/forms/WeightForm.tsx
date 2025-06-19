import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Edit2, Save, X, Scale, TrendingDown, TrendingUp } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { format } from 'date-fns';

interface WeightEntry {
  id: string;
  weight: number;
  body_fat?: number;
  date: string;
  created_at: string;
}

interface WeightFormProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  entries: WeightEntry[];
  onRefresh: () => void;
}

const WeightForm: React.FC<WeightFormProps> = ({
  selectedDate,
  onDateChange,
  entries,
  onRefresh
}) => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WeightEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    weight: '',
    body_fat: ''
  });

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayEntry = entries.find(entry => entry.date === selectedDateStr);
  
  // Calculate weight trend
  const sortedEntries = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const weightTrend = sortedEntries.length >= 2 
    ? sortedEntries[sortedEntries.length - 1].weight - sortedEntries[sortedEntries.length - 2].weight
    : 0;

  const resetForm = () => {
    setFormData({
      weight: '',
      body_fat: ''
    });
    setEditingEntry(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !formData.weight) return;

    setLoading(true);
    try {
      const entryData = {
        weight: parseFloat(formData.weight),
        body_fat: formData.body_fat ? parseFloat(formData.body_fat) : null,
        date: selectedDateStr,
        user_id: user.id
      };

      if (editingEntry) {
        const { error } = await supabase
          .from('weight_entries')
          .update(entryData)
          .eq('id', editingEntry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('weight_entries')
          .insert([entryData]);
        if (error) throw error;
      }

      resetForm();
      onRefresh();
    } catch (error) {
      console.error('Error saving weight entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entry: WeightEntry) => {
    setFormData({
      weight: entry.weight.toString(),
      body_fat: entry.body_fat?.toString() || ''
    });
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus entry berat badan ini?')) return;

    try {
      const { error } = await supabase
        .from('weight_entries')
        .delete()
        .eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch (error) {
      console.error('Error deleting weight entry:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card animate-fadeIn">
        <div className="card-header">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <Scale className="w-4 h-4 text-white" />
            </div>
            <h2 className="card-title">Berat Badan Tracker</h2>
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
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-green-900">Berat Badan Hari Ini</h3>
                <div className="flex items-center space-x-4 mt-1">
                  <span className="text-2xl font-bold text-green-900">{dayEntry.weight} kg</span>
                  {dayEntry.body_fat && (
                    <span className="text-sm text-green-700">Body Fat: {dayEntry.body_fat}%</span>
                  )}
                </div>
                {weightTrend !== 0 && (
                  <div className="flex items-center mt-2">
                    {weightTrend > 0 ? (
                      <TrendingUp className="w-4 h-4 text-red-500 mr-1" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
                    )}
                    <span className={`text-sm ${weightTrend > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {weightTrend > 0 ? '+' : ''}{weightTrend.toFixed(1)} kg dari entry sebelumnya
                    </span>
                  </div>
                )}
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
              <Scale className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Belum ada entry berat badan untuk hari ini</p>
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
              {editingEntry ? 'Edit Berat Badan' : 'Tambah Berat Badan'}
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
                  Berat Badan (kg) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                  className="input"
                  placeholder="65.5"
                  min="20"
                  max="300"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Body Fat (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.body_fat}
                  onChange={(e) => setFormData(prev => ({ ...prev, body_fat: e.target.value }))}
                  className="input"
                  placeholder="15.5"
                  min="0"
                  max="100"
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

      {/* Recent Entries */}
      {entries.length > 0 && (
        <div className="card animate-fadeIn">
          <div className="card-header">
            <h3 className="card-title">Riwayat Berat Badan</h3>
            <div className="text-sm text-gray-500">
              {entries.length} entry
            </div>
          </div>

          <div className="space-y-3">
            {sortedEntries.slice(-10).reverse().map((entry, index) => (
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
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Hari ini
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="font-medium text-green-600">
                        {entry.weight} kg
                      </span>
                      {entry.body_fat && (
                        <span>Body Fat: {entry.body_fat}%</span>
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
        </div>
      )}
    </div>
  );
};

export default WeightForm;