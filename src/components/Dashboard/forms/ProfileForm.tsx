import React, { useState, useEffect, useRef } from 'react';
import { User, Save, Settings, Target, Activity, Scale } from 'lucide-react';
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
  const [saving, setSaving] = useState(false);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Flag to prevent form reset after successful submit
  const hasSubmittedRef = useRef(false);
  const isFirstRenderRef = useRef(true);
  
  const [formData, setFormData] = useState({
    age: '',
    gender: 'male' as const,
    height: '',
    activity_level: 'moderately_active' as const,
    target_weight: '',
    target_calories: '',
    target_workouts_per_week: '3'
  });

  // Load profile data into form ONLY on first render or when profile changes from null to data
  useEffect(() => {
    console.log('Profile effect triggered:', { 
      profile, 
      hasSubmitted: hasSubmittedRef.current, 
      isFirstRender: isFirstRenderRef.current 
    });
    
    // Only update form data if:
    // 1. It's the first render, OR
    // 2. We haven't submitted yet, OR
    // 3. Profile was null and now has data (initial load)
    const shouldUpdateForm = isFirstRenderRef.current || 
                            !hasSubmittedRef.current || 
                            (profile && !formData.age && !formData.height);
    
    if (profile && shouldUpdateForm) {
      console.log('Updating form data from profile:', profile);
      setFormData({
        age: profile.age ? profile.age.toString() : '',
        gender: profile.gender || 'male',
        height: profile.height ? profile.height.toString() : '',
        activity_level: profile.activity_level || 'moderately_active',
        target_weight: profile.target_weight ? profile.target_weight.toString() : '',
        target_calories: profile.target_calories ? profile.target_calories.toString() : '',
        target_workouts_per_week: profile.target_workouts_per_week ? profile.target_workouts_per_week.toString() : '3'
      });
    }
    
    // Mark that first render is complete
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
    }
  }, [profile]); // Keep dependency but use flags to control when to update

  // Fetch current weight from latest weight entry
  useEffect(() => {
    const fetchCurrentWeight = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('weight_entries')
          .select('weight')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        if (data) {
          setCurrentWeight(data.weight);
          console.log('Current weight loaded:', data.weight);
        }
      } catch (error) {
        console.error('Error fetching current weight:', error);
      }
    };

    fetchCurrentWeight();
  }, [user?.id]);

  // Save profile function with state refresh - FIXED VERSION
  const saveProfile = async () => {
    if (!user?.id) {
      console.error('No user ID found');
      setSaveError('User not authenticated. Please sign in again.');
      return;
    }

    console.log('=== BODY TRACKER PROFILE SAVE DEBUG ===');
    console.log('User:', user);
    console.log('Form data:', formData);
    console.log('Current profile:', profile);

    if (saving) {
      console.log('Already saving, skipping...');
      return;
    }

    // Validate required fields
    if (!formData.age || !formData.height || !formData.target_weight) {
      console.error('Missing required fields');
      setSaveError('Please fill in all required fields (Age, Height, Target Weight)');
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const profileData = {
        age: parseInt(formData.age),
        gender: formData.gender,
        height: parseFloat(formData.height),
        activity_level: formData.activity_level,
        target_weight: parseFloat(formData.target_weight),
        target_calories: formData.target_calories ? parseInt(formData.target_calories) : null,
        target_workouts_per_week: parseInt(formData.target_workouts_per_week) || 3,
        updated_at: new Date().toISOString()
      };

      console.log('Saving profile data to profiles table:', profileData);

      // Use update instead of upsert to avoid conflicts
      const { data, error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', user.id)
        .select()
        .single();

      let savedData = data;

      if (error) {
        console.error('Supabase error:', error);
        
        // If profile doesn't exist, try to create it
        if (error.code === 'PGRST116') {
          console.log('Profile not found, creating new one...');
          const { data: newData, error: insertError } = await supabase
            .from('profiles')
            .insert([{
              id: user.id,
              ...profileData
            }])
            .select()
            .single();

          if (insertError) {
            console.error('Insert error:', insertError);
            throw insertError;
          }
          
          console.log('Profile created successfully:', newData);
          savedData = newData;
        } else {
          throw error;
        }
      } else {
        console.log('Profile updated successfully:', data);
      }
      
      // Mark that we have successfully submitted
      hasSubmittedRef.current = true;
      
      // Show success message
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000);
      
      // CRITICAL: Refresh profile state by calling parent's onSave
      // This will trigger a fresh fetch from database and update the profile prop
      console.log('Calling onSave to refresh profile state...');
      onSave();

    } catch (error: any) {
      console.error('Error saving profile:', error);
      
      let errorMessage = 'Failed to save profile. Please try again.';
      
      if (error.message?.includes('permission')) {
        errorMessage = 'Permission denied. Please check your authentication.';
      } else if (error.message?.includes('duplicate key')) {
        errorMessage = 'Profile conflict. Please refresh and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setSaveError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveProfile();
  };

  // BMR & TDEE Calculations - FIXED VERSION WITH DETAILED DEBUGGING
  const calculateBMR = (): number => {
    console.log('=== BMR CALCULATION DEBUG ===');
    console.log('Form data for BMR:', {
      age: formData.age,
      height: formData.height,
      target_weight: formData.target_weight,
      gender: formData.gender
    });
    console.log('Current weight:', currentWeight);
    
    // Parse values with detailed logging
    const ageNum = formData.age ? parseInt(formData.age) : 0;
    const heightNum = formData.height ? parseFloat(formData.height) : 0;
    const weightNum = currentWeight || (formData.target_weight ? parseFloat(formData.target_weight) : 0);
    
    console.log('Parsed values:', {
      age: ageNum,
      height: heightNum,
      weight: weightNum,
      gender: formData.gender
    });
    
    // Validate all values
    if (!ageNum || ageNum <= 0) {
      console.log('Invalid age:', ageNum);
      return 0;
    }
    if (!heightNum || heightNum <= 0) {
      console.log('Invalid height:', heightNum);
      return 0;
    }
    if (!weightNum || weightNum <= 0) {
      console.log('Invalid weight:', weightNum);
      return 0;
    }
    
    // Calculate BMR using Mifflin-St Jeor Equation
    let bmr = 0;
    if (formData.gender === 'male') {
      bmr = (10 * weightNum) + (6.25 * heightNum) - (5 * ageNum) + 5;
      console.log('Male BMR calculation:', `(10 × ${weightNum}) + (6.25 × ${heightNum}) - (5 × ${ageNum}) + 5 = ${bmr}`);
    } else {
      bmr = (10 * weightNum) + (6.25 * heightNum) - (5 * ageNum) - 161;
      console.log('Female BMR calculation:', `(10 × ${weightNum}) + (6.25 × ${heightNum}) - (5 × ${ageNum}) - 161 = ${bmr}`);
    }
    
    console.log('Final BMR:', bmr);
    return bmr;
  };

  const calculateTDEE = (bmr: number): number => {
    console.log('=== TDEE CALCULATION DEBUG ===');
    console.log('BMR input:', bmr);
    console.log('Activity level:', formData.activity_level);
    
    if (bmr <= 0) {
      console.log('BMR is 0 or negative, returning 0');
      return 0;
    }
    
    const activityMultipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extremely_active: 1.9
    };
    
    const multiplier = activityMultipliers[formData.activity_level] || 1.55;
    const tdee = bmr * multiplier;
    
    console.log('TDEE calculation:', `${bmr} × ${multiplier} = ${tdee}`);
    console.log('Final TDEE:', tdee);
    
    return tdee;
  };

  // Calculate BMR and TDEE in real-time with debugging
  const bmr = calculateBMR();
  const tdee = calculateTDEE(bmr);
  const weightUsed = currentWeight || (formData.target_weight ? parseFloat(formData.target_weight) : 0);

  console.log('Real-time calculations:', { bmr, tdee, weightUsed });

  const activityLabels = {
    sedentary: 'Tidak Aktif (Tidak olahraga)',
    lightly_active: 'Sedikit Aktif (Olahraga ringan 1-3 hari/minggu)',
    moderately_active: 'Cukup Aktif (Olahraga sedang 3-5 hari/minggu)',
    very_active: 'Sangat Aktif (Olahraga berat 6-7 hari/minggu)',
    extremely_active: 'Ekstrem Aktif (Olahraga sangat berat, 2x sehari)'
  };

  // Validation
  const isFormValid = () => {
    return formData.age && 
           formData.height && 
           formData.target_weight && 
           parseInt(formData.age) > 0 && 
           parseFloat(formData.height) > 0 && 
           parseFloat(formData.target_weight) > 0;
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

        {/* Success/Error Messages */}
        {saveSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm animate-fadeIn">
            ✅ Profile berhasil disimpan!
          </div>
        )}

        {saveError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm animate-fadeIn">
            ❌ {saveError}
          </div>
        )}

        {/* Current Weight Info */}
        {currentWeight && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center space-x-3">
              <Scale className="w-5 h-5 text-green-600" />
              <div>
                <h3 className="font-medium text-green-900">Berat Badan Saat Ini</h3>
                <p className="text-sm text-green-700">
                  {currentWeight} kg - Digunakan untuk kalkulasi BMR & TDEE
                </p>
              </div>
            </div>
          </div>
        )}

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
                  Umur *
                </label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => {
                    console.log('Age changed to:', e.target.value);
                    setFormData(prev => ({ ...prev, age: e.target.value }));
                  }}
                  className="input"
                  placeholder="25"
                  min="10"
                  max="120"
                  required
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jenis Kelamin *
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => {
                    console.log('Gender changed to:', e.target.value);
                    setFormData(prev => ({ ...prev, gender: e.target.value as any }));
                  }}
                  className="input"
                  required
                  disabled={saving}
                >
                  <option value="male">Laki-laki</option>
                  <option value="female">Perempuan</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tinggi Badan (cm) *
                </label>
                <input
                  type="number"
                  value={formData.height}
                  onChange={(e) => {
                    console.log('Height changed to:', e.target.value);
                    setFormData(prev => ({ ...prev, height: e.target.value }));
                  }}
                  className="input"
                  placeholder="170"
                  min="50"
                  max="300"
                  required
                  disabled={saving}
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
                Tingkat Aktivitas Harian *
              </label>
              <select
                value={formData.activity_level}
                onChange={(e) => {
                  console.log('Activity level changed to:', e.target.value);
                  setFormData(prev => ({ ...prev, activity_level: e.target.value as any }));
                }}
                className="input"
                required
                disabled={saving}
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
                  Target Berat Badan (kg) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.target_weight}
                  onChange={(e) => {
                    console.log('Target weight changed to:', e.target.value);
                    setFormData(prev => ({ ...prev, target_weight: e.target.value }));
                  }}
                  className="input"
                  placeholder="65"
                  min="20"
                  max="300"
                  required
                  disabled={saving}
                />
                {!currentWeight && (
                  <p className="text-xs text-gray-500 mt-1">
                    Akan digunakan untuk kalkulasi BMR jika belum ada data berat badan
                  </p>
                )}
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
                  disabled={saving}
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
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          {/* Calculations Preview - ENHANCED WITH DEBUGGING */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <h4 className="font-medium text-blue-900 mb-3">Kalkulasi Metabolisme</h4>
            
            {/* Debug Info */}
            <div className="mb-4 p-3 bg-white border border-blue-200 rounded-lg text-xs">
              <h5 className="font-medium text-blue-900 mb-2">Debug Info:</h5>
              <div className="grid grid-cols-2 gap-2 text-blue-700">
                <div>Age: {formData.age || 'Not set'}</div>
                <div>Height: {formData.height || 'Not set'} cm</div>
                <div>Weight: {weightUsed || 'Not set'} kg</div>
                <div>Gender: {formData.gender}</div>
                <div>Activity: {formData.activity_level}</div>
                <div>BMR: {bmr > 0 ? Math.round(bmr) : 'Invalid data'}</div>
                <div>TDEE: {tdee > 0 ? Math.round(tdee) : 'Invalid data'}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
              <div>
                <span className="text-blue-700">BMR (Basal Metabolic Rate):</span>
                <span className="font-medium text-blue-900 ml-2">
                  {bmr > 0 ? `${Math.round(bmr)} kalori/hari` : 'Masukkan data lengkap'}
                </span>
              </div>
              <div>
                <span className="text-blue-700">TDEE (Total Daily Energy Expenditure):</span>
                <span className="font-medium text-blue-900 ml-2">
                  {tdee > 0 ? `${Math.round(tdee)} kalori/hari` : 'Masukkan data lengkap'}
                </span>
              </div>
            </div>
            <div className="p-3 bg-white border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-600 mb-1">
                <strong>Berdasarkan berat badan:</strong> {weightUsed} kg 
                {currentWeight ? ' (berat saat ini)' : ' (target berat)'}
              </p>
              <p className="text-xs text-blue-600">
                TDEE adalah perkiraan kalori yang kamu bakar per hari berdasarkan aktivitas. 
                Untuk menurunkan berat badan, konsumsi kalori di bawah TDEE.
              </p>
              {bmr > 0 && (
                <div className="mt-2 text-xs text-blue-700">
                  <strong>Rumus BMR:</strong> {formData.gender === 'male' ? 'Laki-laki' : 'Perempuan'} = 
                  {formData.gender === 'male' 
                    ? ` (10 × ${weightUsed}) + (6.25 × ${formData.height}) - (5 × ${formData.age}) + 5`
                    : ` (10 × ${weightUsed}) + (6.25 × ${formData.height}) - (5 × ${formData.age}) - 161`
                  }
                </div>
              )}
            </div>
          </div>

          {/* Validation Message */}
          {!isFormValid() && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <p className="text-sm text-yellow-800">
                <strong>Untuk menyimpan profile:</strong> Masukkan umur, tinggi badan, dan target berat badan
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || !isFormValid()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {saving ? 'Menyimpan...' : 'Simpan Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileForm;