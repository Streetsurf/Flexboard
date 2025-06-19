import React, { useState, useEffect } from 'react';
import { 
  Dumbbell, 
  Plus, 
  Save, 
  X, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Target, 
  Award,
  Flame,
  Heart,
  Scale,
  Clock,
  Upload,
  Image,
  Camera,
  User,
  Edit2,
  Utensils,
  Moon,
  BarChart3
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';

interface Profile {
  id: string;
  age?: number;
  height?: number;
  activity_level?: string;
  target_weight?: number;
  target_calories?: number;
  target_workouts_per_week?: number;
  avatar_url?: string;
  full_name?: string;
}

const BodyTracker: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'progress' | 'calories' | 'workouts' | 'sleep'>('dashboard');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card animate-fadeIn">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="tab-nav">
        <nav className="flex space-x-6 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <Activity className="w-4 h-4" /> },
            { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
            { id: 'progress', label: 'Progress', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'calories', label: 'Calories', icon: <Flame className="w-4 h-4" /> },
            { id: 'workouts', label: 'Workouts', icon: <Dumbbell className="w-4 h-4" /> },
            { id: 'sleep', label: 'Sleep', icon: <Heart className="w-4 h-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`tab-nav-item flex items-center space-x-2 whitespace-nowrap ${
                activeTab === tab.id ? 'active' : ''
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="card animate-fadeIn">
          <div className="card-header">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <h2 className="card-title">Body Tracker Dashboard</h2>
            </div>
          </div>
          
          <div className="text-center py-8 text-gray-500">
            <Dumbbell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">Body tracking dashboard coming soon...</p>
            <p className="text-xs text-gray-400">Track your fitness journey and health goals</p>
          </div>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card animate-fadeIn">
          <div className="card-header">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <h2 className="card-title">Body Profile</h2>
            </div>
          </div>
          
          <div className="text-center py-8 text-gray-500">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">Profile management coming soon...</p>
            <p className="text-xs text-gray-400">Set your physical information and goals</p>
          </div>
        </div>
      )}

      {/* Progress Tab */}
      {activeTab === 'progress' && (
        <div className="card animate-fadeIn">
          <div className="card-header">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <h2 className="card-title">Progress Tracking</h2>
            </div>
          </div>
          
          <div className="text-center py-8 text-gray-500">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">Progress tracking coming soon...</p>
            <p className="text-xs text-gray-400">Monitor your weight and body composition changes</p>
          </div>
        </div>
      )}

      {/* Calories Tab */}
      {activeTab === 'calories' && (
        <div className="card animate-fadeIn">
          <div className="card-header">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <Flame className="w-4 h-4 text-white" />
              </div>
              <h2 className="card-title">Calorie Tracking</h2>
            </div>
          </div>
          
          <div className="text-center py-8 text-gray-500">
            <Flame className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">Calorie tracking coming soon...</p>
            <p className="text-xs text-gray-400">Track your daily food intake and calories</p>
          </div>
        </div>
      )}

      {/* Workouts Tab */}
      {activeTab === 'workouts' && (
        <div className="card animate-fadeIn">
          <div className="card-header">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Dumbbell className="w-4 h-4 text-white" />
              </div>
              <h2 className="card-title">Workout Tracking</h2>
            </div>
          </div>
          
          <div className="text-center py-8 text-gray-500">
            <Dumbbell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">Workout tracking coming soon...</p>
            <p className="text-xs text-gray-400">Log your exercises and track your fitness progress</p>
          </div>
        </div>
      )}

      {/* Sleep Tab */}
      {activeTab === 'sleep' && (
        <div className="card animate-fadeIn">
          <div className="card-header">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                <Heart className="w-4 h-4 text-white" />
              </div>
              <h2 className="card-title">Sleep Tracking</h2>
            </div>
          </div>
          
          <div className="text-center py-8 text-gray-500">
            <Heart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">Sleep tracking coming soon...</p>
            <p className="text-xs text-gray-400">Monitor your sleep patterns and quality</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BodyTracker;