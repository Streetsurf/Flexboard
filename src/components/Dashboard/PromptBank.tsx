import React, { useState, useEffect } from 'react';
import { Lightbulb, Plus, X, Copy, Edit2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface Prompt {
  id: string;
  title: string;
  content: string;
  category: string;
  user_id: string;
}

interface PromptBankProps {
  readOnly?: boolean;
}

const PromptBank: React.FC<PromptBankProps> = ({ readOnly = false }) => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchPrompts();
    }
  }, [user]);

  const fetchPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(readOnly ? 3 : 50);

      if (error) throw error;
      setPrompts(data || []);
    } catch (error) {
      console.error('Error fetching prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'work': return 'badge badge-info';
      case 'creative': return 'badge bg-purple-100 text-purple-800';
      case 'learning': return 'badge badge-success';
      case 'personal': return 'badge bg-pink-100 text-pink-800';
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
            <Lightbulb className="w-3 h-3 text-white" />
          </div>
          <h2 className="card-title">Prompt Bank</h2>
        </div>
        {!readOnly ? (
          <button
            onClick={() => window.location.href = '/?category=prompts'}
            className="btn-icon-primary"
          >
            <Plus className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => window.location.href = '/?category=prompts'}
            className="btn-icon-secondary"
            title="Manage Prompts"
          >
            <Edit2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Prompts List */}
      <div className="space-y-2.5 max-h-80 overflow-y-auto">
        {prompts.length === 0 ? (
          <div className="text-center py-6 text-gray-500 animate-fadeIn">
            <Lightbulb className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-xs mb-2">No prompts yet</p>
            {!readOnly && (
              <button
                onClick={() => window.location.href = '/?category=prompts'}
                className="text-blue-600 hover:text-blue-700 text-xs"
              >
                Add some prompts
              </button>
            )}
          </div>
        ) : (
          prompts.map((prompt, index) => (
            <div
              key={prompt.id}
              className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-all duration-200 hover-lift stagger-item"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center space-x-1.5 min-w-0 flex-1">
                  <h3 className="font-medium text-gray-900 truncate text-xs">{prompt.title}</h3>
                  <span className={getCategoryBadge(prompt.category)}>
                    {prompt.category}
                  </span>
                </div>
                
                <div className="flex items-center space-x-0.5 flex-shrink-0">
                  <button
                    onClick={() => copyToClipboard(prompt.content, prompt.id)}
                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all duration-200 hover-scale"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
              
              <p className="text-xs text-gray-600 leading-relaxed">
                {readOnly && prompt.content.length > 100 
                  ? `${prompt.content.substring(0, 100)}...`
                  : prompt.content
                }
              </p>
              
              {copiedId === prompt.id && (
                <p className="text-xs text-green-600 mt-1.5 animate-fadeIn">Copied to clipboard!</p>
              )}
            </div>
          ))
        )}
        
        {/* Show more link for read-only mode */}
        {readOnly && prompts.length >= 3 && (
          <div className="text-center py-2">
            <button 
              onClick={() => window.location.href = '/?category=prompts'}
              className="text-blue-600 hover:text-blue-700 text-xs"
            >
              View all prompts →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptBank;