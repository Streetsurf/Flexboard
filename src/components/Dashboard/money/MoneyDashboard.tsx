import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle,
  PieChart
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { MoneyStats, MoneyIncome, MoneyOutcome, MoneyCategory } from '../MoneyTracker';

interface MoneyDashboardProps {
  stats: MoneyStats;
  incomes: MoneyIncome[];
  outcomes: MoneyOutcome[];
  categories: MoneyCategory[];
}

const MoneyDashboard: React.FC<MoneyDashboardProps> = ({
  stats,
  incomes,
  outcomes,
  categories
}) => {
  // Format currency to Indonesian Rupiah
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Generate cashflow data for the past 30 days
  const cashflowData = useMemo(() => {
    const endDate = new Date();
    const startDate = subDays(endDate, 29); // 30 days total
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      
      const dayIncomes = incomes.filter(income => income.date === dayStr);
      const dayOutcomes = outcomes.filter(outcome => outcome.date === dayStr);
      
      const totalIncome = dayIncomes.reduce((sum, income) => sum + income.amount, 0);
      const totalOutcome = dayOutcomes.reduce((sum, outcome) => sum + outcome.amount, 0);

      return {
        date: format(day, 'dd MMM'),
        income: totalIncome / 1000000, // Convert to millions for better chart readability
        outcome: totalOutcome / 1000000,
        net: (totalIncome - totalOutcome) / 1000000
      };
    });
  }, [incomes, outcomes]);

  // Pie chart colors
  const pieColors = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value * 1000000)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Balance */}
        <div className={`card ${stats.totalBalance >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} animate-fadeIn`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                stats.totalBalance >= 0 ? 'bg-green-500' : 'bg-red-500'
              }`}>
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Total Balance</h3>
                <p className="text-xs text-gray-600">Saldo keseluruhan</p>
              </div>
            </div>
            {stats.totalBalance >= 0 ? (
              <TrendingUp className="w-5 h-5 text-green-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
          </div>
          <div className={`text-2xl font-bold ${
            stats.totalBalance >= 0 ? 'text-green-900' : 'text-red-900'
          }`}>
            {formatCurrency(stats.totalBalance)}
          </div>
        </div>

        {/* Monthly Income */}
        <div className="card bg-blue-50 border-blue-200 animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <ArrowUpCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Monthly Income</h3>
                <p className="text-xs text-gray-600">{format(new Date(), 'MMMM yyyy', { locale: localeId })}</p>
              </div>
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {formatCurrency(stats.monthlyIncome)}
          </div>
        </div>

        {/* Monthly Outcome */}
        <div className="card bg-orange-50 border-orange-200 animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <ArrowDownCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Monthly Outcome</h3>
                <p className="text-xs text-gray-600">{format(new Date(), 'MMMM yyyy', { locale: localeId })}</p>
              </div>
            </div>
          </div>
          <div className="text-2xl font-bold text-orange-900">
            {formatCurrency(stats.monthlyOutcome)}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cashflow Overview */}
        <div className="card animate-fadeIn">
          <div className="card-header">
            <h3 className="card-title flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-green-600" />
              Cashflow Overview (30 Hari)
            </h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cashflowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value}M`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                  name="Income"
                />
                <Line
                  type="monotone"
                  dataKey="outcome"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                  name="Outcome"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Spending Categories */}
        <div className="card animate-fadeIn">
          <div className="card-header">
            <h3 className="card-title flex items-center">
              <PieChart className="w-4 h-4 mr-2 text-purple-600" />
              Top 3 Spending Categories
            </h3>
          </div>
          
          {stats.topCategories.length > 0 ? (
            <div className="space-y-4">
              {stats.topCategories.map((category, index) => (
                <div key={category.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: pieColors[index] }}
                    ></div>
                    <div>
                      <h4 className="font-medium text-gray-900">{category.category}</h4>
                      <p className="text-sm text-gray-600">{category.percentage.toFixed(1)}% dari total</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">{formatCurrency(category.amount)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <PieChart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Belum ada pengeluaran bulan ini</p>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="card animate-fadeIn">
        <div className="card-header">
          <h3 className="card-title">Ringkasan Bulan Ini</h3>
          <div className="text-sm text-gray-500">
            {format(new Date(), 'MMMM yyyy', { locale: localeId })}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.monthlyIncome)}</div>
            <div className="text-sm text-blue-700">Total Pemasukan</div>
          </div>
          
          <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(stats.monthlyOutcome)}</div>
            <div className="text-sm text-orange-700">Total Pengeluaran</div>
          </div>
          
          <div className={`text-center p-4 rounded-lg border ${
            (stats.monthlyIncome - stats.monthlyOutcome) >= 0 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className={`text-2xl font-bold ${
              (stats.monthlyIncome - stats.monthlyOutcome) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(stats.monthlyIncome - stats.monthlyOutcome)}
            </div>
            <div className={`text-sm ${
              (stats.monthlyIncome - stats.monthlyOutcome) >= 0 ? 'text-green-700' : 'text-red-700'
            }`}>
              Net Balance
            </div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-purple-600">
              {stats.monthlyOutcome > 0 ? ((stats.monthlyOutcome / stats.monthlyIncome) * 100).toFixed(1) : 0}%
            </div>
            <div className="text-sm text-purple-700">Spending Ratio</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoneyDashboard;