import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Calendar, Save, Edit2, X, Download, Upload, Image, Camera, Star, Award, Target, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { triggerDataUpdate } from '../../hooks/useGlobalState';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  created_at: string;
  updated_at: string;
}

interface UserProfileProps {
  onProfileUpdate?: () => void;
  globalData?: UserProfile;
}

const UserProfile: React.FC<UserProfileProps> = ({ onProfileUpdate, globalData }) => {
  const [profile, setProfile] = useState<UserProfile | null>(globalData || null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(!globalData);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'billing' | 'password'>('general');
  const [editForm, setEditForm] = useState({
    full_name: '',
    bio: '',
    avatar_url: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (globalData) {
      setProfile(globalData);
      setEditForm({
        full_name: globalData.full_name || '',
        bio: globalData.bio || '',
        avatar_url: globalData.avatar_url || ''
      });
      setLoading(false);
    } else if (user) {
      fetchProfile();
    }
  }, [globalData, user]);

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
        setEditForm({
          full_name: data.full_name || '',
          bio: data.bio || '',
          avatar_url: data.avatar_url || ''
        });
      } else {
        const defaultProfile = {
          id: user?.id,
          email: user?.email || '',
          full_name: '',
          bio: '',
          avatar_url: ''
        };
        
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .upsert([defaultProfile])
          .select()
          .single();

        if (createError) throw createError;
        setProfile(newProfile);
        setEditForm({
          full_name: '',
          bio: '',
          avatar_url: ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
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
          setEditForm({ ...editForm, avatar_url: resizedDataUrl });
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          bio: editForm.bio,
          avatar_url: editForm.avatar_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id)
        .select()
        .single();

      if (error) throw error;
      
      setProfile(data);
      setIsEditing(false);
      
      // Trigger global state updates
      window.dispatchEvent(new CustomEvent('profileUpdated'));
      triggerDataUpdate('profile');
      
      if (onProfileUpdate) {
        onProfileUpdate();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditForm({
      full_name: profile?.full_name || '',
      bio: profile?.bio || '',
      avatar_url: profile?.avatar_url || ''
    });
    setIsEditing(false);
    setErrors({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isValidImageUrl = (url: string): boolean => {
    return url && (url.startsWith('http') || url.startsWith('data:image/'));
  };

  // Mock data for demonstration
  const mockData = [
    { id: 1, name: 'Profile Export', date: '2024-01-15', size: '2.4 MB', status: 'completed' },
    { id: 2, name: 'Task History', date: '2024-01-10', size: '1.8 MB', status: 'completed' },
    { id: 3, name: 'Analytics Report', date: '2024-01-05', size: '3.2 MB', status: 'processing' },
    { id: 4, name: 'Journal Backup', date: '2024-01-01', size: '5.1 MB', status: 'failed' }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return 'badge badge-success';
      case 'processing': return 'badge badge-warning';
      case 'failed': return 'bg-red-50 text-red-700 border border-red-200';
      default: return 'badge badge-gray';
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="card animate-fadeIn">
          <div className="animate-pulse">
            <div className="flex items-center space-x-4 mb-5">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-100 rounded w-32"></div>
                <div className="h-3 bg-gray-100 rounded w-24"></div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-3 bg-gray-100 rounded"></div>
              <div className="h-3 bg-gray-100 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="breadcrumbs">
        <span>Settings</span>
        <span className="breadcrumb-separator">/</span>
        <span className="text-gray-900 font-medium">Profile</span>
      </nav>

      {/* Tab Navigation */}
      <div className="tab-nav">
        <nav className="flex space-x-6">
          {[
            { id: 'general', label: 'General' },
            { id: 'billing', label: 'Billing' },
            { id: 'password', label: 'Password' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`tab-nav-item ${
                activeTab === tab.id ? 'active' : ''
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
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
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Profile Information
                  </h2>
                </div>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn-primary hover:shadow-lg transition-all duration-300"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Profile
                  </button>
                )}
              </div>

              {isEditing ? (
                <form onSubmit={handleSave} className="space-y-8">
                  {/* Enhanced Logo Upload Section */}
                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50">
                    <label className="block text-lg font-semibold text-gray-800 mb-4">
                      Profile Logo
                    </label>
                    
                    <div className="flex flex-col lg:flex-row lg:items-center space-y-6 lg:space-y-0 lg:space-x-8">
                      {/* Logo Preview */}
                      <div className="relative group">
                        <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 border-4 border-white rounded-3xl flex items-center justify-center overflow-hidden shadow-xl">
                          {editForm.avatar_url && isValidImageUrl(editForm.avatar_url) ? (
                            <img
                              src={editForm.avatar_url}
                              alt="Profile logo"
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
                              {uploading ? 'Processing...' : 'Upload Logo'}
                            </button>
                            
                            {editForm.avatar_url && (
                              <button
                                type="button"
                                onClick={() => setEditForm({ ...editForm, avatar_url: '' })}
                                className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors text-sm font-medium"
                              >
                                Remove Logo
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

                  {/* Enhanced Form Fields */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={editForm.full_name}
                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                        placeholder="Enter your full name"
                        className="input"
                      />
                    </div>

                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={profile?.email || ''}
                        disabled
                        className="input opacity-50 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Email cannot be changed
                      </p>
                    </div>
                  </div>

                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Bio
                    </label>
                    <textarea
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      placeholder="Tell us about yourself..."
                      rows={4}
                      className="textarea"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-white/50">
                    <button
                      type="submit"
                      disabled={saving || uploading}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all duration-300"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="btn-secondary"
                      disabled={saving || uploading}
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
                            alt="Profile logo"
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
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 mr-2" />
                          {profile?.email}
                        </div>
                        {profile?.created_at && (
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            Member since {new Date(profile.created_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      
                      {/* Profile Stats */}
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center space-x-2 px-3 py-2 bg-white/70 rounded-xl border border-white/50">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm font-medium">Pro Member</span>
                        </div>
                        <div className="flex items-center space-x-2 px-3 py-2 bg-white/70 rounded-xl border border-white/50">
                          <Award className="w-4 h-4 text-purple-500" />
                          <span className="text-sm font-medium">5 Achievements</span>
                        </div>
                        <div className="flex items-center space-x-2 px-3 py-2 bg-white/70 rounded-xl border border-white/50">
                          <Target className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-medium">12 Goals</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bio Section */}
                  {profile?.bio && (
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50">
                      <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                        <User className="w-5 h-5 mr-2 text-blue-500" />
                        About
                      </h4>
                      <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
                    </div>
                  )}

                  {/* Empty State */}
                  {!profile?.bio && !profile?.full_name && (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <User className="w-10 h-10 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">Complete Your Profile</h3>
                      <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        Add your personal information to make your FlexBoard experience more personalized.
                      </p>
                      <button
                        onClick={() => setIsEditing(true)}
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

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="space-y-5">
          {/* Current Plan */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h2 className="card-title">Current Plan</h2>
              <button className="btn-primary">Upgrade Plan</button>
            </div>
            
            <div className="grid-3">
              <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
                <h3 className="font-semibold text-blue-900 text-sm">Free Plan</h3>
                <p className="text-xl font-bold text-blue-600 mt-2">$0<span className="text-sm font-normal">/month</span></p>
                <ul className="text-sm text-blue-700 mt-3 space-y-1">
                  <li>• Basic task management</li>
                  <li>• Up to 100 tasks</li>
                  <li>• Basic analytics</li>
                </ul>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
                <h3 className="font-semibold text-gray-900 text-sm">Pro Plan</h3>
                <p className="text-xl font-bold text-gray-600 mt-2">$9<span className="text-sm font-normal">/month</span></p>
                <ul className="text-sm text-gray-600 mt-3 space-y-1">
                  <li>• Unlimited tasks</li>
                  <li>• Advanced analytics</li>
                  <li>• Priority support</li>
                </ul>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
                <h3 className="font-semibold text-gray-900 text-sm">Team Plan</h3>
                <p className="text-xl font-bold text-gray-600 mt-2">$19<span className="text-sm font-normal">/month</span></p>
                <ul className="text-sm text-gray-600 mt-3 space-y-1">
                  <li>• Everything in Pro</li>
                  <li>• Team collaboration</li>
                  <li>• Admin controls</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Billing History */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h2 className="card-title">Billing History</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th className="px-4">Description</th>
                    <th className="px-4">Amount</th>
                    <th className="px-4">Status</th>
                    <th className="text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Jan 15, 2024</td>
                    <td className="px-4 text-gray-600">Pro Plan - Monthly</td>
                    <td className="px-4 font-medium">$9.00</td>
                    <td className="px-4">
                      <span className="badge badge-success">Paid</span>
                    </td>
                    <td className="text-right">
                      <button className="text-blue-600 hover:text-blue-700 text-sm">
                        Download
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td>Dec 15, 2023</td>
                    <td className="px-4 text-gray-600">Pro Plan - Monthly</td>
                    <td className="px-4 font-medium">$9.00</td>
                    <td className="px-4">
                      <span className="badge badge-success">Paid</span>
                    </td>
                    <td className="text-right">
                      <button className="text-blue-600 hover:text-blue-700 text-sm">
                        Download
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <div className="space-y-5">
          {/* Change Password */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h2 className="card-title">Change Password</h2>
            </div>
            
            <form className="space-y-4 max-w-sm">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  className="input"
                  placeholder="Enter current password"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  className="input"
                  placeholder="Enter new password"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  className="input"
                  placeholder="Confirm new password"
                />
              </div>
              
              <button type="submit" className="btn-primary">
                Update Password
              </button>
            </form>
          </div>

          {/* Data Export */}
          <div className="card animate-fadeIn">
            <div className="card-header">
              <h2 className="card-title">Data Export</h2>
              <button className="btn-secondary">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export Data
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Export</th>
                    <th className="px-4">Date</th>
                    <th className="px-4">Size</th>
                    <th className="px-4">Status</th>
                    <th className="text-right">Download</th>
                  </tr>
                </thead>
                <tbody>
                  {mockData.map((item) => (
                    <tr key={item.id}>
                      <td className="font-medium">{item.name}</td>
                      <td className="px-4 text-gray-600">{item.date}</td>
                      <td className="px-4 text-gray-600">{item.size}</td>
                      <td className="px-4">
                        <span className={`badge ${getStatusBadge(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="text-right">
                        {item.status === 'completed' ? (
                          <button className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors duration-150">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Account Statistics */}
      <div className="card animate-fadeIn">
        <div className="card-header">
          <h2 className="card-title">Account Statistics</h2>
        </div>
        
        <div className="grid-4">
          <div className="stat-card">
            <div className="stat-value text-blue-600">0</div>
            <div className="stat-label">Total Tasks</div>
          </div>
          <div className="stat-card">
            <div className="stat-value text-green-600">0</div>
            <div className="stat-label">Completed Goals</div>
          </div>
          <div className="stat-card">
            <div className="stat-value text-purple-600">0</div>
            <div className="stat-label">Journal Entries</div>
          </div>
          <div className="stat-card">
            <div className="stat-value text-orange-600">0</div>
            <div className="stat-label">Quick Links</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;