import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Check, X, Clock, Calendar, ChevronLeft, ChevronRight, Play, Pause, Square, BarChart3, Edit2 } from 'lucide-react';
import { fastQuery, getCachedData, setCachedData } from '../../lib/supabase';
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
  const [allTodos, setAllTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [loading, setLoading] = useState(false); // Start with false for instant loading
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

  const dateStr = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);

  // Ultra-fast filtered todos from cache
  const todos = useMemo(() => {
    return allTodos.filter(todo => todo.date === dateStr)
      .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0))
      .slice(0, readOnly ? 5 : 50);
  }, [allTodos, dateStr, readOnly]);

  // Ultra-fast data loading with aggressive caching
  const loadTodos = useCallback(async () => {
    if (!user?.id) return;
    
    // Try cache first for instant loading
    const cacheKey = `todos_${user.id}`;
    const cached = getCachedData(cacheKey);
    if (cached) {
      setAllTodos(cached);
      return;
    }
    
    setLoading(true);
    try {
      const startDate = format(subDays(selectedDate, 60), 'yyyy-MM-dd');
      const endDate = format(addDays(selectedDate, 60), 'yyyy-MM-dd');
      
      const { data, error, fromCache } = await fastQuery('todos', {
        select: readOnly 
          ? 'id, title, completed, priority_score, date'
          : '*',
        eq: { user_id: user.id },
        gte: { date: startDate },
        lte: { date: endDate },
        order: { column: 'priority_score', ascending: false }
      });

      if (error) throw error;
      
      const todosData = data || [];
      setAllTodos(todosData);
      
      // Cache for ultra-fast future access
      if (!fromCache) {
        setCachedData(cacheKey, todosData);
      }
    } catch (error) {
      console.error('Error loading todos:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedDate, readOnly]);

  // Check active timer from cache first
  const checkActiveTimer = useCallback(async () => {
    if (!user?.id || readOnly) return;
    
    // Check cache first
    const activeTodo = allTodos.find(todo => todo.is_timer_active);
    if (activeTodo) {
      setActiveTimer(activeTodo.id);
      if (activeTodo.timer_start_time) {
        const startTime = new Date(activeTodo.timer_start_time);
        const now = new Date();
        const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setTimerSeconds(elapsedSeconds);
      }
      return;
    }
    
    try {
      const { data, error } = await fastQuery('todos', {
        select: 'id, timer_start_time',
        eq: { user_id: user.id, is_timer_active: true }
      });

      if (error) throw error;
      
      if (data && data.length > 0) {
        const activeData = data[0];
        setActiveTimer(activeData.id);
        if (activeData.timer_start_time) {
          const startTime = new Date(activeData.timer_start_time);
          const now = new Date();
          const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
          setTimerSeconds(elapsedSeconds);
        }
      }
    } catch (error) {
      console.error('Error checking active timer:', error);
    }
  }, [user?.id, readOnly, allTodos]);

  // Initial load with cache priority
  useEffect(() => {
    if (user) {
      loadTodos();
      if (!readOnly) {
        checkActiveTimer();
      }
    }
  }, [user, loadTodos, checkActiveTimer]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTimer && !readOnly) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer, readOnly]);

  // Ultra-fast priority calculation
  const calculatePriorityScore = useCallback((form: PriorityForm): number => {
    const { urgency, importance, effort, impact } = form;
    const score = (urgency * 0.3) + (importance * 0.3) + (impact * 0.3) + (effort * 0.1);
    return Math.round(Math.min(Math.max(score, 0.1), 10.0) * 10) / 10;
  }, []);

  // Optimized add todo with instant UI update
  const addTodo = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim() || !user?.id || saving) return;

    const priorityScore = calculatePriorityScore(priorityForm);
    const tempId = `temp_${Date.now()}`;
    
    // Instant UI update
    const newTodoItem: Todo = {
      id: tempId,
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
      is_timer_active: false,
      created_at: new Date().toISOString(),
      timer_start_time: null
    };

    setAllTodos(prev => [newTodoItem, ...prev]);
    setNewTodo('');
    setShowAddModal(false);
    setPriorityForm({
      urgency: 5,
      importance: 5,
      effort: 5,
      impact: 5,
      duration_minutes: 30
    });

    setSaving(true);
    try {
      const { data, error } = await fastQuery('todos', {
        insert: [{
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
        }]
      });

      if (error) throw error;
      
      // Replace temp item with real data
      if (data && data.length > 0) {
        setAllTodos(prev => prev.map(todo => 
          todo.id === tempId ? data[0] : todo
        ));
        
        // Update cache
        const cacheKey = `todos_${user.id}`;
        const cached = getCachedData(cacheKey);
        if (cached) {
          setCachedData(cacheKey, [data[0], ...cached.filter((t: Todo) => t.id !== tempId)]);
        }
      }
    } catch (error) {
      console.error('Error adding todo:', error);
      // Remove temp item on error
      setAllTodos(prev => prev.filter(todo => todo.id !== tempId));
    } finally {
      setSaving(false);
    }
  }, [newTodo, user?.id, dateStr, priorityForm, calculatePriorityScore, saving]);

  // Optimized toggle with instant UI update
  const toggleTodo = useCallback(async (id: string, completed: boolean) => {
    if (readOnly) return;
    
    // Instant UI update
    setAllTodos(prev => prev.map(todo => 
      todo.id === id ? { ...todo, completed: !completed } : todo
    ));
    
    try {
      const { error } = await fastQuery('todos', {
        update: { completed: !completed },
        eq: { id }
      });

      if (error) throw error;
      
      // Update cache
      const cacheKey = `todos_${user?.id}`;
      const cached = getCachedData(cacheKey);
      if (cached) {
        setCachedData(cacheKey, cached.map((todo: Todo) => 
          todo.id === id ? { ...todo, completed: !completed } : todo
        ));
      }
    } catch (error) {
      console.error('Error updating todo:', error);
      // Revert on error
      setAllTodos(prev => prev.map(todo => 
        todo.id === id ? { ...todo, completed } : todo
      ));
    }
  }, [readOnly, user?.id]);

  // Ultra-fast navigation with instant UI updates
  const navigateDate = useCallback((direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' 
      ? subDays(selectedDate, 1)
      : addDays(selectedDate, 1);
    
    setSelectedDate(newDate);
    // Data will be filtered instantly from cache
  }, [selectedDate]);

  const goToToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    setShowCalendar(false);
  }, []);

  // Utility functions
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

  // Render loading state only if actually loading
  if (loading && allTodos.length === 0) {
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
                        
                        {todo.priority_score && (
                          <span className="badge badge-gray">
                            {todo.priority_score.toFixed(1)}
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
                      <button
                        onClick={() => console.log('Edit todo:', todo.id)}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-all duration-200 hover-scale"
                        title="Edit task"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      
                      <button
                        onClick={() => console.log('Delete todo:', todo.id)}
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
          {readOnly && allTodos.filter(todo => todo.date === dateStr).length > 5 && (
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

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-3 z-50 modal-overlay">
          <div className="modal-content max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Add New Task</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-all duration-200 hover-scale"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={addTodo} className="space-y-3">
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

                <div className="flex space-x-2 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Adding...' : 'Add Task'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
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