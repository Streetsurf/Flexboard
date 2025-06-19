import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, ArrowDownCircle, Calendar } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { MoneyOutcome, MoneyCategory } from '../MoneyTracker';

interface MoneyOutcomeProps {
  outcomes: MoneyOutcome[];
  categories: MoneyCategory[];
  onRefresh: () => void;
}

const MoneyOutcomeComponent: React.FC<MoneyOutcomeProps> = ({
  outcomes,
  categories,
  onRefresh
}) => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingOutcome, setEditingOutcome] = useState<MoneyOutcome | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    category_id: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  // Format currency to Indonesian Rupiah
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      category_id: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd')
    });
    setEditingOutcome(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !formData.amount || !formData.category_id) return;

    setLoading(true);
    try {
      const outcomeData = {
        amount: parseInt(formData.amount.replace(/\D/g, '')), // Remove non-digits
        category_id: formData.category_id,
        description: formData.description || '',
        date: formData.date,
        user_id: user.id
      };

      if (editingOutcome) {
        const { error } = await supabase
          .from('money_outcome')
          .update(outcomeData)
          .eq('id', editingOutcome.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('money_outcome')
          .insert([outcomeData]);
        if (error) throw error;
      }

      resetForm();
      onRefresh();
    } catch (error) {
      console.error('Error saving outcome:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (outcome: MoneyOutcome) => {
    setFormData({
      amount: outcome.amount.toString(),
      category_id: outcome.category_id,
      description: outcome.description || '',
      date: outcome.date
    });
    setEditingOutcome(outcome);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data pengeluaran ini?')) return;

    try {
      const { error } = await supabase
        .from('money_outcome')
        .delete()
        .eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch (error) {
      console.error('Error deleting outcome:', error);
    }
  };

  // Format amount input with thousand separators
  const handleAmountChange = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    const formattedValue = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    setFormData(prev => ({ ...prev, amount: formattedValue }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card animate-fadeIn">
        <div className="card-header">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <ArrowDownCircle className="w-4 h-4 text-white" />
            </div>
            <h2 className="card-title">Outcome Management</h2>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Outcome
          </button>
        </div>

        {/* Summary */}
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-red-900">Total Outcome</h3>
              <p className="text-sm text-red-700">{outcomes.length} transaksi</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-red-900">
                {formatCurrency(outcomes.reduce((sum, outcome) => sum + outcome.amount, 0))}
              </div>
              <div className="text-sm text-red-700">Semua waktu</div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card animate-fadeIn">
          <div className="card-header">
            <h3 className="card-title">
              {editingOutcome ? 'Edit Outcome' : 'Tambah Outcome'}
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
                  Tanggal *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jumlah (Rp) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">Rp</span>
                  <input
                    type="text"
                    value={formData.amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="input pl-10"
                    placeholder="50.000"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategori *
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                  className="input"
                  required
                >
                  <option value="">Pilih kategori</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
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
                  placeholder="Makan siang, bensin, dll"
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
                {editingOutcome ? 'Update' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Outcome List */}
      <div className="card animate-fadeIn">
        <div className="card-header">
          <h3 className="card-title">Daftar Outcome</h3>
          <div className="text-sm text-gray-500">
            {outcomes.length} transaksi
          </div>
        </div>

        {outcomes.length === 0 ? (
          <div className="text-center py-8">
            <ArrowDownCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Belum ada data outcome</p>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary mt-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Outcome Pertama
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {outcomes.map((outcome, index) => (
              <div
                key={outcome.id}
                className="p-4 border border-gray-200 rounded-xl hover:shadow-sm transition-shadow stagger-item"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {format(new Date(outcome.date), 'dd MMMM yyyy', { locale: localeId })}
                        </span>
                      </div>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {outcome.category?.name || 'Unknown'}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 mb-1">
                      <span className="font-bold text-red-600 text-lg">
                        {formatCurrency(outcome.amount)}
                      </span>
                    </div>
                    
                    {outcome.description && (
                      <p className="text-sm text-gray-600">{outcome.description}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(outcome)}
                      className="btn-icon-secondary"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(outcome.id)}
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

export default MoneyOutcomeComponent;