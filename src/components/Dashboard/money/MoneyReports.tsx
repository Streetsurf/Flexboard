import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp, 
  PieChart as PieChartIcon,
  BarChart3,
  Filter
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { MoneyIncome, MoneyOutcome, MoneyCategory } from '../MoneyTracker';

interface MoneyReportsProps {
  incomes: MoneyIncome[];
  outcomes: MoneyOutcome[];
  categories: MoneyCategory[];
}

type DateRange = 'this_week' | 'this_month' | 'this_year' | 'custom';

const MoneyReports: React.FC<MoneyReportsProps> = ({
  incomes,
  outcomes,
  categories
}) => {
  const [dateRange, setDateRange] = useState<DateRange>('this_month');
  const [customStartDate, setCustomStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  // Format currency to Indonesian Rupiah
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Get date range based on selection
  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case 'this_week':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'this_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'this_year':
        return { start: startOfYear(now), end: endOfYear(now) };
      case 'custom':
        return { start: new Date(customStartDate), end: new Date(customEndDate) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  // Filter data based on date range
  const filteredData = useMemo(() => {
    const { start, end } = getDateRange();
    const startStr = format(start, 'yyyy-MM-dd');
    const endStr = format(end, 'yyyy-MM-dd');

    const filteredIncomes = incomes.filter(income => 
      income.date >= startStr && income.date <= endStr
    );

    const filteredOutcomes = outcomes.filter(outcome => 
      outcome.date >= startStr && outcome.date <= endStr
    );

    return { incomes: filteredIncomes, outcomes: filteredOutcomes, start, end };
  }, [incomes, outcomes, dateRange, customStartDate, customEndDate]);

  // Calculate report statistics
  const reportStats = useMemo(() => {
    const totalIncome = filteredData.incomes.reduce((sum, income) => sum + income.amount, 0);
    const totalOutcome = filteredData.outcomes.reduce((sum, outcome) => sum + outcome.amount, 0);
    const netBalance = totalIncome - totalOutcome;

    return {
      totalIncome,
      totalOutcome,
      netBalance,
      transactionCount: filteredData.incomes.length + filteredData.outcomes.length
    };
  }, [filteredData]);

  // Generate daily cashflow data
  const dailyCashflowData = useMemo(() => {
    const days = eachDayOfInterval({ start: filteredData.start, end: filteredData.end });
    
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      
      const dayIncomes = filteredData.incomes.filter(income => income.date === dayStr);
      const dayOutcomes = filteredData.outcomes.filter(outcome => outcome.date === dayStr);
      
      const totalIncome = dayIncomes.reduce((sum, income) => sum + income.amount, 0);
      const totalOutcome = dayOutcomes.reduce((sum, outcome) => sum + outcome.amount, 0);

      return {
        date: format(day, 'dd/MM'),
        income: totalIncome / 1000000, // Convert to millions
        outcome: totalOutcome / 1000000,
        net: (totalIncome - totalOutcome) / 1000000
      };
    });
  }, [filteredData]);

  // Generate category breakdown data
  const categoryBreakdownData = useMemo(() => {
    const categoryTotals = new Map<string, number>();
    
    filteredData.outcomes.forEach(outcome => {
      const categoryName = outcome.category?.name || 'Unknown';
      categoryTotals.set(categoryName, (categoryTotals.get(categoryName) || 0) + outcome.amount);
    });

    return Array.from(categoryTotals.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData.outcomes]);

  // Pie chart colors
  const pieColors = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

  // Export to CSV
  const exportToCSV = () => {
    const csvData = [];
    
    // Add header
    csvData.push(['Tanggal', 'Tipe', 'Kategori', 'Deskripsi', 'Jumlah']);
    
    // Add income data
    filteredData.incomes.forEach(income => {
      csvData.push([
        format(new Date(income.date), 'dd/MM/yyyy'),
        'Income',
        income.category?.name || 'Unknown',
        income.description || '',
        income.amount
      ]);
    });
    
    // Add outcome data
    filteredData.outcomes.forEach(outcome => {
      csvData.push([
        format(new Date(outcome.date), 'dd/MM/yyyy'),
        'Outcome',
        outcome.category?.name || 'Unknown',
        outcome.description || '',
        outcome.amount
      ]);
    });

    // Convert to CSV string
    const csvString = csvData.map(row => row.join(',')).join('\n');
    
    // Download file
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `money-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

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
      {/* Header & Filters */}
      <div className="card animate-fadeIn">
        <div className="card-header">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <h2 className="card-title">Financial Reports</h2>
          </div>
          <button
            onClick={exportToCSV}
            className="btn-secondary"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>

        {/* Date Range Filter */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Periode
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="input"
            >
              <option value="this_week">Minggu Ini</option>
              <option value="this_month">Bulan Ini</option>
              <option value="this_year">Tahun Ini</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {dateRange === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal Mulai
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal Akhir
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="input"
                />
              </div>
            </>
          )}
        </div>

        {/* Period Summary */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <h3 className="font-medium text-blue-900 mb-2">
            Periode: {format(filteredData.start, 'dd MMMM yyyy', { locale: localeId })} - {format(filteredData.end, 'dd MMMM yyyy', { locale: localeId })}
          </h3>
          <p className="text-sm text-blue-700">
            {reportStats.transactionCount} transaksi dalam periode ini
          </p>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card bg-green-50 border-green-200 animate-fadeIn">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-900 mb-1">
              {formatCurrency(reportStats.totalIncome)}
            </div>
            <div className="text-sm text-green-700">Total Income</div>
          </div>
        </div>

        <div className="card bg-red-50 border-red-200 animate-fadeIn">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-900 mb-1">
              {formatCurrency(reportStats.totalOutcome)}
            </div>
            <div className="text-sm text-red-700">Total Outcome</div>
          </div>
        </div>

        <div className={`card animate-fadeIn ${
          reportStats.netBalance >= 0 
            ? 'bg-blue-50 border-blue-200' 
            : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="text-center">
            <div className={`text-2xl font-bold mb-1 ${
              reportStats.netBalance >= 0 ? 'text-blue-900' : 'text-orange-900'
            }`}>
              {formatCurrency(reportStats.netBalance)}
            </div>
            <div className={`text-sm ${
              reportStats.netBalance >= 0 ? 'text-blue-700' : 'text-orange-700'
            }`}>
              Net Balance
            </div>
          </div>
        </div>

        <div className="card bg-purple-50 border-purple-200 animate-fadeIn">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-900 mb-1">
              {reportStats.transactionCount}
            </div>
            <div className="text-sm text-purple-700">Total Transaksi</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Cashflow Trend */}
        <div className="card animate-fadeIn">
          <div className="card-header">
            <h3 className="card-title flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-green-600" />
              Daily Cashflow Trend
            </h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyCashflowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
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
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                  name="Outcome"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="card animate-fadeIn">
          <div className="card-header">
            <h3 className="card-title flex items-center">
              <PieChartIcon className="w-4 h-4 mr-2 text-purple-600" />
              Spending by Category
            </h3>
          </div>
          
          {categoryBreakdownData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdownData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    labelLine={false}
                  >
                    {categoryBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8">
              <PieChartIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Tidak ada data pengeluaran</p>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Transaction Table */}
      <div className="card animate-fadeIn">
        <div className="card-header">
          <h3 className="card-title">Detailed Transactions</h3>
          <div className="text-sm text-gray-500">
            {reportStats.transactionCount} transaksi
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-0 text-sm font-medium text-gray-700">Tanggal</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Tipe</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Kategori</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Deskripsi</th>
                <th className="text-right py-3 px-0 text-sm font-medium text-gray-700">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {/* Combine and sort all transactions */}
              {[
                ...filteredData.incomes.map(income => ({ ...income, type: 'income' as const })),
                ...filteredData.outcomes.map(outcome => ({ ...outcome, type: 'outcome' as const }))
              ]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((transaction, index) => (
                  <tr key={`${transaction.type}-${transaction.id}`} className="border-b border-gray-100">
                    <td className="py-3 px-0 text-sm text-gray-900">
                      {format(new Date(transaction.date), 'dd MMM yyyy')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${
                        transaction.type === 'income' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.type === 'income' ? 'Income' : 'Outcome'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {transaction.category?.name || 'Unknown'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {transaction.description || '-'}
                    </td>
                    <td className={`py-3 px-0 text-sm font-medium text-right ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {reportStats.transactionCount === 0 && (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Tidak ada transaksi dalam periode ini</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MoneyReports;