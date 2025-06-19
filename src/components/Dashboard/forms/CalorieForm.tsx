import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Edit2, Save, X, Utensils } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { format } from 'date-fns';

interface CalorieEntry {
  id: string;
  food_name: string;
  calories: number;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  description?: string;
  date: string;
  created_at: string;
}

interface CalorieFormProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  entries: CalorieEntry[];
  onRefresh: () => void;
}

const CalorieForm: React.FC<CalorieFormProps> = ({
  selectedDate,
  onDateChange,
  entries,
  onRefresh
}) => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CalorieEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    food_name: '',
    calories: '',
    category: 'breakfast' as const,
    description: ''
  });

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayEntries = entries.filter(entry => entry.date === selectedDateStr);
  const totalCalories = dayEntries.reduce((sum, entry) => sum + entry.calories, 0);

  const resetForm = () => {
    setFormData({
      food_name: '',
      calories: '',
      category: 'breakfast',
      description: ''
    });
    setEditingEntry(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !formData.food_name || !formData.calories) return;

    setLoading(true);
    try {
      const entryData = {
        food_name: formData.food_name,
        calories: parseInt(formData.calories),
        category: formData.category,
        description: formData.description || null,
        date: selectedDateStr,
        user_id: user.id
      };

      if (editingEntry) {
        const { error } = await supabase
          .from('calorie_entries')
          .update(entryData)
          .eq('id', editingEntry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('calorie_entries')
          .insert([entryData]);
        if (error) throw error;
      }

      resetForm();
      onRefresh();
    } catch (error) {
      console.error('Error saving calorie entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entry: CalorieEntry) => {
    setFormData({
      food_name: entry.food_name,
      calories: entry.calories.toString(),
      category: entry.category,
      description: entry.description || ''
    });
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus entry kalori ini?')) return;

    try {
      const { error } = await supabase
        .from('calorie_entries')
        .delete()
        .eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch (error) {
      console.error('Error deleting calorie entry:', error);
    }
  };

  const categoryLabels = {
    breakfast: 'Sarapan',
    lunch: 'Makan Siang',
    dinner: 'Makan Malam',
    snack: 'Snack'
  };

  const categoryColors = {
    breakfast: 'bg-yellow-100 text-yellow-800',
    lunch: 'bg-green-100 text-green-800',
    dinner: 'bg-blue-100 text-blue-800',
    snack: 'bg-purple-100 text-purple-800'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card animate-fadeIn">
        <div className="card-header">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <Utensils className="w-4 h-4 text-white" />
            </div>
            <h2 className="card-title">Kalori Tracker</h2>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Entry
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
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-orange-900">Total Kalori Hari Ini</h3>
              <p className="text-sm text-orange-700">{dayEntries.length} makanan</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-orange-900">{totalCalories.toLocaleString()}</div>
              <div className="text-sm text-orange-700">kalori</div>
            </div>
          </div>
        </div>
      </div>

      {/* Entry Form */}
      {showForm && (
        <div className="card animate-fadeIn">
          <div className="card-header">
            <h3 className="card-title">
              {editingEntry ? 'Edit Entry Kalori' : 'Tambah Entry Kalori'}
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
                  Nama Makanan *
                </label>
                <input
                  type="text"
                  value={formData.food_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, food_name: e.target.value }))}
                  className="input"
                  placeholder="Nasi goreng, ayam bakar, dll"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kalori *
                </label>
                <input
                  type="number"
                  value={formData.calories}
                  onChange={(e) => setFormData(prev => ({ ...prev, calories: e.target.value }))}
                  className="input"
                  placeholder="250"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategori *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                  className="input"
                  required
                >
                  <option value="breakfast">Sarapan</option>
                  <option value="lunch">Makan Siang</option>
                  <option value="dinner">Makan Malam</option>
                  <option value="snack">Snack</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deskripsi
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="input"
                  placeholder="Porsi besar, dengan sayuran"
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
          <h3 className="card-title">Entry Hari Ini</h3>
          <div className="text-sm text-gray-500">
            {format(selectedDate, 'd MMMM yyyy')}
          </div>
        </div>

        {dayEntries.length === 0 ? (
          <div className="text-center py-8">
            <Utensils className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Belum ada entry kalori untuk hari ini</p>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary mt-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Entry Pertama
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
                      <h4 className="font-medium text-gray-900">{entry.food_name}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryColors[entry.category]}`}>
                        {categoryLabels[entry.category]}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="font-medium text-orange-600">
                        {entry.calories.toLocaleString()} kalori
                      </span>
                      {entry.description && (
                        <span>{entry.description}</span>
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

export default CalorieForm;