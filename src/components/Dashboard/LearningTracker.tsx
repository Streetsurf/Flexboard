import React, { useState, useEffect } from 'react';
import { GraduationCap, Plus, X, Target, Edit2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { triggerDataUpdate } from '../../hooks/useGlobalState';

interface LearningGoal {
  id: string;
  title: string;
  description: string;
  target_date: string;
  completed: boolean;
  user_id: string;
}

interface LearningTrackerProps {
  readOnly?: boolean;
  globalData?: LearningGoal[];
}

const LearningTracker: React.FC<LearningTrackerProps> = ({ readOnly = false, globalData = [] }) => {
  const [goals, setGoals] = useState<LearningGoal[]>(globalData);
  const [loading, setLoading] = useState(!globalData.length);
  const { user } = useAuth();

  useEffect(() => {
    if (globalData.length > 0) {
      setGoals(globalData);
      setLoading(false);
    } else if (user) {
      fetchGoals();
    }
  }, [globalData, user]);

  const fetchGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('learning_goals')
        .select('*')
        .eq('user_id', user?.id)
        .order('target_date', { ascending: true })
        .limit(readOnly ? 5 : 50);

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Error fetching learning goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleGoal = async (id: string, completed: boolean) => {
    if (readOnly) return;
    
    try {
      const { error } = await supabase
        .from('learning_goals')
        .update({ completed: !completed })
        .eq('id', id);

      if (error) throw error;
      setGoals(goals.map(goal => 
        goal.id === id ? { ...goal, completed: !completed } : goal
      ));
      
      // Trigger global state update
      triggerDataUpdate('learning');
    } catch (error) {
      console.error('Error updating learning goal:', error);
    }
  };

  const isOverdue = (targetDate: string) => {
    return new Date(targetDate) < new Date() && targetDate !== '';
  };

  if (loading) {
    return (
      <div className="card animate-fadeIn">
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
    <div className="card animate-fadeIn">
      {/* Header */}
      <div className="card-header">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center hover-scale">
            <GraduationCap className="w-3 h-3 text-white" />
          </div>
          <h2 className="card-title">Learning Goals</h2>
        </div>
        {!readOnly ? (
          <button
            onClick={() => window.location.href = '/?category=learning'}
            className="btn-icon-primary"
          >
            <Plus className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => window.location.href = '/?category=learning'}
            className="btn-icon-secondary"
            title="Manage Goals"
          >
            <Edit2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Goals List */}
      <div className="space-y-2.5">
        {goals.length === 0 ? (
          <div className="text-center py-6 text-gray-500 animate-fadeIn">
            <GraduationCap className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-xs mb-2">No learning goals yet</p>
            {!readOnly && (
              <button
                onClick={() => window.location.href = '/?category=learning'}
                className="text-blue-600 hover:text-blue-700 text-xs"
              >
                Set your first goal
              </button>
            )}
          </div>
        ) : (
          goals.slice(0, readOnly ? 5 : goals.length).map((goal, index) => (
            <div
              key={goal.id}
              className={`p-3 border rounded-lg transition-all duration-200 hover-lift stagger-item ${
                goal.completed
                  ? 'bg-green-50 border-green-200'
                  : isOverdue(goal.target_date)
                  ? 'bg-red-50 border-red-200'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2.5 flex-1 min-w-0">
                  <button
                    onClick={() => toggleGoal(goal.id, goal.completed)}
                    disabled={readOnly}
                    className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 hover-scale ${
                      goal.completed
                        ? 'bg-green-500 border-green-500 text-white'
                        : readOnly
                        ? 'border-gray-300 cursor-default'
                        : 'border-gray-300 hover:border-blue-500'
                    }`}
                  >
                    {goal.completed && <Target className="w-2.5 h-2.5" />}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium mb-1 text-xs ${goal.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                      {goal.title}
                    </h3>
                    {goal.description && (
                      <p className={`text-xs mb-1.5 ${goal.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                        {goal.description}
                      </p>
                    )}
                    {goal.target_date && (
                      <p className={`text-xs flex items-center ${
                        goal.completed
                          ? 'text-gray-400'
                          : isOverdue(goal.target_date)
                          ? 'text-red-600'
                          : 'text-gray-500'
                      }`}>
                        <Target className="w-2.5 h-2.5 mr-1" />
                        Target: {new Date(goal.target_date).toLocaleDateString()}
                        {isOverdue(goal.target_date) && !goal.completed && ' (Overdue)'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        
        {/* Show more link for read-only mode */}
        {readOnly && goals.length >= 5 && (
          <div className="text-center py-2">
            <button 
              onClick={() => window.location.href = '/?category=learning'}
              className="text-blue-600 hover:text-blue-700 text-xs"
            >
              View all goals →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LearningTracker;