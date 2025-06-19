import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, User, LayoutDashboard, BarChart3, Search } from 'lucide-react';

interface DashboardHeaderProps {
  onUserClick?: () => void;
  onAnalyticsClick?: () => void;
  isProfileActive?: boolean;
  isAnalyticsActive?: boolean;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ 
  onUserClick, 
  onAnalyticsClick,
  isProfileActive = false,
  isAnalyticsActive = false 
}) => {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50 animate-slideDown">
      <div className="max-w-7xl mx-auto px-3 lg:px-4">
        <div className="flex justify-between items-center h-12">
          {/* Logo */}
          <div className="flex items-center space-x-2 animate-slideIn">
            <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center hover-scale">
              <LayoutDashboard className="w-3 h-3 text-white" />
            </div>
            <h1 className="text-base font-semibold text-gray-900">FlexBoard</h1>
          </div>
          
          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-xs mx-4 animate-fadeIn">
            <div className="relative w-full">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
              <input
                type="text"
                placeholder="Search..."
                className="search-input"
              />
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center space-x-1 animate-slideIn">
            {/* Analytics */}
            <button
              onClick={onAnalyticsClick}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 hover-scale ${
                isAnalyticsActive 
                  ? 'bg-blue-50 text-blue-700 hover-glow' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              title="Analytics"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            
            {/* Profile */}
            <button
              onClick={onUserClick}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 hover-scale ${
                isProfileActive 
                  ? 'bg-blue-50 text-blue-700 hover-glow' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              title={isProfileActive ? 'Back to Dashboard' : 'Profile'}
            >
              {isProfileActive ? (
                <LayoutDashboard className="w-4 h-4" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </button>
            
            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-1.5 px-2 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 hover-lift"
            >
              <LogOut className="w-3 h-3" />
              <span className="hidden sm:block">Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;