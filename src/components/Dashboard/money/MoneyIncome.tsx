import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, ArrowUpCircle, Calendar } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { MoneyIncome, MoneyCategory } from '../MoneyTracker';

interface MoneyIncomeProps {
  incomes: MoneyIncome[];
  categories: MoneyCategory[];
  onRefresh: () => void;
}

const MoneyIncomeComponent: React.FC<MoneyIncomeProps> = ({
  incomes,
  categories,
  onRefresh
}) => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingIncome, setEditingIncome] = useState<MoneyIncome | null>(null);
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
    setEditingIncome(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !formData.amount || !formData.category_id) return;

    setLoading(true);
    try {
      const incomeData = {
        amount: parseInt(formData.amount.replace(/\D/g, '')), // Remove non-digits
        category_id: formData.category_id,
        description: formData.description || '',
        date: formData.date,
        user_id: user.id
      };

      if (editingIncome) {
        const { error } = await supabase
          .from('money_income')
          .update(incomeData)
          .eq('id', editingIncome.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('money_income')
          .insert([incomeData]);
        if (error) throw error;
      }

      resetForm();
      onRefresh();
    } catch (error) {
      console.error('Error saving income:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (income: MoneyIncome) => {
    setFormData({
      amount: income.amount.toString(),
      category_id: income.category_id,
      description: income.description || '',
      date: income.date
    });
    setEditingIncome(income);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data pemasukan ini?')) return;

    try {
      const { error } = await supabase
        .from('money_income')
        .delete()
        .eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch (error) {
      console.error('Error deleting income:', error);
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
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <ArrowUpCircle className="w-4 h-4 text-white" />
            </div>
            <h2 className="card-title">Income Management</h2>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Income
          </button>
        </div>

        {/* Summary */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-green-900">Total Income</h3>
              <p className="text-sm text-green-700">{incomes.length} transaksi</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-900">
                {formatCurrency(incomes.reduce((sum, income) => sum + income.amount, 0))}
              </div>
              <div className="text-sm text-green-700">Semua waktu</div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card animate-fadeIn">
          <div className="card-header">
            <h3 className="card-title">
              {editingIncome ? 'Edit Income' : 'Tambah Income'}
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
                    placeholder="1.000.000"
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
                  placeholder="Gaji bulan ini, bonus project, dll"
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
                {editingIncome ? 'Update' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Income List */}
      <div className="card animate-fadeIn">
        <div className="card-header">
          <h3 className="card-title">Daftar Income</h3>
          <div className="text-sm text-gray-500">
            {incomes.length} transaksi
          </div>
        </div>

        {incomes.length === 0 ? (
          <div className="text-center py-8">
            <ArrowUpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Belum ada data income</p>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary mt-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Income Pertama
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {incomes.map((income, index) => (
              <div
                key={income.id}
                className="p-4 border border-gray-200 rounded-xl hover:shadow-sm transition-shadow stagger-item"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {format(new Date(income.date), 'dd MMMM yyyy', { locale: localeId })}
                        </span>
                      </div>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {income.category?.name || 'Unknown'}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 mb-1">
                      <span className="font-bold text-green-600 text-lg">
                        {formatCurrency(income.amount)}
                      </span>
                    </div>
                    
                    {income.description && (
                      <p className="text-sm text-gray-600">{income.description}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(income)}
                      className="btn-icon-secondary"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(income.id)}
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

export default MoneyIncomeComponent;