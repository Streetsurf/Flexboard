import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Check, X, Clock, Calendar, ChevronLeft, ChevronRight, Play, Pause, Square, BarChart3, Edit2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { format, addDays, subDays, startOfWeek, endOfWeek, isSameDay, isToday, startOfMonth, endOfMonth } from 'date-fns';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
  user_id: string;
  date: string;
  priority_score?: number;
  urgency?: number;
  importance?: number;
  effort?: number;
  impact?: number;
  duration_minutes?: number;
  actual_minutes?: number;
  timer_start_time?: string;
  is_timer_active?: boolean;
}

interface PriorityForm {
  urgency: number;
  importance: number;
  effort: number;
  impact: number;
  duration_minutes: number;
}

interface TodoListProps {
  readOnly?: boolean;
}

const TodoList: React.FC<TodoListProps> = ({ readOnly = false }) => {
  const [allTodos, setAllTodos] = useState<Todo[]>([]); // Cache semua todos
  const [newTodo, setNewTodo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [priorityForm, setPriorityForm] = useState<PriorityForm>({
    urgency: 5,
    importance: 5,
    effort: 5,
    impact: 5,
    duration_minutes: 30
  });
  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const { user } = useAuth();

  // Memoize date string to prevent unnecessary re-renders
  const dateStr = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);

  // Filter todos untuk tanggal yang dipilih dari cache
  const todos = useMemo(() => {
    return allTodos.filter(todo => todo.date === dateStr)
      .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0))
      .slice(0, readOnly ? 5 : 50);
  }, [allTodos, dateStr, readOnly]);

  // Fetch todos untuk range tanggal yang lebih luas (1 bulan)
  const fetchTodosRange = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Ambil data untuk 1 bulan ke depan dan belakang
      const startDate = format(subDays(selectedDate, 30), 'yyyy-MM-dd');
      const endDate = format(addDays(selectedDate, 30), 'yyyy-MM-dd');
      
      const selectFields = readOnly 
        ? 'id, title, completed, priority_score, date'
        : '*';
      
      const { data, error } = await supabase
        .from('todos')
        .select(selectFields)
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('priority_score', { ascending: false });

      if (error) throw error;
      setAllTodos(data || []);
    } catch (error) {
      console.error('Error fetching todos:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedDate, readOnly]);

  // Fetch todos untuk tanggal spesifik jika belum ada di cache
  const fetchTodosForDate = useCallback(async (targetDate: string) => {
    if (!user?.id) return;
    
    // Cek apakah data untuk tanggal ini sudah ada di cache
    const existingTodos = allTodos.filter(todo => todo.date === targetDate);
    if (existingTodos.length > 0) return; // Sudah ada di cache
    
    try {
      const selectFields = readOnly 
        ? 'id, title, completed, priority_score, date'
        : '*';
      
      const { data, error } = await supabase
        .from('todos')
        .select(selectFields)
        .eq('user_id', user.id)
        .eq('date', targetDate)
        .order('priority_score', { ascending: false })
        .limit(readOnly ? 5 : 50);

      if (error) throw error;
      
      // Tambahkan ke cache tanpa mengganti yang sudah ada
      setAllTodos(prev => {
        const filtered = prev.filter(todo => todo.date !== targetDate);
        return [...filtered, ...(data || [])];
      });
    } catch (error) {
      console.error('Error fetching todos for date:', error);
    }
  }, [user?.id, allTodos, readOnly]);

  const checkActiveTimer = useCallback(async () => {
    if (!user?.id || readOnly) return;
    
    try {
      const { data, error } = await supabase
        .from('todos')
        .select('id, timer_start_time')
        .eq('user_id', user.id)
        .eq('is_timer_active', true)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setActiveTimer(data.id);
        const startTime = new Date(data.timer_start_time);
        const now = new Date();
        const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setTimerSeconds(elapsedSeconds);
      }
    } catch (error) {
      console.error('Error checking active timer:', error);
    }
  }, [user?.id, readOnly]);

  // Initial load
  useEffect(() => {
    if (user) {
      fetchTodosRange();
      if (!readOnly) {
        checkActiveTimer();
      }
    }
  }, [user, fetchTodosRange, checkActiveTimer]);

  // Load data untuk tanggal baru saat navigasi
  useEffect(() => {
    if (user && dateStr) {
      fetchTodosForDate(dateStr);
    }
  }, [user, dateStr, fetchTodosForDate]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTimer && !readOnly) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer, readOnly]);

  const calculatePriorityScore = useCallback((form: PriorityForm): number => {
    const { urgency, importance, effort, impact } = form;
    const urgencyScore = urgency * 0.3;
    const importanceScore = importance * 0.3;
    const impactScore = impact * 0.3;
    const effortScore = effort * 0.1;
    const finalScore = urgencyScore + importanceScore + impactScore + effortScore;
    const normalizedScore = Math.min(Math.max(finalScore, 0.1), 10.0);
    return Math.round(normalizedScore * 10) / 10;
  }, []);

  const addTodo = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim() || !user?.id || saving) return;

    try {
      setSaving(true);
      const priorityScore = calculatePriorityScore(priorityForm);
      
      const { data, error } = await supabase
        .from('todos')
        .insert([
          {
            title: newTodo.trim(),
            completed: false,
            user_id: user.id,
            date: dateStr,
            urgency: priorityForm.urgency,
            importance: priorityForm.importance,
            effort: priorityForm.effort,
            impact: priorityForm.impact,
            duration_minutes: priorityForm.duration_minutes,
            priority_score: priorityScore,
            actual_minutes: 0,
            is_timer_active: false
          },
        ])
        .select()
        .single();

      if (error) throw error;
      
      // Update cache
      setAllTodos(prev => [data, ...prev]);
      setNewTodo('');
      setShowAddModal(false);
      setPriorityForm({
        urgency: 5,
        importance: 5,
        effort: 5,
        impact: 5,
        duration_minutes: 30
      });
    } catch (error) {
      console.error('Error adding todo:', error);
    } finally {
      setSaving(false);
    }
  }, [newTodo, user?.id, dateStr, priorityForm, calculatePriorityScore, saving]);

  const updateTodo = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTodo || !newTodo.trim() || saving) return;

    try {
      setSaving(true);
      const priorityScore = calculatePriorityScore(priorityForm);
      
      const { data, error } = await supabase
        .from('todos')
        .update({
          title: newTodo.trim(),
          urgency: priorityForm.urgency,
          importance: priorityForm.importance,
          effort: priorityForm.effort,
          impact: priorityForm.impact,
          duration_minutes: priorityForm.duration_minutes,
          priority_score: priorityScore,
        })
        .eq('id', editingTodo.id)
        .select()
        .single();

      if (error) throw error;
      
      // Update cache
      setAllTodos(prev => prev.map(todo => todo.id === editingTodo.id ? data : todo));
      setNewTodo('');
      setEditingTodo(null);
      setShowAddModal(false);
      setPriorityForm({
        urgency: 5,
        importance: 5,
        effort: 5,
        impact: 5,
        duration_minutes: 30
      });
    } catch (error) {
      console.error('Error updating todo:', error);
    } finally {
      setSaving(false);
    }
  }, [editingTodo, newTodo, priorityForm, calculatePriorityScore, saving]);

  const toggleTodo = useCallback(async (id: string, completed: boolean) => {
    if (readOnly) return;
    
    try {
      const { error } = await supabase
        .from('todos')
        .update({ completed: !completed })
        .eq('id', id);

      if (error) throw error;
      
      // Update cache
      setAllTodos(prev => prev.map(todo => 
        todo.id === id ? { ...todo, completed: !completed } : todo
      ));
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  }, [readOnly]);

  const deleteTodo = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Update cache
      setAllTodos(prev => prev.filter(todo => todo.id !== id));
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  }, []);

  const startTimer = useCallback(async (todoId: string) => {
    if (readOnly) return;
    
    try {
      if (activeTimer) {
        await pauseTimer(activeTimer);
      }

      const { error } = await supabase
        .from('todos')
        .update({
          timer_start_time: new Date().toISOString(),
          is_timer_active: true
        })
        .eq('id', todoId);

      if (error) throw error;
      
      setActiveTimer(todoId);
      setTimerSeconds(0);
      
      // Update cache
      setAllTodos(prev => prev.map(todo => 
        todo.id === todoId 
          ? { ...todo, timer_start_time: new Date().toISOString(), is_timer_active: true }
          : { ...todo, is_timer_active: false }
      ));
    } catch (error) {
      console.error('Error starting timer:', error);
    }
  }, [activeTimer, readOnly]);

  const pauseTimer = useCallback(async (todoId: string) => {
    if (readOnly) return;
    
    try {
      const todo = allTodos.find(t => t.id === todoId);
      if (!todo) return;

      const currentActualMinutes = todo.actual_minutes || 0;
      const additionalMinutes = Math.round((timerSeconds / 60) * 100) / 100;
      const newActualMinutes = Math.round((currentActualMinutes + additionalMinutes) * 100) / 100;

      const { error } = await supabase
        .from('todos')
        .update({
          actual_minutes: newActualMinutes,
          is_timer_active: false,
          timer_start_time: null
        })
        .eq('id', todoId);

      if (error) throw error;
      
      setActiveTimer(null);
      setTimerSeconds(0);
      
      // Update cache
      setAllTodos(prev => prev.map(todo => 
        todo.id === todoId 
          ? { ...todo, actual_minutes: newActualMinutes, is_timer_active: false, timer_start_time: null }
          : todo
      ));
    } catch (error) {
      console.error('Error pausing timer:', error);
    }
  }, [allTodos, timerSeconds, readOnly]);

  const finishTask = useCallback(async (todoId: string) => {
    if (readOnly) return;
    
    try {
      const todo = allTodos.find(t => t.id === todoId);
      if (!todo) return;

      let finalActualMinutes = todo.actual_minutes || 0;
      
      if (activeTimer === todoId) {
        const additionalMinutes = Math.round((timerSeconds / 60) * 100) / 100;
        finalActualMinutes = Math.round((finalActualMinutes + additionalMinutes) * 100) / 100;
      }

      const { error } = await supabase
        .from('todos')
        .update({
          completed: true,
          actual_minutes: finalActualMinutes,
          is_timer_active: false,
          timer_start_time: null
        })
        .eq('id', todoId);

      if (error) throw error;
      
      if (activeTimer === todoId) {
        setActiveTimer(null);
        setTimerSeconds(0);
      }
      
      // Update cache
      setAllTodos(prev => prev.map(todo => 
        todo.id === todoId 
          ? { 
              ...todo, 
              completed: true, 
              actual_minutes: finalActualMinutes, 
              is_timer_active: false, 
              timer_start_time: null 
            }
          : todo
      ));
    } catch (error) {
      console.error('Error finishing task:', error);
    }
  }, [allTodos, activeTimer, timerSeconds, readOnly]);

  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const formatMinutes = useCallback((minutes: number): string => {
    if (minutes < 1) {
      const seconds = Math.round(minutes * 60);
      return `${seconds}s`;
    }
    if (minutes < 60) {
      return minutes % 1 === 0 ? `${minutes}m` : `${minutes.toFixed(1)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round((minutes % 60) * 10) / 10;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }, []);

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(start, i));
    }
    return days;
  }, [selectedDate]);

  // Smooth navigation tanpa loading
  const navigateDate = useCallback((direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' 
      ? subDays(selectedDate, 1)
      : addDays(selectedDate, 1);
    
    setSelectedDate(newDate);
    
    // Preload data untuk tanggal baru
    const newDateStr = format(newDate, 'yyyy-MM-dd');
    fetchTodosForDate(newDateStr);
  }, [selectedDate, fetchTodosForDate]);

  const goToToday = useCallback(() => {
    const today = new Date();
    setSelectedDate(today);
    
    // Preload data untuk hari ini
    const todayStr = format(today, 'yyyy-MM-dd');
    fetchTodosForDate(todayStr);
  }, [fetchTodosForDate]);

  // Smooth calendar navigation
  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    setShowCalendar(false);
    
    // Preload data untuk tanggal yang dipilih
    const dateStr = format(date, 'yyyy-MM-dd');
    fetchTodosForDate(dateStr);
  }, [fetchTodosForDate]);

  const openEditModal = useCallback((todo: Todo) => {
    setEditingTodo(todo);
    setNewTodo(todo.title);
    setPriorityForm({
      urgency: todo.urgency || 5,
      importance: todo.importance || 5,
      effort: todo.effort || 5,
      impact: todo.impact || 5,
      duration_minutes: todo.duration_minutes || 30
    });
    setShowAddModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowAddModal(false);
    setEditingTodo(null);
    setNewTodo('');
    setPriorityForm({
      urgency: 5,
      importance: 5,
      effort: 5,
      impact: 5,
      duration_minutes: 30
    });
  }, []);

  const getMonthlyStats = useCallback(async () => {
    if (!user?.id) return {
      totalPoints: 0,
      totalCompleted: 0,
      averageScore: 0,
      timeUsage: 0,
      usageLabel: 'No data',
      totalEstimated: 0,
      totalActual: 0
    };

    try {
      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());
      const monthStartStr = format(monthStart, 'yyyy-MM-dd');
      const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

      // Gunakan cache jika tersedia
      const cachedTodos = allTodos.filter(todo => 
        todo.date >= monthStartStr && 
        todo.date <= monthEndStr && 
        todo.completed
      );

      if (cachedTodos.length > 0) {
        const totalPoints = cachedTodos.reduce((sum, todo) => {
          let points = todo.priority_score || 0;
          
          if (todo.duration_minutes && todo.actual_minutes !== null && todo.duration_minutes > 0) {
            const timeUsagePercentage = (todo.actual_minutes / todo.duration_minutes) * 100;
            points = (todo.priority_score || 0) * (timeUsagePercentage / 100);
          }
          
          return sum + points;
        }, 0);

        const totalCompleted = cachedTodos.length;
        const averageScore = totalCompleted > 0 ? totalPoints / totalCompleted : 0;
        const totalEstimated = cachedTodos.reduce((sum, todo) => sum + (todo.duration_minutes || 0), 0);
        const totalActual = cachedTodos.reduce((sum, todo) => sum + (todo.actual_minutes || 0), 0);
        
        let timeUsage = 0;
        let usageLabel = 'No data';
        
        if (totalEstimated > 0 && totalActual >= 0) {
          timeUsage = (totalActual / totalEstimated) * 100;
          if (timeUsage < 50) {
            usageLabel = 'Poor Effort';
          } else if (timeUsage >= 50 && timeUsage < 75) {
            usageLabel = 'Below Standard';
          } else if (timeUsage >= 75 && timeUsage <= 100) {
            usageLabel = 'Standard';
          } else if (timeUsage > 100 && timeUsage <= 150) {
            usageLabel = 'Excellent';
          } else if (timeUsage > 150) {
            usageLabel = 'Outstanding';
          }
        } else if (totalEstimated === 0) {
          usageLabel = 'No estimates';
        }

        return {
          totalPoints: Math.round(totalPoints * 10) / 10,
          totalCompleted,
          averageScore: Math.round(averageScore * 10) / 10,
          timeUsage: Math.round(timeUsage),
          usageLabel,
          totalEstimated,
          totalActual
        };
      }

      // Fallback ke database jika cache tidak lengkap
      const { data, error } = await supabase
        .from('todos')
        .select('priority_score, duration_minutes, actual_minutes')
        .eq('user_id', user.id)
        .gte('date', monthStartStr)
        .lte('date', monthEndStr)
        .eq('completed', true);

      if (error) throw error;

      const completedTodos = data || [];
      
      const totalPoints = completedTodos.reduce((sum, todo) => {
        let points = todo.priority_score || 0;
        
        if (todo.duration_minutes && todo.actual_minutes !== null && todo.duration_minutes > 0) {
          const timeUsagePercentage = (todo.actual_minutes / todo.duration_minutes) * 100;
          points = (todo.priority_score || 0) * (timeUsagePercentage / 100);
        }
        
        return sum + points;
      }, 0);

      const totalCompleted = completedTodos.length;
      const averageScore = totalCompleted > 0 ? totalPoints / totalCompleted : 0;
      const totalEstimated = completedTodos.reduce((sum, todo) => sum + (todo.duration_minutes || 0), 0);
      const totalActual = completedTodos.reduce((sum, todo) => sum + (todo.actual_minutes || 0), 0);
      
      let timeUsage = 0;
      let usageLabel = 'No data';
      
      if (totalEstimated > 0 && totalActual >= 0) {
        timeUsage = (totalActual / totalEstimated) * 100;
        if (timeUsage < 50) {
          usageLabel = 'Poor Effort';
        } else if (timeUsage >= 50 && timeUsage < 75) {
          usageLabel = 'Below Standard';
        } else if (timeUsage >= 75 && timeUsage <= 100) {
          usageLabel = 'Standard';
        } else if (timeUsage > 100 && timeUsage <= 150) {
          usageLabel = 'Excellent';
        } else if (timeUsage > 150) {
          usageLabel = 'Outstanding';
        }
      } else if (totalEstimated === 0) {
        usageLabel = 'No estimates';
      }

      return {
        totalPoints: Math.round(totalPoints * 10) / 10,
        totalCompleted,
        averageScore: Math.round(averageScore * 10) / 10,
        timeUsage: Math.round(timeUsage),
        usageLabel,
        totalEstimated,
        totalActual
      };
    } catch (error) {
      console.error('Error calculating stats:', error);
      return {
        totalPoints: 0,
        totalCompleted: 0,
        averageScore: 0,
        timeUsage: 0,
        usageLabel: 'No data',
        totalEstimated: 0,
        totalActual: 0
      };
    }
  }, [user?.id, allTodos]);

  const [monthlyStats, setMonthlyStats] = useState({
    totalPoints: 0,
    totalCompleted: 0,
    averageScore: 0,
    timeUsage: 0,
    usageLabel: 'No data',
    totalEstimated: 0,
    totalActual: 0
  });

  useEffect(() => {
    if (user && showStats && !readOnly) {
      getMonthlyStats().then(setMonthlyStats);
    }
  }, [user, showStats, allTodos, getMonthlyStats, readOnly]);

  const getTaskStatus = useCallback((todo: Todo) => {
    if (todo.completed) return 'Completed';
    if (todo.is_timer_active) return 'In Progress';
    return 'Pending';
  }, []);

  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
      case 'Completed': return 'badge badge-success';
      case 'In Progress': return 'badge badge-info';
      case 'Pending': return 'badge badge-gray';
      default: return 'badge badge-gray';
    }
  }, []);

  const getPriorityBadge = useCallback((score: number) => {
    if (score >= 8) return 'bg-red-50 text-red-700 border border-red-200';
    if (score >= 6) return 'bg-orange-50 text-orange-700 border border-orange-200';
    if (score >= 4) return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
    return 'bg-green-50 text-green-700 border border-green-200';
  }, []);

  const getPriorityLabel = useCallback((score: number) => {
    if (score >= 8) return 'Critical';
    if (score >= 6) return 'High';
    if (score >= 4) return 'Medium';
    return 'Low';
  }, []);

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-100 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-100 rounded"></div>
            <div className="h-3 bg-gray-100 rounded w-5/6"></div>
            <div className="h-3 bg-gray-100 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        {/* Header */}
        <div className="card-header">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center hover-scale">
              <Clock className="w-3 h-3 text-white" />
            </div>
            <h2 className="card-title">
              {readOnly ? "Today's Tasks" : "Tasks"}
            </h2>
          </div>
          
          <div className="flex items-center space-x-1">
            {!readOnly && (
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-icon-primary"
                title="Add Task"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            {!readOnly && (
              <button
                onClick={() => setShowStats(!showStats)}
                className={`btn-icon ${showStats ? 'btn-icon-primary' : 'btn-icon-secondary'}`}
                title="Stats"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Stats Panel */}
        {showStats && !readOnly && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Performance - {format(new Date(), 'MMMM yyyy')}
            </h3>
            
            <div className="grid-4 mb-3">
              <div className="stat-card">
                <div className="stat-value text-blue-600">{monthlyStats.totalPoints}</div>
                <div className="stat-label">Total Points</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-green-600">{monthlyStats.totalCompleted}</div>
                <div className="stat-label">Tasks Done</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-purple-600">{monthlyStats.averageScore}</div>
                <div className="stat-label">Avg Score</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-orange-600">
                  {monthlyStats.timeUsage > 0 ? `${monthlyStats.timeUsage}%` : 'N/A'}
                </div>
                <div className="stat-label">Effort Level</div>
              </div>
            </div>

            <div className="p-2.5 bg-white rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Time Spent:</span>
                  <span className="font-medium text-gray-900">{formatMinutes(monthlyStats.totalActual)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Estimated:</span>
                  <span className="font-medium text-gray-900">{formatMinutes(monthlyStats.totalEstimated)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Effort Level:</span>
                  <span className="font-medium text-gray-900">{monthlyStats.usageLabel}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Date Navigation - Only show if not read-only */}
        {!readOnly && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => navigateDate('prev')}
                  className="btn-icon-secondary transition-all duration-200"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all duration-200 hover-lift"
                >
                  <Calendar className="w-3 h-3" />
                  <span className="font-medium text-gray-900 text-xs">
                    {format(selectedDate, 'EEE, MMM d')}
                  </span>
                </button>
                
                <button
                  onClick={() => navigateDate('next')}
                  className="btn-icon-secondary transition-all duration-200"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              
              {!isToday(selectedDate) && (
                <button
                  onClick={goToToday}
                  className="btn-secondary text-xs transition-all duration-200"
                >
                  Today
                </button>
              )}
            </div>

            {/* Week Calendar */}
            {showCalendar && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 animate-slideDown">
                <div className="grid grid-cols-7 gap-1">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <div key={day} className="text-center text-xs font-medium text-gray-500 py-1.5">
                      {day}
                    </div>
                  ))}
                  {weekDays.map((day, index) => (
                    <button
                      key={day.toISOString()}
                      onClick={() => handleDateSelect(day)}
                      className={`p-1.5 text-xs rounded-lg transition-all duration-200 hover-lift ${
                        isSameDay(day, selectedDate)
                          ? 'bg-blue-600 text-white'
                          : isToday(day)
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {format(day, 'd')}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Date Info */}
        <div className="mb-4 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-900 text-xs">
              {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE, MMMM d')}
            </span>
            <span className="text-xs text-gray-500">
              {todos.length} {todos.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>
        </div>

        {/* Todo List */}
        <div className="space-y-2.5">
          {todos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-medium mb-1">
                No tasks for {isToday(selectedDate) ? 'today' : format(selectedDate, 'MMM d')}
              </p>
              {!readOnly && (
                <p className="text-xs">Add one above to get started!</p>
              )}
            </div>
          ) : (
            todos.map((todo, index) => (
              <div
                key={todo.id}
                className={`p-3 rounded-lg border transition-all duration-200 hover-lift ${
                  todo.completed
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start space-x-2.5 flex-1 min-w-0">
                    <button
                      onClick={() => toggleTodo(todo.id, todo.completed)}
                      disabled={readOnly}
                      className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 hover-scale ${
                        todo.completed
                          ? 'bg-green-600 border-green-600 text-white'
                          : readOnly
                          ? 'border-gray-300 cursor-default'
                          : 'border-gray-300 hover:border-green-500'
                      }`}
                    >
                      {todo.completed && <Check className="w-2.5 h-2.5" />}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium mb-1.5 text-xs ${
                        todo.completed
                          ? 'text-gray-500 line-through'
                          : 'text-gray-900'
                      }`}>
                        {todo.title}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-1.5">
                        {todo.duration_minutes && (
                          <span className="text-xs text-gray-500">
                            Est: {formatMinutes(todo.duration_minutes)}
                          </span>
                        )}
                        
                        <span className={getStatusBadge(getTaskStatus(todo))}>
                          {getTaskStatus(todo)}
                        </span>
                        
                        {todo.priority_score && (
                          <span className={`badge ${getPriorityBadge(todo.priority_score)}`}>
                            {getPriorityLabel(todo.priority_score)} ({todo.priority_score.toFixed(1)})
                          </span>
                        )}
                      </div>
                      
                      {activeTimer === todo.id && (
                        <div className="mt-1.5 text-blue-600 font-medium text-xs animate-pulse">
                          ⏱️ {formatTime(timerSeconds)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons - Only show if not read-only */}
                  {!readOnly && (
                    <div className="flex items-center space-x-0.5 flex-shrink-0">
                      {!todo.completed && (
                        <>
                          {activeTimer === todo.id ? (
                            <>
                              <button
                                onClick={() => pauseTimer(todo.id)}
                                className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg transition-all duration-200 hover-scale"
                                title="Pause timer"
                              >
                                <Pause className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => finishTask(todo.id)}
                                className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition-all duration-200 hover-scale"
                                title="Finish task"
                              >
                                <Square className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => startTimer(todo.id)}
                              className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition-all duration-200 hover-scale"
                              title="Start timer"
                            >
                              <Play className="w-3 h-3" />
                            </button>
                          )}
                        </>
                      )}
                      
                      <button
                        onClick={() => openEditModal(todo)}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-all duration-200 hover-scale"
                        title="Edit task"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      
                      <button
                        onClick={() => deleteTodo(todo.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 hover-scale"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          
          {/* Show more link for read-only mode */}
          {readOnly && todos.length > 5 && (
            <div className="text-center py-2">
              <button 
                onClick={() => window.location.href = '/?category=todos'}
                className="text-blue-600 hover:text-blue-700 text-xs"
              >
                View all {allTodos.filter(todo => todo.date === dateStr).length} tasks →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-3 z-50 modal-overlay">
          <div className="modal-content max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">
                  {editingTodo ? 'Edit Task' : 'Add New Task'}
                </h3>
                <button
                  onClick={closeModal}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-all duration-200 hover-scale"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={editingTodo ? updateTodo : addTodo} className="space-y-3">
                {/* Task Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Task Name
                  </label>
                  <input
                    type="text"
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    placeholder="Enter task name..."
                    className="input"
                    required
                    disabled={saving}
                  />
                </div>

                {/* Priority Settings */}
                <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 text-xs">Priority & Duration</h4>
                  
                  {[
                    { key: 'urgency', label: 'Urgency' },
                    { key: 'importance', label: 'Importance' },
                    { key: 'effort', label: 'Effort' },
                    { key: 'impact', label: 'Impact' }
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        {label}
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={priorityForm[key as keyof PriorityForm]}
                        onChange={(e) => setPriorityForm({...priorityForm, [key]: parseInt(e.target.value)})}
                        className="w-full"
                        disabled={saving}
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Low</span>
                        <span className="font-medium">{priorityForm[key as keyof PriorityForm]}</span>
                        <span>High</span>
                      </div>
                    </div>
                  ))}

                  {/* Duration */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Estimated Duration
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="480"
                      step="5"
                      value={priorityForm.duration_minutes}
                      onChange={(e) => setPriorityForm({...priorityForm, duration_minutes: parseInt(e.target.value)})}
                      className="w-full"
                      disabled={saving}
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>5m</span>
                      <span className="font-medium">{formatMinutes(priorityForm.duration_minutes)}</span>
                      <span>8h</span>
                    </div>
                  </div>
                </div>

                {/* Priority Score */}
                <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-blue-700">Priority Score:</span>
                    <span className="text-sm font-semibold text-blue-600">
                      {calculatePriorityScore(priorityForm).toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : editingTodo ? 'Update Task' : 'Add Task'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="btn-secondary"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TodoList;