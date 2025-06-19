import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  selectedDate?: Date; // Tambah prop untuk tanggal yang dipilih
}

const DailyJournal: React.FC<DailyJournalProps> = ({ 
  readOnly = false, 
  selectedDate = new Date() 
}) => {
  const [allEntries, setAllEntries] = useState<JournalEntry[]>([]); // Cache semua entries
  const [entry, setEntry] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  // Memoize date string
  const dateStr = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);
  
  // Get entry untuk tanggal yang dipilih dari cache
  const currentEntry = useMemo(() => {
    return allEntries.find(e => e.date === dateStr);
  }, [allEntries, dateStr]);

  // Update entry state ketika currentEntry berubah
  useEffect(() => {
    setEntry(currentEntry?.content || '');
  }, [currentEntry]);

  // Fetch entries untuk range tanggal yang lebih luas
  const fetchEntriesRange = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Ambil data untuk 3 bulan ke depan dan belakang
      const startDate = new Date(selectedDate);
      startDate.setMonth(startDate.getMonth() - 3);
      const endDate = new Date(selectedDate);
      endDate.setMonth(endDate.getMonth() + 3);
      
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (error) throw error;
      setAllEntries(data || []);
    } catch (error) {
      console.error('Error fetching journal entries:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedDate]);

  // Fetch entry untuk tanggal spesifik jika belum ada di cache
  const fetchEntryForDate = useCallback(async (targetDate: string) => {
    if (!user?.id) return;
    
    // Cek apakah data untuk tanggal ini sudah ada di cache
    const existingEntry = allEntries.find(e => e.date === targetDate);
    if (existingEntry) return; // Sudah ada di cache
    
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', targetDate)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        // Tambahkan ke cache
        setAllEntries(prev => {
          const filtered = prev.filter(e => e.date !== targetDate);
          return [data, ...filtered].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
        });
      }
    } catch (error) {
      console.error('Error fetching journal entry for date:', error);
    }
  }, [user?.id, allEntries]);

  // Initial load
  useEffect(() => {
    if (user) {
      fetchEntriesRange();
    }
  }, [user, fetchEntriesRange]);

  // Load data untuk tanggal baru saat navigasi
  useEffect(() => {
    if (user && dateStr) {
      fetchEntryForDate(dateStr);
    }
  }, [user, dateStr, fetchEntryForDate]);

  const saveEntry = useCallback(async () => {
    if (!entry.trim() || readOnly || !user?.id) return;
    
    setSaving(true);
    try {
      const entryData = {
        content: entry.trim(),
        date: dateStr,
        user_id: user.id,
      };

      if (currentEntry) {
        // Update existing entry
        const { data, error } = await supabase
          .from('journal_entries')
          .update(entryData)
          .eq('id', currentEntry.id)
          .select()
          .single();

        if (error) throw error;
        
        // Update cache
        setAllEntries(prev => prev.map(e => 
          e.id === currentEntry.id ? data : e
        ));
      } else {
        // Create new entry
        const { data, error } = await supabase
          .from('journal_entries')
          .insert([entryData])
          .select()
          .single();

        if (error) throw error;
        
        // Add to cache
        setAllEntries(prev => [data, ...prev].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        ));
      }
      
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving journal entry:', error);
    } finally {
      setSaving(false);
    }
  }, [entry, readOnly, user?.id, dateStr, currentEntry]);

  const truncateText = useCallback((text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }, []);

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
          {format(selectedDate, 'EEEE, MMMM d, yyyy')}
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
                <p className="text-xs mb-2">No journal entry for this date</p>
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
              className="textarea h-24 resize-none transition-all duration-200"
              disabled={saving}
            />
            
            <button
              onClick={saveEntry}
              disabled={saving || !entry.trim()}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed micro-bounce transition-all duration-200"
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