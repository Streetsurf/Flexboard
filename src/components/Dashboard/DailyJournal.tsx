import React, { useState, useEffect } from 'react';
import { BookOpen, Save, Edit2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { triggerDataUpdate } from '../../hooks/useGlobalState';
import { format } from 'date-fns';

interface JournalEntry {
  id: string;
  content: string;
  date: string;
  user_id: string;
}

interface DailyJournalProps {
  readOnly?: boolean;
  globalData?: JournalEntry[];
}

const DailyJournal: React.FC<DailyJournalProps> = ({ readOnly = false, globalData = [] }) => {
  const [entry, setEntry] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (globalData.length > 0) {
      const todayEntry = globalData.find(entry => entry.date === today);
      setEntry(todayEntry?.content || '');
    } else if (user) {
      fetchTodayEntry();
    }
  }, [globalData, today, user]);

  const fetchTodayEntry = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today);

      if (error) throw error;
      
      if (data && data.length > 0) {
        setEntry(data[0].content);
      } else {
        setEntry('');
      }
    } catch (error: any) {
      console.error('Error fetching journal entry:', error);
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const saveEntry = async () => {
    if (!entry.trim() || readOnly || !user) return;
    
    setSaving(true);
    setError(null);
    
    try {
      const { error } = await supabase
        .from('journal_entries')
        .upsert({
          content: entry,
          date: today,
          user_id: user.id,
        });

      if (error) throw error;
      setLastSaved(new Date());
      
      // Trigger global state update
      triggerDataUpdate('journal');
    } catch (error: any) {
      console.error('Error saving journal entry:', error);
      setError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const getErrorMessage = (error: any): string => {
    if (error.message?.includes('Failed to fetch')) {
      return 'Connection error. Please check your internet connection and try again.';
    }
    if (error.message?.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    return error.message || 'An unexpected error occurred. Please try again.';
  };

  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const retryConnection = () => {
    setError(null);
    fetchTodayEntry();
  };

  return (
    <div className="card animate-fadeIn">
      {/* Header */}
      <div className="card-header">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center hover-scale">
            <BookOpen className="w-3 h-3 text-white" />
          </div>
          <h2 className="card-title">Daily Journal</h2>
        </div>
        <div className="flex items-center space-x-2">
          {lastSaved && (
            <span className="text-xs text-gray-500 animate-fadeIn">
              Saved {format(lastSaved, 'HH:mm')}
            </span>
          )}
          {readOnly && entry && (
            <button
              onClick={() => window.location.href = '/?category=journal'}
              className="btn-icon-secondary"
              title="Edit Journal"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {/* Date */}
        <div className="text-xs text-gray-600">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 animate-fadeIn">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-red-700">{error}</p>
                <button
                  onClick={retryConnection}
                  className="text-xs text-red-600 hover:text-red-700 mt-1 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-xs text-gray-500 mt-2">Loading journal entry...</p>
          </div>
        )}
        
        {!loading && (
          readOnly ? (
            /* Read-only view */
            <div className="min-h-[60px]">
              {entry ? (
                <div className="text-sm text-gray-700 leading-relaxed">
                  {truncateText(entry)}
                  {entry.length > 150 && (
                    <button
                      onClick={() => window.location.href = '/?category=journal'}
                      className="text-blue-600 hover:text-blue-700 ml-2"
                    >
                      Read more
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <BookOpen className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                  <p className="text-xs mb-2">No journal entry for today</p>
                  <button
                    onClick={() => window.location.href = '/?category=journal'}
                    className="text-blue-600 hover:text-blue-700 text-xs"
                  >
                    Write your first entry
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Editable view */
            <>
              <textarea
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                placeholder="How was your day? What are you thinking about?"
                className="textarea h-24 resize-none"
                disabled={saving || loading}
              />
              
              <button
                onClick={saveEntry}
                disabled={saving || !entry.trim() || loading}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed micro-bounce"
              >
                <Save className="w-3 h-3 mr-1.5" />
                {saving ? 'Saving...' : 'Save Entry'}
              </button>
            </>
          )
        )}
      </div>
    </div>
  );
};

export default DailyJournal;