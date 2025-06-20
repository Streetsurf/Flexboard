import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Clock, Target, Award, Activity, Zap, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { format, subDays, startOfWeek, endOfWeek, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';

interface DailyStats {
  date: string;
  tasksCompleted: number;
  totalTasks: number;
  completionRate: number;
  totalPoints: number;
  timeSpent: number;
  journalEntry: boolean;
}

interface CategoryStats {
  name: string;
  value: number;
  color: string;
}

interface WeeklyComparison {
  week: string;
  thisWeek: number;
  lastWeek: number;
}

const AnalyticsDashboard: React.FC = () => {
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [weeklyComparison, setWeeklyComparison] = useState<WeeklyComparison[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'exports'>('overview');
  const [overallStats, setOverallStats] = useState({
    totalTasksCompleted: 0,
    averageCompletionRate: 0,
    totalTimeSpent: 0,
    currentStreak: 0,
    bestStreak: 0,
    totalPoints: 0
  });
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchAnalyticsData();
    }
  }, [user, timeRange]);

  const getDaysCount = () => {
    switch (timeRange) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      default: return 30;
    }
  };

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const days = getDaysCount();
      const startDate = subDays(new Date(), days - 1);
      const endDate = new Date();

      const { data: todos, error: todosError } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user?.id)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'));

      if (todosError) throw todosError;

      const { data: journals, error: journalsError } = await supabase
        .from('journal_entries')
        .select('date')
        .eq('user_id', user?.id)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'));

      if (journalsError) throw journalsError;

      const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
      const dailyData: DailyStats[] = dateRange.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayTodos = todos?.filter(todo => todo.date === dateStr) || [];
        const completedTodos = dayTodos.filter(todo => todo.completed);
        const hasJournal = journals?.some(journal => journal.date === dateStr) || false;

        const totalPoints = completedTodos.reduce((sum, todo) => sum + (todo.priority_score || 0), 0);
        const timeSpent = completedTodos.reduce((sum, todo) => sum + (todo.actual_minutes || 0), 0);

        return {
          date: format(date, 'MMM dd'),
          tasksCompleted: completedTodos.length,
          totalTasks: dayTodos.length,
          completionRate: dayTodos.length > 0 ? Math.round((completedTodos.length / dayTodos.length) * 100) : 0,
          totalPoints: Math.round(totalPoints * 10) / 10,
          timeSpent: Math.round(timeSpent),
          journalEntry: hasJournal
        };
      });

      setDailyStats(dailyData);

      const allCompletedTodos = todos?.filter(todo => todo.completed) || [];
      const totalTasksCompleted = allCompletedTodos.length;
      const totalTasks = todos?.length || 0;
      const averageCompletionRate = totalTasks > 0 ? Math.round((totalTasksCompleted / totalTasks) * 100) : 0;
      const totalTimeSpent = allCompletedTodos.reduce((sum, todo) => sum + (todo.actual_minutes || 0), 0);
      const totalPoints = allCompletedTodos.reduce((sum, todo) => sum + (todo.priority_score || 0), 0);

      const { currentStreak, bestStreak } = calculateStreaks(dailyData);

      setOverallStats({
        totalTasksCompleted,
        averageCompletionRate,
        totalTimeSpent: Math.round(totalTimeSpent),
        currentStreak,
        bestStreak,
        totalPoints: Math.round(totalPoints * 10) / 10
      });

      const categoryData: CategoryStats[] = [
        {
          name: 'Critical (8-10)',
          value: allCompletedTodos.filter(todo => (todo.priority_score || 0) >= 8).length,
          color: '#ef4444'
        },
        {
          name: 'High (6-8)',
          value: allCompletedTodos.filter(todo => (todo.priority_score || 0) >= 6 && (todo.priority_score || 0) < 8).length,
          color: '#f97316'
        },
        {
          name: 'Medium (4-6)',
          value: allCompletedTodos.filter(todo => (todo.priority_score || 0) >= 4 && (todo.priority_score || 0) < 6).length,
          color: '#eab308'
        },
        {
          name: 'Low (0-4)',
          value: allCompletedTodos.filter(todo => (todo.priority_score || 0) < 4).length,
          color: '#22c55e'
        }
      ].filter(item => item.value > 0);

      setCategoryStats(categoryData);
      await fetchWeeklyComparison();

    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStreaks = (data: DailyStats[]) => {
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].tasksCompleted > 0 || data[i].journalEntry) {
        if (i === data.length - 1 || currentStreak > 0) {
          currentStreak++;
        }
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        if (i === data.length - 1) {
          currentStreak = 0;
        }
        tempStreak = 0;
      }
    }

    return { currentStreak, bestStreak };
  };

  const fetchWeeklyComparison = async () => {
    try {
      const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const thisWeekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
      const lastWeekStart = startOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 });
      const lastWeekEnd = endOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 });

      const { data: thisWeekTodos } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user?.id)
        .eq('completed', true)
        .gte('date', format(thisWeekStart, 'yyyy-MM-dd'))
        .lte('date', format(thisWeekEnd, 'yyyy-MM-dd'));

      const { data: lastWeekTodos } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user?.id)
        .eq('completed', true)
        .gte('date', format(lastWeekStart, 'yyyy-MM-dd'))
        .lte('date', format(lastWeekEnd, 'yyyy-MM-dd'));

      const weeklyData: WeeklyComparison[] = [
        {
          week: 'Tasks',
          thisWeek: thisWeekTodos?.length || 0,
          lastWeek: lastWeekTodos?.length || 0
        },
        {
          week: 'Points',
          thisWeek: Math.round((thisWeekTodos?.reduce((sum, todo) => sum + (todo.priority_score || 0), 0) || 0) * 10) / 10,
          lastWeek: Math.round((lastWeekTodos?.reduce((sum, todo) => sum + (todo.priority_score || 0), 0) || 0) * 10) / 10
        },
        {
          week: 'Time (hrs)',
          thisWeek: Math.round((thisWeekTodos?.reduce((sum, todo) => sum + (todo.actual_minutes || 0), 0) || 0) / 60 * 10) / 10,
          lastWeek: Math.round((lastWeekTodos?.reduce((sum, todo) => sum + (todo.actual_minutes || 0), 0) || 0) / 60 * 10) / 10
        }
      ];

      setWeeklyComparison(weeklyData);
    } catch (error) {
      console.error('Error fetching weekly comparison:', error);
    }
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-3 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-slate-100">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
              {entry.dataKey === 'timeSpent' && 'm'}
              {entry.dataKey === 'completionRate' && '%'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Mock data for reports
  const mockReports = [
    { id: 1, name: 'Weekly Productivity Report', date: '2024-01-15', type: 'PDF', size: '2.4 MB' },
    { id: 2, name: 'Monthly Analytics Summary', date: '2024-01-01', type: 'Excel', size: '1.8 MB' },
    { id: 3, name: 'Goal Achievement Report', date: '2023-12-15', type: 'PDF', size: '3.2 MB' },
    { id: 4, name: 'Time Tracking Analysis', date: '2023-12-01', type: 'CSV', size: '856 KB' }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="card animate-fadeIn">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 dark:bg-slate-700 rounded"></div>
              ))}
            </div>
            <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="text-sm text-gray-600 dark:text-slate-400">
        <span>Dashboard</span>
        <span className="mx-2">/</span>
        <span className="text-gray-900 dark:text-slate-100 font-medium">Analytics</span>
      </nav>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-slate-700">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'reports', label: 'Reports' },
            { id: 'exports', label: 'Data Export' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Header */}
          <div className="card animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <h2 className="card-title">Analytics Overview</h2>
              </div>
              
              <div className="flex items-center space-x-2 mt-4 sm:mt-0">
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
                  className="input text-sm"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{overallStats.totalTasksCompleted}</div>
                <div className="text-sm text-gray-600 dark:text-slate-400">Tasks Done</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{overallStats.averageCompletionRate}%</div>
                <div className="text-sm text-gray-600 dark:text-slate-400">Completion</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{overallStats.totalPoints}</div>
                <div className="text-sm text-gray-600 dark:text-slate-400">Total Points</div>
              </div>
              
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{formatTime(overallStats.totalTimeSpent)}</div>
                <div className="text-sm text-gray-600 dark:text-slate-400">Time Spent</div>
              </div>
              
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{overallStats.currentStreak}</div>
                <div className="text-sm text-gray-600 dark:text-slate-400">Current Streak</div>
              </div>
              
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{overallStats.bestStreak}</div>
                <div className="text-sm text-gray-600 dark:text-slate-400">Best Streak</div>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Productivity Trend */}
            <div className="card animate-fadeIn">
              <div className="card-header">
                <h3 className="card-title flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2 text-green-600" />
                  Daily Productivity
                </h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="tasksCompleted"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.1}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Completion Rate Trend */}
            <div className="card animate-fadeIn">
              <div className="card-header">
                <h3 className="card-title flex items-center">
                  <Target className="w-4 h-4 mr-2 text-purple-600" />
                  Completion Rate
                </h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="completionRate"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Priority Distribution */}
            <div className="card animate-fadeIn">
              <div className="card-header">
                <h3 className="card-title flex items-center">
                  <Award className="w-4 h-4 mr-2 text-yellow-600" />
                  Task Priority Distribution
                </h3>
              </div>
              <div className="h-64">
                {categoryStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryStats}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {categoryStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 dark:text-slate-400">
                    <div className="text-center">
                      <Award className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-slate-600" />
                      <p>No completed tasks yet</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Weekly Comparison */}
            <div className="card animate-fadeIn">
              <div className="card-header">
                <h3 className="card-title flex items-center">
                  <Activity className="w-4 h-4 mr-2 text-indigo-600" />
                  This Week vs Last Week
                </h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="lastWeek" fill="#e5e7eb" name="Last Week" />
                    <Bar dataKey="thisWeek" fill="#6366f1" name="This Week" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Time Tracking Chart */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h3 className="card-title flex items-center">
                <Clock className="w-4 h-4 mr-2 text-blue-600" />
                Daily Time Investment
              </h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="timeSpent" fill="#06b6d4" name="Time Spent (min)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Insights Panel */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h3 className="card-title flex items-center">
                <Zap className="w-4 h-4 mr-2 text-yellow-600" />
                Productivity Insights
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-3">📈 Performance Trends</h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-slate-400">
                  {overallStats.currentStreak > 0 && (
                    <li>• You're on a {overallStats.currentStreak}-day productivity streak! 🔥</li>
                  )}
                  {overallStats.averageCompletionRate >= 80 && (
                    <li>• Excellent completion rate of {overallStats.averageCompletionRate}% 🎯</li>
                  )}
                  {overallStats.averageCompletionRate < 50 && (
                    <li>• Focus on completing more tasks - current rate: {overallStats.averageCompletionRate}%</li>
                  )}
                  {dailyStats.length > 0 && dailyStats[dailyStats.length - 1].journalEntry && (
                    <li>• Great job keeping up with journaling! 📝</li>
                  )}
                </ul>
              </div>
              
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-3">💡 Recommendations</h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-slate-400">
                  {overallStats.currentStreak === 0 && (
                    <li>• Start a new productivity streak by completing tasks today</li>
                  )}
                  {overallStats.totalTimeSpent > 0 && overallStats.totalTasksCompleted > 0 && (
                    <li>• Average time per task: {Math.round(overallStats.totalTimeSpent / overallStats.totalTasksCompleted)}min</li>
                  )}
                  {categoryStats.length > 0 && categoryStats[0].name.includes('Low') && (
                    <li>• Consider focusing on higher-priority tasks for better impact</li>
                  )}
                  <li>• Keep tracking your progress to maintain momentum! 🚀</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="card animate-fadeIn">
          <div className="card-header">
            <h2 className="card-title">Generated Reports</h2>
            <button className="btn-primary">
              <Download className="w-4 h-4 mr-2" />
              Generate Report
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-3 px-0 text-sm font-medium text-gray-700 dark:text-slate-300">Report Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-slate-300">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-slate-300">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-slate-300">Size</th>
                  <th className="text-right py-3 px-0 text-sm font-medium text-gray-700 dark:text-slate-300">Download</th>
                </tr>
              </thead>
              <tbody>
                {mockReports.map((report) => (
                  <tr key={report.id} className="border-b border-gray-100 dark:border-slate-800">
                    <td className="py-3 px-0 text-sm text-gray-900 dark:text-slate-100 font-medium">{report.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-400">{report.date}</td>
                    <td className="py-3 px-4">
                      <span className="badge badge-gray">{report.type}</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-400">{report.size}</td>
                    <td className="py-3 px-0 text-right">
                      <button className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Exports Tab */}
      {activeTab === 'exports' && (
        <div className="card animate-fadeIn">
          <div className="card-header">
            <h2 className="card-title">Data Export</h2>
            <button className="btn-primary">
              <Download className="w-4 h-4 mr-2" />
              Export All Data
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'Tasks & Todos', description: 'Export all your tasks, priorities, and completion data', format: 'CSV, JSON' },
              { name: 'Journal Entries', description: 'Export all your daily journal entries and reflections', format: 'PDF, TXT' },
              { name: 'Analytics Data', description: 'Export productivity metrics and performance data', format: 'Excel, CSV' },
              { name: 'Learning Goals', description: 'Export your learning objectives and progress', format: 'PDF, CSV' },
              { name: 'Content Tracker', description: 'Export your content consumption and progress', format: 'CSV, JSON' },
              { name: 'Quick Links', description: 'Export your saved quick access links', format: 'JSON, CSV' }
            ].map((item, index) => (
              <div key={index} className="p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:border-gray-300 dark:hover:border-slate-600 transition-colors">
                <h3 className="font-medium text-gray-900 dark:text-slate-100 mb-2">{item.name}</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">{item.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-slate-400">{item.format}</span>
                  <button className="btn-secondary text-sm">Export</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;