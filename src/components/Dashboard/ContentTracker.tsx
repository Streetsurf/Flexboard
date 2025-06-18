import React, { useState, useEffect } from 'react';
import { Play, Plus, X, Edit2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface ContentItem {
  id: string;
  title: string;
  type: 'video' | 'article' | 'book' | 'podcast';
  status: 'watching' | 'completed' | 'planned';
  progress: number;
  user_id: string;
}

interface ContentTrackerProps {
  readOnly?: boolean;
}

const ContentTracker: React.FC<ContentTrackerProps> = ({ readOnly = false }) => {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchItems();
    }
  }, [user]);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('content_items')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(readOnly ? 5 : 50);

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching content items:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (id: string, progress: number) => {
    if (readOnly) return;
    
    try {
      const status = progress >= 100 ? 'completed' : 'watching';
      const { error } = await supabase
        .from('content_items')
        .update({ progress, status })
        .eq('id', id);

      if (error) throw error;
      setItems(items.map(item => 
        item.id === id ? { ...item, progress, status } : item
      ));
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const getTypeIcon = (type: ContentItem['type']) => {
    switch (type) {
      case 'video': return '🎥';
      case 'article': return '📄';
      case 'book': return '📚';
      case 'podcast': return '🎧';
      default: return '📄';
    }
  };

  const getStatusBadge = (status: ContentItem['status']) => {
    switch (status) {
      case 'completed': return 'badge badge-success';
      case 'watching': return 'badge badge-info';
      case 'planned': return 'badge badge-gray';
      default: return 'badge badge-gray';
    }
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
            <Play className="w-3 h-3 text-white" />
          </div>
          <h2 className="card-title">Content Tracker</h2>
        </div>
        {!readOnly ? (
          <button
            onClick={() => window.location.href = '/?category=content'}
            className="btn-icon-primary"
          >
            <Plus className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => window.location.href = '/?category=content'}
            className="btn-icon-secondary"
            title="Manage Content"
          >
            <Edit2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Content List */}
      <div className="space-y-2.5">
        {items.length === 0 ? (
          <div className="text-center py-6 text-gray-500 animate-fadeIn">
            <Play className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-xs mb-2">No content tracked yet</p>
            {!readOnly && (
              <button
                onClick={() => window.location.href = '/?category=content'}
                className="text-blue-600 hover:text-blue-700 text-xs"
              >
                Add some content
              </button>
            )}
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id}
              className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-all duration-200 hover-lift stagger-item"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                  <span className="text-base">{getTypeIcon(item.type)}</span>
                  <h3 className="font-medium text-gray-900 truncate text-xs">{item.title}</h3>
                </div>
                
                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  <span className={getStatusBadge(item.status)}>
                    {item.status}
                  </span>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="flex items-center space-x-2">
                <div className="flex-1 progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${item.progress}%` }}
                  ></div>
                </div>
                {!readOnly ? (
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={item.progress}
                    onChange={(e) => updateProgress(item.id, parseInt(e.target.value) || 0)}
                    className="w-12 px-1.5 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  />
                ) : (
                  <span className="text-xs text-gray-600 w-12 text-right">
                    {item.progress}%
                  </span>
                )}
                <span className="text-xs text-gray-500">%</span>
              </div>
            </div>
          ))
        )}
        
        {/* Show more link for read-only mode */}
        {readOnly && items.length >= 5 && (
          <div className="text-center py-2">
            <button 
              onClick={() => window.location.href = '/?category=content'}
              className="text-blue-600 hover:text-blue-700 text-xs"
            >
              View all content →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentTracker;