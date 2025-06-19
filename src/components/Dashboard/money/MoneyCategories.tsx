import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, Settings, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { MoneyCategory, MoneyIncome, MoneyOutcome } from '../MoneyTracker';

interface MoneyCategoriesProps {
  categories: MoneyCategory[];
  incomes: MoneyIncome[];
  outcomes: MoneyOutcome[];
  onRefresh: () => void;
}

const MoneyCategories: React.FC<MoneyCategoriesProps> = ({
  categories,
  incomes,
  outcomes,
  onRefresh
}) => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MoneyCategory | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeType, setActiveType] = useState<'income' | 'outcome'>('income');
  const [formData, setFormData] = useState({
    name: '',
    type: 'income' as 'income' | 'outcome'
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: activeType
    });
    setEditingCategory(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !formData.name.trim()) return;

    setLoading(true);
    try {
      const categoryData = {
        name: formData.name.trim(),
        type: formData.type,
        user_id: user.id
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('money_categories')
          .update(categoryData)
          .eq('id', editingCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('money_categories')
          .insert([categoryData]);
        if (error) throw error;
      }

      resetForm();
      onRefresh();
    } catch (error) {
      console.error('Error saving category:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category: MoneyCategory) => {
    setFormData({
      name: category.name,
      type: category.type
    });
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleDelete = async (category: MoneyCategory) => {
    // Check if category is being used
    const isUsedInIncome = incomes.some(income => income.category_id === category.id);
    const isUsedInOutcome = outcomes.some(outcome => outcome.category_id === category.id);
    
    if (isUsedInIncome || isUsedInOutcome) {
      alert('Kategori ini tidak dapat dihapus karena masih digunakan dalam transaksi.');
      return;
    }

    if (!confirm(`Hapus kategori "${category.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('money_categories')
        .delete()
        .eq('id', category.id);
      if (error) throw error;
      onRefresh();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  // Get usage count for each category
  const getCategoryUsage = (categoryId: string, type: 'income' | 'outcome') => {
    if (type === 'income') {
      return incomes.filter(income => income.category_id === categoryId).length;
    } else {
      return outcomes.filter(outcome => outcome.category_id === categoryId).length;
    }
  };

  const filteredCategories = categories.filter(cat => cat.type === activeType);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card animate-fadeIn">
        <div className="card-header">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
              <Settings className="w-4 h-4 text-white" />
            </div>
            <h2 className="card-title">Categories Management</h2>
          </div>
          <button
            onClick={() => {
              setFormData(prev => ({ ...prev, type: activeType }));
              setShowForm(true);
            }}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Kategori
          </button>
        </div>

        {/* Type Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-6">
            <button
              onClick={() => setActiveType('income')}
              className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeType === 'income'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ArrowUpCircle className="w-4 h-4" />
              <span>Income Categories</span>
            </button>
            <button
              onClick={() => setActiveType('outcome')}
              className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeType === 'outcome'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ArrowDownCircle className="w-4 h-4" />
              <span>Outcome Categories</span>
            </button>
          </nav>
        </div>

        {/* Summary */}
        <div className={`p-4 rounded-xl border ${
          activeType === 'income' 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`font-medium ${
                activeType === 'income' ? 'text-green-900' : 'text-red-900'
              }`}>
                {activeType === 'income' ? 'Income Categories' : 'Outcome Categories'}
              </h3>
              <p className={`text-sm ${
                activeType === 'income' ? 'text-green-700' : 'text-red-700'
              }`}>
                {filteredCategories.length} kategori tersedia
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card animate-fadeIn">
          <div className="card-header">
            <h3 className="card-title">
              {editingCategory ? 'Edit Kategori' : 'Tambah Kategori'}
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
                  Nama Kategori *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="input"
                  placeholder="Masukkan nama kategori"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipe *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="input"
                  required
                >
                  <option value="income">Income</option>
                  <option value="outcome">Outcome</option>
                </select>
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
                {editingCategory ? 'Update' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Categories List */}
      <div className="card animate-fadeIn">
        <div className="card-header">
          <h3 className="card-title">
            {activeType === 'income' ? 'Income Categories' : 'Outcome Categories'}
          </h3>
          <div className="text-sm text-gray-500">
            {filteredCategories.length} kategori
          </div>
        </div>

        {filteredCategories.length === 0 ? (
          <div className="text-center py-8">
            <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              Belum ada kategori {activeType === 'income' ? 'income' : 'outcome'}
            </p>
            <button
              onClick={() => {
                setFormData(prev => ({ ...prev, type: activeType }));
                setShowForm(true);
              }}
              className="btn-primary mt-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Kategori Pertama
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map((category, index) => {
              const usageCount = getCategoryUsage(category.id, category.type);
              const isUsed = usageCount > 0;
              
              return (
                <div
                  key={category.id}
                  className={`p-4 border rounded-xl hover:shadow-sm transition-shadow stagger-item ${
                    category.type === 'income' 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-red-200 bg-red-50'
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {category.type === 'income' ? (
                          <ArrowUpCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <ArrowDownCircle className="w-4 h-4 text-red-600" />
                        )}
                        <h4 className="font-medium text-gray-900">{category.name}</h4>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <span className={`font-medium ${
                          category.type === 'income' ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {usageCount} transaksi
                        </span>
                        {isUsed && (
                          <span className="ml-2 px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            Digunakan
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleEdit(category)}
                        className="btn-icon-secondary"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category)}
                        disabled={isUsed}
                        className={`btn-icon-danger ${isUsed ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={isUsed ? 'Tidak dapat dihapus karena masih digunakan' : 'Hapus kategori'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MoneyCategories;