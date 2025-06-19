import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  BarChart3, 
  PieChart, 
  Calendar,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  Settings,
  FileText
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

// Import sub-components
import MoneyDashboard from './money/MoneyDashboard';
import MoneyIncome from './money/MoneyIncome';
import MoneyOutcome from './money/MoneyOutcome';
import MoneyCategories from './money/MoneyCategories';
import MoneyReports from './money/MoneyReports';

// Types
export interface MoneyCategory {
  id: string;
  name: string;
  type: 'income' | 'outcome';
  created_at: string;
  user_id: string;
}

export interface MoneyIncome {
  id: string;
  amount: number;
  category_id: string;
  description: string;
  date: string;
  created_at: string;
  user_id: string;
  category?: MoneyCategory;
}

export interface MoneyOutcome {
  id: string;
  amount: number;
  category_id: string;
  description: string;
  date: string;
  created_at: string;
  user_id: string;
  category?: MoneyCategory;
}

export interface MoneyStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyOutcome: number;
  topCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
}

const MoneyTracker: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'income' | 'outcome' | 'categories' | 'reports'>('dashboard');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [categories, setCategories] = useState<MoneyCategory[]>([]);
  const [incomes, setIncomes] = useState<MoneyIncome[]>([]);
  const [outcomes, setOutcomes] = useState<MoneyOutcome[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('money_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('type', { ascending: true })
        .order('name', { ascending: true });

      if (categoriesError) throw categoriesError;

      // Fetch incomes with categories
      const { data: incomesData, error: incomesError } = await supabase
        .from('money_income')
        .select(`
          *,
          category:money_categories(*)
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (incomesError) throw incomesError;

      // Fetch outcomes with categories
      const { data: outcomesData, error: outcomesError } = await supabase
        .from('money_outcome')
        .select(`
          *,
          category:money_categories(*)
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (outcomesError) throw outcomesError;

      setCategories(categoriesData || []);
      setIncomes(incomesData || []);
      setOutcomes(outcomesData || []);
    } catch (error) {
      console.error('Error fetching money data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, refreshTrigger]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh data function
  const refreshData = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Calculate statistics
  const stats = useMemo((): MoneyStats => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Filter current month data
    const monthlyIncomes = incomes.filter(income => {
      const incomeDate = new Date(income.date);
      return incomeDate >= monthStart && incomeDate <= monthEnd;
    });

    const monthlyOutcomes = outcomes.filter(outcome => {
      const outcomeDate = new Date(outcome.date);
      return outcomeDate >= monthStart && outcomeDate <= monthEnd;
    });

    // Calculate totals
    const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
    const totalOutcome = outcomes.reduce((sum, outcome) => sum + outcome.amount, 0);
    const monthlyIncome = monthlyIncomes.reduce((sum, income) => sum + income.amount, 0);
    const monthlyOutcome = monthlyOutcomes.reduce((sum, outcome) => sum + outcome.amount, 0);

    // Calculate top spending categories
    const categoryTotals = new Map<string, number>();
    monthlyOutcomes.forEach(outcome => {
      const categoryName = outcome.category?.name || 'Unknown';
      categoryTotals.set(categoryName, (categoryTotals.get(categoryName) || 0) + outcome.amount);
    });

    const topCategories = Array.from(categoryTotals.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: monthlyOutcome > 0 ? (amount / monthlyOutcome) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);

    return {
      totalBalance: totalIncome - totalOutcome,
      monthlyIncome,
      monthlyOutcome,
      topCategories
    };
  }, [incomes, outcomes]);

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
          <div className="flex items-center space-x-3 mb-4 sm:mb-0">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Money Tracker</h1>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-6">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'income', label: 'Income', icon: ArrowUpCircle },
              { id: 'outcome', label: 'Outcome', icon: ArrowDownCircle },
              { id: 'categories', label: 'Categories', icon: Settings },
              { id: 'reports', label: 'Reports', icon: FileText }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <MoneyDashboard 
          stats={stats}
          incomes={incomes}
          outcomes={outcomes}
          categories={categories}
        />
      )}

      {activeTab === 'income' && (
        <MoneyIncome 
          incomes={incomes}
          categories={categories.filter(cat => cat.type === 'income')}
          onRefresh={refreshData}
        />
      )}

      {activeTab === 'outcome' && (
        <MoneyOutcome 
          outcomes={outcomes}
          categories={categories.filter(cat => cat.type === 'outcome')}
          onRefresh={refreshData}
        />
      )}

      {activeTab === 'categories' && (
        <MoneyCategories 
          categories={categories}
          incomes={incomes}
          outcomes={outcomes}
          onRefresh={refreshData}
        />
      )}

      {activeTab === 'reports' && (
        <MoneyReports 
          incomes={incomes}
          outcomes={outcomes}
          categories={categories}
        />
      )}
    </div>
  );
};

export default MoneyTracker;