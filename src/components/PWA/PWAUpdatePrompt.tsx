import React, { useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';

const PWAUpdatePrompt: React.FC = () => {
  const { isUpdateAvailable, updateApp } = usePWA();
  const [isVisible, setIsVisible] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isUpdateAvailable || !isVisible) {
    return null;
  }

  const handleUpdate = () => {
    setIsUpdating(true);
    updateApp();
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 z-50 animate-slide-down">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
          <RefreshCw className="w-4 h-4 text-green-600" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-green-900 mb-1">
            Update Available
          </h3>
          <p className="text-xs text-green-700 mb-3">
            A new version of FlexBoard is available with improvements and bug fixes.
          </p>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isUpdating ? 'animate-spin' : ''}`} />
              <span>{isUpdating ? 'Updating...' : 'Update Now'}</span>
            </button>
            
            <button
              onClick={handleDismiss}
              className="px-3 py-2 text-xs text-green-700 hover:text-green-900 transition-colors"
            >
              Later
            </button>
          </div>
        </div>
        
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 text-green-400 hover:text-green-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PWAUpdatePrompt;