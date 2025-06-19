import React, { useState, useEffect } from 'react';
import { User, Mail, Calendar, Save, Edit2, X, Download } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'general' | 'billing' | 'password'>('general');
  const [editForm, setEditForm] = useState({
    full_name: '',
    bio: '',
    avatar_url: ''
  });
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
              <div className="w-16 h-16 bg-gray-100 rounded-full"></div>
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
    <div className="space-y-5">
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
        <div className="card animate-fadeIn">
          <div className="card-header">
            <h2 className="card-title">Profile Information</h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="btn-secondary"
              >
                <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                Edit Profile
              </button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-5">
              {/* Avatar Section */}
              <div className="flex items-center space-x-5">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                  {editForm.avatar_url ? (
                    <img
                      src={editForm.avatar_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <User className={`w-6 h-6 text-gray-400 ${editForm.avatar_url ? 'hidden' : ''}`} />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Avatar URL
                  </label>
                  <input
                    type="url"
                    value={editForm.avatar_url}
                    onChange={(e) => setEditForm({ ...editForm, avatar_url: e.target.value })}
                    placeholder="https://example.com/avatar.jpg"
                    className="input"
                  />
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="input opacity-50 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Email cannot be changed
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Bio
                </label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  rows={3}
                  className="textarea"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn-secondary"
                >
                  <X className="w-3.5 h-3.5 mr-1.5" />
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              {/* Profile Display */}
              <div className="flex items-center space-x-5">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <User className={`w-6 h-6 text-gray-400 ${profile?.avatar_url ? 'hidden' : ''}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {profile?.full_name || 'No name set'}
                  </h3>
                  <p className="text-gray-600 flex items-center mt-1 text-sm">
                    <Mail className="w-3.5 h-3.5 mr-1.5" />
                    {profile?.email}
                  </p>
                  {profile?.created_at && (
                    <p className="text-xs text-gray-500 flex items-center mt-1">
                      <Calendar className="w-3.5 h-3.5 mr-1.5" />
                      Member since {new Date(profile.created_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Bio */}
              {profile?.bio && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">About</h4>
                  <p className="text-gray-600 leading-relaxed text-sm">{profile.bio}</p>
                </div>
              )}

              {!profile?.bio && !profile?.full_name && (
                <div className="text-center py-8">
                  <User className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4 text-sm">Your profile is incomplete</p>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn-primary"
                  >
                    Complete your profile
                  </button>
                </div>
              )}
            </div>
          )}
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