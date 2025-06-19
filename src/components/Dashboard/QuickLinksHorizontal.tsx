import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, Plus, ExternalLink, ChevronLeft, ChevronRight, Smartphone, Globe, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase, testSupabaseConnection } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface QuickLink {
  id: string;
  title: string;
  url: string;
  icon?: string;
  user_id: string;
  order_index?: number;
  open_in_app?: boolean;
}

const QuickLinksHorizontal: React.FC = () => {
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Enhanced error handling function
  const handleError = useCallback((error: any, context: string) => {
    console.error(`Error in ${context}:`, error);
    
    let errorMessage = `Failed to ${context.toLowerCase()}`;
    
    if (error.name === 'AbortError') {
      errorMessage = 'Request timed out. Please check your internet connection.';
    } else if (error.message?.includes('Failed to fetch')) {
      errorMessage = 'Unable to connect to the server. Please check your internet connection.';
    } else if (error.message?.includes('NetworkError')) {
      errorMessage = 'Network error. Please check your internet connection.';
    } else if (error.code) {
      errorMessage = `Database error: ${error.message}`;
    }
    
    setError(errorMessage);
  }, []);

  // Memoize fetch function to prevent unnecessary re-renders
  const fetchLinks = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Optimized query with minimal data
      const { data, error } = await supabase
        .from('quick_links')
        .select('id, title, url, icon, open_in_app')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(10);

      if (error) {
        throw error;
      }
      
      setLinks(data || []);
    } catch (error: any) {
      handleError(error, 'fetch quick links');
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, handleError]);

  // Retry function
  const retryConnection = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRetryCount(prev => prev + 1);
    
    // Test connection first
    const isConnected = await testSupabaseConnection();
    if (!isConnected) {
      setError('Unable to connect to the database. Please check your internet connection.');
      setLoading(false);
      return;
    }
    
    await fetchLinks();
  }, [fetchLinks]);

  // Use effect with dependency array to prevent unnecessary calls
  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  // Memoize scroll check function
  const checkScrollability = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  }, []);

  useEffect(() => {
    checkScrollability();
  }, [links, checkScrollability]);

  const scroll = useCallback((direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 150;
    const newScrollLeft = direction === 'left' 
      ? container.scrollLeft - scrollAmount
      : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  }, []);

  // Memoize utility functions
  const getDomainFromUrl = useCallback((url: string): string => {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return url;
    }
  }, []);

  const isValidImageUrl = useCallback((url: string): boolean => {
    return url && (url.startsWith('http') || url.startsWith('data:image/'));
  }, []);

  const getAppUrl = useCallback((url: string, domain: string): string => {
    const appSchemes: { [key: string]: string } = {
      'youtube.com': url.replace('https://www.youtube.com', 'youtube://').replace('https://youtube.com', 'youtube://'),
      'youtu.be': url.replace('https://youtu.be/', 'youtube://watch?v='),
      'instagram.com': url.replace('https://www.instagram.com', 'instagram://').replace('https://instagram.com', 'instagram://'),
      'twitter.com': url.replace('https://twitter.com', 'twitter://').replace('https://www.twitter.com', 'twitter://'),
      'x.com': url.replace('https://x.com', 'twitter://').replace('https://www.x.com', 'twitter://'),
    };

    return appSchemes[domain] || url;
  }, []);

  // Optimized loading state
  if (loading) {
    return (
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="w-12 h-12 bg-gray-100 rounded-lg animate-pulse flex-shrink-0"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-3">
        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-2">
          <AlertCircle className="w-5 h-5 text-red-400" />
        </div>
        <p className="text-xs text-red-600 mb-2">{error}</p>
        <div className="space-y-1">
          <button 
            onClick={retryConnection}
            className="text-xs text-blue-600 hover:text-blue-700 inline-flex items-center space-x-1"
            disabled={loading}
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Retry</span>
          </button>
          {retryCount > 0 && (
            <p className="text-xs text-gray-400">Attempt: {retryCount}</p>
          )}
        </div>
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div className="text-center py-3">
        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-2">
          <Link className="w-5 h-5 text-gray-400" />
        </div>
        <p className="text-xs text-gray-500">No quick links yet</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Scroll indicators */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-all duration-200"
        >
          <ChevronLeft className="w-3 h-3 text-gray-600" />
        </button>
      )}

      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-all duration-200"
        >
          <ChevronRight className="w-3 h-3 text-gray-600" />
        </button>
      )}

      {/* Scrollable container */}
      <div 
        ref={scrollContainerRef}
        className="flex space-x-2.5 overflow-x-auto pb-2 scrollbar-hide"
        onScroll={checkScrollability}
        style={{ 
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {links.map((link, index) => {
          const hasCustomLogo = isValidImageUrl(link.icon || '');
          const domain = getDomainFromUrl(link.url);
          const finalUrl = link.open_in_app ? getAppUrl(link.url, domain) : link.url;
          
          return (
            <a
              key={link.id}
              href={finalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center flex-shrink-0 relative hover-lift"
              title={link.title || getDomainFromUrl(link.url)}
              style={{ scrollSnapAlign: 'start' }}
            >
              <div className="w-12 h-12 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:border-gray-300 hover:shadow-sm transition-all duration-200 mb-1.5 relative">
                {hasCustomLogo ? (
                  <img
                    src={link.icon}
                    alt={link.title || 'Logo'}
                    className="w-10 h-10 object-cover rounded"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <ExternalLink className={`w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors duration-200 ${hasCustomLogo ? 'hidden' : ''}`} />
                
                {/* App/Browser indicator */}
                <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-white border border-gray-200 rounded-full flex items-center justify-center">
                  {link.open_in_app ? (
                    <Smartphone className="w-2 h-2 text-blue-600" />
                  ) : (
                    <Globe className="w-2 h-2 text-gray-600" />
                  )}
                </div>
              </div>
              <span className="text-xs text-gray-600 group-hover:text-gray-900 text-center truncate max-w-[48px] leading-tight">
                {link.title || getDomainFromUrl(link.url)}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
};

export default QuickLinksHorizontal;