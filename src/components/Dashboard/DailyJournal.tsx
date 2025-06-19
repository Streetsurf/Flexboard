import React, { useState, useEffect } from 'react';
import { BookOpen, Save, Edit2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';

interface JournalEntry {
  id: string;
  content: string;
  date: string;
  user_id: string;
}

interface DailyJournalProps {
  readOnly?: boolean;
}

const DailyJournal: React.FC<DailyJournalProps> = ({ readOnly = false }) => {
  const [entry, setEntry] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (user) {
      fetchTodayEntry();
    }
  }, [user]);

  const fetchTodayEntry = async () => {
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user?.id)
        .eq('date', today);

      if (error) throw error;
      
      if (data && data.length > 0) {
        setEntry(data[0].content);
      } else {
        setEntry('');
      }
    } catch (error) {
      console.error('Error fetching journal entry:', error);
    }
  };

  const saveEntry = async () => {
    if (!entry.trim() || readOnly) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('journal_entries')
        .upsert({
          content: entry,
          date: today,
          user_id: user?.id,
        });

      if (error) throw error;
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving journal entry:', error);
    } finally {
      setSaving(false);
    }
  };

  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
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
        
        {readOnly ? (
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
              disabled={saving}
            />
            
            <button
              onClick={saveEntry}
              disabled={saving || !entry.trim()}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed micro-bounce"
            >
              <Save className="w-3 h-3 mr-1.5" />
              {saving ? 'Saving...' : 'Save Entry'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default DailyJournal;