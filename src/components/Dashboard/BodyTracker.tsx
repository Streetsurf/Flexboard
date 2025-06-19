import React, { useState, useEffect, useRef } from 'react';
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
  Edit2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { triggerDataUpdate } from '../../hooks/useGlobalState';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import BodyTrackerDashboard from './BodyTrackerDashboard';

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

interface CalorieEntry {
  id: string;
  food_name: string;
  calories: number;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  description?: string;
  date: string;
  user_id: string;
}

interface WorkoutEntry {
  id: string;
  exercise_name: string;
  type: 'duration' | 'reps';
  duration_minutes?: number;
  repetitions?: number;
  calories_burned: number;
  date: string;
  user_id: string;
}

interface WeightEntry {
  id: string;
  weight: number;
  body_fat?: number;
  date: string;
  user_id: string;
}

interface SleepEntry {
  id: string;
  sleep_time: string;
  wake_time: string;
  duration_hours: number;
  date: string;
  user_id: string;
}

interface BodyTrackerProps {
  globalData?: {
    profile?: Profile;
    calorieEntries?: CalorieEntry[];
    workoutEntries?: WorkoutEntry[];
    weightEntries?: WeightEntry[];
    sleepEntries?: SleepEntry[];
  };
}

const BodyTracker: React.FC<BodyTrackerProps> = ({ globalData }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'progress' | 'calories' | 'workouts' | 'sleep'>('dashboard');
  const [profile, setProfile] = useState<Profile | null>(globalData?.profile || null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [profileForm, setProfileForm] = useState({
    age: '',
    height: '',
    activity_level: 'moderately_active',
    target_weight: '',
    target_calories: '',
    target_workouts_per_week: '3',
    avatar_url: '',
    full_name: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (globalData?.profile) {
      setProfile(globalData.profile);
      setProfileForm({
        age: globalData.profile.age?.toString() || '',
        height: globalData.profile.height?.toString() || '',
        activity_level: globalData.profile.activity_level || 'moderately_active',
        target_weight: globalData.profile.target_weight?.toString() || '',
        target_calories: globalData.profile.target_calories?.toString() || '',
        target_workouts_per_week: globalData.profile.target_workouts_per_week?.toString() || '3',
        avatar_url: globalData.profile.avatar_url || '',
        full_name: globalData.profile.full_name || ''
      });
    } else if (user) {
      fetchProfile();
    }
  }, [globalData?.profile, user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setProfile(data);
        setProfileForm({
          age: data.age?.toString() || '',
          height: data.height?.toString() || '',
          activity_level: data.activity_level || 'moderately_active',
          target_weight: data.target_weight?.toString() || '',
          target_calories: data.target_calories?.toString() || '',
          target_workouts_per_week: data.target_workouts_per_week?.toString() || '3',
          avatar_url: data.avatar_url || '',
          full_name: data.full_name || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors({ ...errors, avatar: 'Please select an image file' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors({ ...errors, avatar: 'Image must be smaller than 5MB' });
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.onload = () => {
        // Create canvas to resize image to 500x500
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 500;
        canvas.height = 500;
        
        if (ctx) {
          // Draw image scaled to fit 500x500 while maintaining aspect ratio
          const scale = Math.min(500 / img.width, 500 / img.height);
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;
          const x = (500 - scaledWidth) / 2;
          const y = (500 - scaledHeight) / 2;
          
          // Fill background with white
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 500, 500);
          
          // Draw the image
          ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
          
          // Convert to base64
          const resizedDataUrl = canvas.toDataURL('image/png', 0.9);
          setProfileForm({ ...profileForm, avatar_url: resizedDataUrl });
          setErrors({ ...errors, avatar: '' });
        }
        setUploading(false);
      };
      
      img.onerror = () => {
        setErrors({ ...errors, avatar: 'Invalid image file' });
        setUploading(false);
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      setErrors({ ...errors, avatar: 'Failed to read file' });
      setUploading(false);
    };
    
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const updateData: any = {
        age: profileForm.age ? parseInt(profileForm.age) : null,
        height: profileForm.height ? parseFloat(profileForm.height) : null,
        activity_level: profileForm.activity_level,
        target_weight: profileForm.target_weight ? parseFloat(profileForm.target_weight) : null,
        target_calories: profileForm.target_calories ? parseInt(profileForm.target_calories) : null,
        target_workouts_per_week: profileForm.target_workouts_per_week ? parseInt(profileForm.target_workouts_per_week) : 3,
        avatar_url: profileForm.avatar_url || null,
        full_name: profileForm.full_name || '',
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user?.id)
        .select()
        .single();

      if (error) throw error;
      
      setProfile(data);
      setIsEditingProfile(false);
      
      // Trigger global state updates
      triggerDataUpdate('profile');
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleCancelProfile = () => {
    if (profile) {
      setProfileForm({
        age: profile.age?.toString() || '',
        height: profile.height?.toString() || '',
        activity_level: profile.activity_level || 'moderately_active',
        target_weight: profile.target_weight?.toString() || '',
        target_calories: profile.target_calories?.toString() || '',
        target_workouts_per_week: profile.target_workouts_per_week?.toString() || '3',
        avatar_url: profile.avatar_url || '',
        full_name: profile.full_name || ''
      });
    }
    setIsEditingProfile(false);
    setErrors({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isValidImageUrl = (url: string): boolean => {
    return url && (url.startsWith('http') || url.startsWith('data:image/'));
  };

  const getActivityLevelLabel = (level: string) => {
    switch (level) {
      case 'sedentary': return 'Sedentary (Little/no exercise)';
      case 'lightly_active': return 'Lightly Active (Light exercise 1-3 days/week)';
      case 'moderately_active': return 'Moderately Active (Moderate exercise 3-5 days/week)';
      case 'very_active': return 'Very Active (Hard exercise 6-7 days/week)';
      case 'extremely_active': return 'Extremely Active (Very hard exercise, physical job)';
      default: return level;
    }
  };

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
        <BodyTrackerDashboard />
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Enhanced Profile Information Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-3xl border border-gray-200 shadow-lg">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full -translate-y-32 translate-x-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500 rounded-full translate-y-24 -translate-x-24"></div>
            </div>

            <div className="relative p-8">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8">
                <div className="flex items-center space-x-2 mb-4 lg:mb-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                    <Dumbbell className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Body Profile
                  </h2>
                </div>
                {!isEditingProfile && (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="btn-primary hover:shadow-lg transition-all duration-300"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Profile
                  </button>
                )}
              </div>

              {isEditingProfile ? (
                <form onSubmit={handleSaveProfile} className="space-y-8">
                  {/* Enhanced Logo Upload Section */}
                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50">
                    <label className="block text-lg font-semibold text-gray-800 mb-4">
                      Profile Photo
                    </label>
                    
                    <div className="flex flex-col lg:flex-row lg:items-center space-y-6 lg:space-y-0 lg:space-x-8">
                      {/* Photo Preview */}
                      <div className="relative group">
                        <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 border-4 border-white rounded-3xl flex items-center justify-center overflow-hidden shadow-xl">
                          {profileForm.avatar_url && isValidImageUrl(profileForm.avatar_url) ? (
                            <img
                              src={profileForm.avatar_url}
                              alt="Profile photo"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-12 h-12 text-gray-400" />
                          )}
                        </div>
                        
                        {/* Upload Overlay */}
                        <div className="absolute inset-0 bg-black/50 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                             onClick={() => fileInputRef.current?.click()}>
                          <Camera className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      
                      {/* Upload Controls */}
                      <div className="flex-1">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        
                        <div className="space-y-4">
                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploading}
                              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              {uploading ? 'Processing...' : 'Upload Photo'}
                            </button>
                            
                            {profileForm.avatar_url && (
                              <button
                                type="button"
                                onClick={() => setProfileForm({ ...profileForm, avatar_url: '' })}
                                className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors text-sm font-medium"
                              >
                                Remove Photo
                              </button>
                            )}
                          </div>
                          
                          {errors.avatar && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
                              {errors.avatar}
                            </div>
                          )}
                          
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                            <h4 className="font-medium text-blue-900 mb-2 text-sm">Upload Guidelines</h4>
                            <ul className="text-xs text-blue-700 space-y-1">
                              <li>• Supported formats: PNG, JPG, GIF</li>
                              <li>• Maximum size: 5MB</li>
                              <li>• Recommended: Square images (1:1 ratio)</li>
                              <li>• Auto-resized to 500x500px</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Basic Information */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={profileForm.full_name}
                        onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                        placeholder="Enter your full name"
                        className="input"
                      />
                    </div>

                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Age
                      </label>
                      <input
                        type="number"
                        min="10"
                        max="120"
                        value={profileForm.age}
                        onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })}
                        placeholder="Enter your age"
                        className="input"
                      />
                    </div>
                  </div>

                  {/* Physical Information */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Height (cm)
                      </label>
                      <input
                        type="number"
                        min="50"
                        max="300"
                        step="0.1"
                        value={profileForm.height}
                        onChange={(e) => setProfileForm({ ...profileForm, height: e.target.value })}
                        placeholder="Enter your height in cm"
                        className="input"
                      />
                    </div>

                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Activity Level
                      </label>
                      <select
                        value={profileForm.activity_level}
                        onChange={(e) => setProfileForm({ ...profileForm, activity_level: e.target.value })}
                        className="input"
                      >
                        <option value="sedentary">Sedentary</option>
                        <option value="lightly_active">Lightly Active</option>
                        <option value="moderately_active">Moderately Active</option>
                        <option value="very_active">Very Active</option>
                        <option value="extremely_active">Extremely Active</option>
                      </select>
                    </div>
                  </div>

                  {/* Goals */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Target Weight (kg)
                      </label>
                      <input
                        type="number"
                        min="20"
                        max="300"
                        step="0.1"
                        value={profileForm.target_weight}
                        onChange={(e) => setProfileForm({ ...profileForm, target_weight: e.target.value })}
                        placeholder="Target weight"
                        className="input"
                      />
                    </div>

                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Daily Calories Goal
                      </label>
                      <input
                        type="number"
                        min="800"
                        max="5000"
                        value={profileForm.target_calories}
                        onChange={(e) => setProfileForm({ ...profileForm, target_calories: e.target.value })}
                        placeholder="Daily calories"
                        className="input"
                      />
                    </div>

                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Weekly Workouts Goal
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="14"
                        value={profileForm.target_workouts_per_week}
                        onChange={(e) => setProfileForm({ ...profileForm, target_workouts_per_week: e.target.value })}
                        placeholder="Workouts per week"
                        className="input"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-white/50">
                    <button
                      type="submit"
                      disabled={uploading}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all duration-300"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Profile
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelProfile}
                      className="btn-secondary"
                      disabled={uploading}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-8">
                  {/* Enhanced Profile Display */}
                  <div className="flex flex-col lg:flex-row lg:items-center space-y-6 lg:space-y-0 lg:space-x-8">
                    <div className="relative">
                      <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 border-4 border-white rounded-3xl flex items-center justify-center overflow-hidden shadow-xl">
                        {profile?.avatar_url && isValidImageUrl(profile.avatar_url) ? (
                          <img
                            src={profile.avatar_url}
                            alt="Profile photo"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <User className={`w-12 h-12 text-gray-400 ${profile?.avatar_url && isValidImageUrl(profile.avatar_url) ? 'hidden' : ''}`} />
                      </div>
                      
                      {/* Status Indicator */}
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 border-4 border-white rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-3xl font-bold text-gray-900 mb-2">
                        {profile?.full_name || 'No name set'}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                        {profile?.age && (
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            {profile.age} years old
                          </div>
                        )}
                        {profile?.height && (
                          <div className="flex items-center">
                            <Scale className="w-4 h-4 mr-2" />
                            {profile.height} cm
                          </div>
                        )}
                      </div>
                      
                      {/* Profile Stats */}
                      <div className="flex flex-wrap gap-4">
                        {profile?.activity_level && (
                          <div className="flex items-center space-x-2 px-3 py-2 bg-white/70 rounded-xl border border-white/50">
                            <Activity className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium">{getActivityLevelLabel(profile.activity_level)}</span>
                          </div>
                        )}
                        {profile?.target_weight && (
                          <div className="flex items-center space-x-2 px-3 py-2 bg-white/70 rounded-xl border border-white/50">
                            <Target className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-medium">Target: {profile.target_weight}kg</span>
                          </div>
                        )}
                        {profile?.target_calories && (
                          <div className="flex items-center space-x-2 px-3 py-2 bg-white/70 rounded-xl border border-white/50">
                            <Flame className="w-4 h-4 text-orange-500" />
                            <span className="text-sm font-medium">{profile.target_calories} cal/day</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Goals Summary */}
                  {(profile?.target_weight || profile?.target_calories || profile?.target_workouts_per_week) && (
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50">
                      <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <Target className="w-5 h-5 mr-2 text-green-500" />
                        Your Goals
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {profile.target_weight && (
                          <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                            <Scale className="w-6 h-6 text-green-600 mx-auto mb-2" />
                            <div className="text-lg font-bold text-green-600">{profile.target_weight}kg</div>
                            <div className="text-sm text-green-700">Target Weight</div>
                          </div>
                        )}
                        {profile.target_calories && (
                          <div className="text-center p-4 bg-orange-50 rounded-xl border border-orange-200">
                            <Flame className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                            <div className="text-lg font-bold text-orange-600">{profile.target_calories}</div>
                            <div className="text-sm text-orange-700">Daily Calories</div>
                          </div>
                        )}
                        {profile.target_workouts_per_week && (
                          <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                            <Dumbbell className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                            <div className="text-lg font-bold text-blue-600">{profile.target_workouts_per_week}</div>
                            <div className="text-sm text-blue-700">Weekly Workouts</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Empty State */}
                  {!profile?.age && !profile?.height && !profile?.target_weight && (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Dumbbell className="w-10 h-10 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">Complete Your Body Profile</h3>
                      <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        Add your physical information and goals to get personalized tracking and insights.
                      </p>
                      <button
                        onClick={() => setIsEditingProfile(true)}
                        className="btn-primary hover:shadow-lg transition-all duration-300"
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Complete Profile
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Other tabs would go here */}
      {activeTab === 'progress' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Progress Tracking</h2>
          </div>
          <p className="text-gray-600">Progress tracking features coming soon...</p>
        </div>
      )}

      {activeTab === 'calories' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Calorie Tracking</h2>
          </div>
          <p className="text-gray-600">Calorie tracking features coming soon...</p>
        </div>
      )}

      {activeTab === 'workouts' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Workout Tracking</h2>
          </div>
          <p className="text-gray-600">Workout tracking features coming soon...</p>
        </div>
      )}

      {activeTab === 'sleep' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Sleep Tracking</h2>
          </div>
          <p className="text-gray-600">Sleep tracking features coming soon...</p>
        </div>
      )}
    </div>
  );
};

export default BodyTracker;