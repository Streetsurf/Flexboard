import React, { useState, useEffect } from 'react';
import { User, Save, Settings, Target, Activity } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';

interface UserProfile {
  id: string;
  age?: number;
  gender: 'male' | 'female';
  height?: number;
  activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
  target_weight?: number;
  target_calories?: number;
  target_workouts_per_week: number;
}

interface ProfileFormProps {
  profile: UserProfile | null;
  onSave: () => void;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ profile, onSave }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    age: '',
    gender: 'male' as const,
    height: '',
    activity_level: 'moderately_active' as const,
    target_weight: '',
    target_calories: '',
    target_workouts_per_week: '3'
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        age: profile.age?.toString() || '',
        gender: profile.gender,
        height: profile.height?.toString() || '',
        activity_level: profile.activity_level,
        target_weight: profile.target_weight?.toString() || '',
        target_calories: profile.target_calories?.toString() || '',
        target_workouts_per_week: profile.target_workouts_per_week.toString()
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setLoading(true);
    try {
      const profileData = {
        id: user.id,
        age: formData.age ? parseInt(formData.age) : null,
        gender: formData.gender,
        height: formData.height ? parseFloat(formData.height) : null,
        activity_level: formData.activity_level,
        target_weight: formData.target_weight ? parseFloat(formData.target_weight) : null,
        target_calories: formData.target_calories ? parseInt(formData.target_calories) : null,
        target_workouts_per_week: parseInt(formData.target_workouts_per_week)
      };

      const { error } = await supabase
        .from('profiles')
        .upsert([profileData]);

      if (error) throw error;
      onSave();
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // BMR & TDEE Calculations for preview
  const calculateBMR = (): number => {
    const age = parseInt(formData.age);
    const height = parseFloat(formData.height);
    const weight = parseFloat(formData.target_weight);
    
    if (!age || !height || !weight) return 0;
    
    if (formData.gender === 'male') {
      return (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
      return (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }
  };

  const calculateTDEE = (bmr: number): number => {
    const activityMultipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extremely_active: 1.9
    };
    return bmr * activityMultipliers[formData.activity_level];
  };

  const bmr = calculateBMR();
  const tdee = calculateTDEE(bmr);

  const activityLabels = {
    sedentary: 'Tidak Aktif (Tidak olahraga)',
    lightly_active: 'Sedikit Aktif (Olahraga ringan 1-3 hari/minggu)',
    moderately_active: 'Cukup Aktif (Olahraga sedang 3-5 hari/minggu)',
    very_active: 'Sangat Aktif (Olahraga berat 6-7 hari/minggu)',
    extremely_active: 'Ekstrem Aktif (Olahraga sangat berat, 2x sehari)'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card animate-fadeIn">
        <div className="card-header">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <h2 className="card-title">Profile & Target</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Informasi Dasar
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Umur
                </label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                  className="input"
                  placeholder="25"
                  min="10"
                  max="120"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jenis Kelamin
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as any }))}
                  className="input"
                >
                  <option value="male">Laki-laki</option>
                  <option value="female">Perempuan</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tinggi Badan (cm)
                </label>
                <input
                  type="number"
                  value={formData.height}
                  onChange={(e) => setFormData(prev => ({ ...prev, height: e.target.value }))}
                  className="input"
                  placeholder="170"
                  min="50"
                  max="300"
                />
              </div>
            </div>
          </div>

          {/* Activity Level */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Level Aktivitas
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tingkat Aktivitas Harian
              </label>
              <select
                value={formData.activity_level}
                onChange={(e) => setFormData(prev => ({ ...prev, activity_level: e.target.value as any }))}
                className="input"
              >
                {Object.entries(activityLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Targets */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Target & Goals
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Berat Badan (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.target_weight}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_weight: e.target.value }))}
                  className="input"
                  placeholder="65"
                  min="20"
                  max="300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Kalori Harian
                </label>
                <input
                  type="number"
                  value={formData.target_calories}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_calories: e.target.value }))}
                  className="input"
                  placeholder="2000"
                  min="800"
                  max="5000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Workout per Minggu
                </label>
                <input
                  type="number"
                  value={formData.target_workouts_per_week}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_workouts_per_week: e.target.value }))}
                  className="input"
                  placeholder="3"
                  min="0"
                  max="14"
                />
              </div>
            </div>
          </div>

          {/* Calculations Preview */}
          {bmr > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <h4 className="font-medium text-blue-900 mb-3">Kalkulasi Metabolisme</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">BMR (Basal Metabolic Rate):</span>
                  <span className="font-medium text-blue-900 ml-2">{Math.round(bmr)} kalori/hari</span>
                </div>
                <div>
                  <span className="text-blue-700">TDEE (Total Daily Energy Expenditure):</span>
                  <span className="font-medium text-blue-900 ml-2">{Math.round(tdee)} kalori/hari</span>
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                TDEE adalah perkiraan kalori yang kamu bakar per hari berdasarkan aktivitas. 
                Untuk menurunkan berat badan, konsumsi kalori di bawah TDEE.
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Simpan Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileForm;