import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Activity, 
  TrendingUp, 
  Target, 
  Plus, 
  Calendar,
  Flame,
  Zap,
  Heart,
  Scale,
  Moon,
  Calculator,
  Info,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { triggerDataUpdate } from '../../hooks/useGlobalState';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';

// MBR (Metabolic Base Rate) Calculator Functions
interface MBRCalculationParams {
  weight: number; // kg
  height: number; // cm
  age: number; // years
  gender: 'male' | 'female';
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
}

interface TDAAFactors {
  bmr: number; // Basal Metabolic Rate
  tef: number; // Thermic Effect of Food (10% of BMR)
  neat: number; // Non-Exercise Activity Thermogenesis
  eat: number; // Exercise Activity Thermogenesis
  totalTDEE: number; // Total Daily Energy Expenditure
}

interface BodyTrackerData {
  profile: any;
  calorieEntries: any[];
  workoutEntries: any[];
  weightEntries: any[];
  sleepEntries: any[];
}

interface BodyTrackerProps {
  globalData?: BodyTrackerData;
}

const BodyTracker: React.FC<BodyTrackerProps> = ({ globalData }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calories' | 'workouts' | 'weight' | 'sleep' | 'calculator'>('dashboard');
  const [profile, setProfile] = useState<any>(globalData?.profile || null);
  const [calorieEntries, setCalorieEntries] = useState<any[]>(globalData?.calorieEntries || []);
  const [workoutEntries, setWorkoutEntries] = useState<any[]>(globalData?.workoutEntries || []);
  const [weightEntries, setWeightEntries] = useState<any[]>(globalData?.weightEntries || []);
  const [sleepEntries, setSleepEntries] = useState<any[]>(globalData?.sleepEntries || []);
  const [loading, setLoading] = useState(!globalData);
  const { user } = useAuth();

  // MBR Calculator State
  const [mbrParams, setMbrParams] = useState<MBRCalculationParams>({
    weight: 70,
    height: 170,
    age: 30,
    gender: 'male',
    activityLevel: 'moderately_active'
  });

  // Update state when global data changes
  useEffect(() => {
    if (globalData) {
      setProfile(globalData.profile);
      setCalorieEntries(globalData.calorieEntries);
      setWorkoutEntries(globalData.workoutEntries);
      setWeightEntries(globalData.weightEntries);
      setSleepEntries(globalData.sleepEntries);
      setLoading(false);
      
      // Update MBR params from profile if available
      if (globalData.profile) {
        setMbrParams(prev => ({
          ...prev,
          weight: globalData.profile.weight || prev.weight,
          height: globalData.profile.height || prev.height,
          age: globalData.profile.age || prev.age,
          gender: globalData.profile.gender || prev.gender,
          activityLevel: globalData.profile.activity_level || prev.activityLevel
        }));
      }
    }
  }, [globalData]);

  // MBR Calculation Functions
  const calculateBMR = useCallback((params: MBRCalculationParams): number => {
    const { weight, height, age, gender } = params;
    
    // Mifflin-St Jeor Equation (most accurate for modern populations)
    if (gender === 'male') {
      return (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
      return (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }
  }, []);

  const calculateTDEE = useCallback((bmr: number, activityLevel: string): number => {
    const activityMultipliers = {
      sedentary: 1.2,           // Little to no exercise
      lightly_active: 1.375,    // Light exercise 1-3 days/week
      moderately_active: 1.55,  // Moderate exercise 3-5 days/week
      very_active: 1.725,       // Hard exercise 6-7 days/week
      extremely_active: 1.9     // Very hard exercise, physical job
    };
    
    return bmr * (activityMultipliers[activityLevel as keyof typeof activityMultipliers] || 1.55);
  }, []);

  // TDAA (Total Daily Activity Adjustment) Calculation
  const calculateTDAA = useCallback((params: MBRCalculationParams): TDAAFactors => {
    const bmr = calculateBMR(params);
    const tef = bmr * 0.1; // Thermic Effect of Food (10% of BMR)
    
    // NEAT calculation based on activity level
    const neatMultipliers = {
      sedentary: 0.15,
      lightly_active: 0.175,
      moderately_active: 0.2,
      very_active: 0.225,
      extremely_active: 0.25
    };
    
    const neat = bmr * (neatMultipliers[params.activityLevel] || 0.2);
    
    // EAT calculation based on activity level
    const eatMultipliers = {
      sedentary: 0.05,
      lightly_active: 0.1,
      moderately_active: 0.15,
      very_active: 0.25,
      extremely_active: 0.35
    };
    
    const eat = bmr * (eatMultipliers[params.activityLevel] || 0.15);
    
    const totalTDEE = bmr + tef + neat + eat;
    
    return {
      bmr: Math.round(bmr),
      tef: Math.round(tef),
      neat: Math.round(neat),
      eat: Math.round(eat),
      totalTDEE: Math.round(totalTDEE)
    };
  }, [calculateBMR]);

  // Calculate current user's TDAA
  const userTDAA = useMemo(() => {
    if (!profile) return null;
    
    const params: MBRCalculationParams = {
      weight: profile.weight || mbrParams.weight,
      height: profile.height || mbrParams.height,
      age: profile.age || mbrParams.age,
      gender: profile.gender || mbrParams.gender,
      activityLevel: profile.activity_level || mbrParams.activityLevel
    };
    
    return calculateTDAA(params);
  }, [profile, mbrParams, calculateTDAA]);

  // Calculate weekly stats with MBR/TDAA integration
  const weeklyStats = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    
    const weekCalories = calorieEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= weekStart && entryDate <= weekEnd;
    });
    
    const weekWorkouts = workoutEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= weekStart && entryDate <= weekEnd;
    });
    
    const weekSleep = sleepEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= weekStart && entryDate <= weekEnd;
    });
    
    const totalCaloriesIn = weekCalories.reduce((sum, entry) => sum + entry.calories, 0);
    const totalCaloriesOut = weekWorkouts.reduce((sum, entry) => sum + entry.calories_burned, 0);
    const avgSleep = weekSleep.length > 0 
      ? weekSleep.reduce((sum, entry) => sum + entry.duration_hours, 0) / weekSleep.length 
      : 0;
    
    // Calculate estimated TDEE for the week
    const estimatedWeeklyTDEE = userTDAA ? userTDAA.totalTDEE * 7 : 0;
    const actualCalorieDeficit = estimatedWeeklyTDEE - totalCaloriesIn + totalCaloriesOut;
    
    return {
      caloriesIn: totalCaloriesIn,
      caloriesOut: totalCaloriesOut,
      estimatedTDEE: estimatedWeeklyTDEE,
      actualDeficit: Math.round(actualCalorieDeficit),
      workoutsCompleted: weekWorkouts.length,
      avgSleep: Math.round(avgSleep * 10) / 10
    };
  }, [calorieEntries, workoutEntries, sleepEntries, userTDAA]);

  // Weight prediction based on calorie deficit
  const predictedWeightLoss = useMemo(() => {
    if (!weeklyStats.actualDeficit) return 0;
    
    // 1 kg fat = approximately 7700 calories
    const predictedLoss = weeklyStats.actualDeficit / 7700;
    return Math.round(predictedLoss * 100) / 100; // Round to 2 decimal places
  }, [weeklyStats.actualDeficit]);

  // Fetch data if not provided via global state
  useEffect(() => {
    if (!globalData && user) {
      fetchAllData();
    }
  }, [globalData, user]);

  const fetchAllData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [profileRes, caloriesRes, workoutsRes, weightRes, sleepRes] = await Promise.allSettled([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('calorie_entries').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('workout_entries').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('weight_entries').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('sleep_entries').select('*').eq('user_id', user.id).order('date', { ascending: false })
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value.data) {
        setProfile(profileRes.value.data);
      }
      if (caloriesRes.status === 'fulfilled') {
        setCalorieEntries(caloriesRes.value.data || []);
      }
      if (workoutsRes.status === 'fulfilled') {
        setWorkoutEntries(workoutsRes.value.data || []);
      }
      if (weightRes.status === 'fulfilled') {
        setWeightEntries(weightRes.value.data || []);
      }
      if (sleepRes.status === 'fulfilled') {
        setSleepEntries(sleepRes.value.data || []);
      }
    } catch (error) {
      console.error('Error fetching body tracker data:', error);
    } finally {
      setLoading(false);
    }
  };

  // MBR/TDAA Calculator Component
  const MBRCalculator = () => {
    const calculatedTDAA = calculateTDAA(mbrParams);
    
    return (
      <div className="space-y-6">
        {/* Calculator Input */}
        <div className="card animate-fadeIn">
          <div className="card-header">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Calculator className="w-4 h-4 text-white" />
              </div>
              <h2 className="card-title">MBR & TDAA Calculator</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input Parameters */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 mb-4">Input Parameters</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    value={mbrParams.weight}
                    onChange={(e) => setMbrParams(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                    className="input"
                    min="30"
                    max="300"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    value={mbrParams.height}
                    onChange={(e) => setMbrParams(prev => ({ ...prev, height: parseFloat(e.target.value) || 0 }))}
                    className="input"
                    min="100"
                    max="250"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age (years)
                  </label>
                  <input
                    type="number"
                    value={mbrParams.age}
                    onChange={(e) => setMbrParams(prev => ({ ...prev, age: parseInt(e.target.value) || 0 }))}
                    className="input"
                    min="10"
                    max="120"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender
                  </label>
                  <select
                    value={mbrParams.gender}
                    onChange={(e) => setMbrParams(prev => ({ ...prev, gender: e.target.value as 'male' | 'female' }))}
                    className="input"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Activity Level
                </label>
                <select
                  value={mbrParams.activityLevel}
                  onChange={(e) => setMbrParams(prev => ({ ...prev, activityLevel: e.target.value as any }))}
                  className="input"
                >
                  <option value="sedentary">Sedentary (little/no exercise)</option>
                  <option value="lightly_active">Lightly Active (1-3 days/week)</option>
                  <option value="moderately_active">Moderately Active (3-5 days/week)</option>
                  <option value="very_active">Very Active (6-7 days/week)</option>
                  <option value="extremely_active">Extremely Active (2x/day, intense)</option>
                </select>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 mb-4">Calculation Results</h3>
              
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-900">BMR (Basal Metabolic Rate)</span>
                    <span className="text-lg font-bold text-blue-600">{calculatedTDAA.bmr}</span>
                  </div>
                  <p className="text-xs text-blue-700 mt-1">Calories burned at rest</p>
                </div>

                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-900">TEF (Thermic Effect of Food)</span>
                    <span className="text-lg font-bold text-green-600">{calculatedTDAA.tef}</span>
                  </div>
                  <p className="text-xs text-green-700 mt-1">Calories burned digesting food</p>
                </div>

                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-yellow-900">NEAT (Non-Exercise Activity)</span>
                    <span className="text-lg font-bold text-yellow-600">{calculatedTDAA.neat}</span>
                  </div>
                  <p className="text-xs text-yellow-700 mt-1">Daily activities (not exercise)</p>
                </div>

                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-purple-900">EAT (Exercise Activity)</span>
                    <span className="text-lg font-bold text-purple-600">{calculatedTDAA.eat}</span>
                  </div>
                  <p className="text-xs text-purple-700 mt-1">Calories burned exercising</p>
                </div>

                <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total TDEE</span>
                    <span className="text-2xl font-bold">{calculatedTDAA.totalTDEE}</span>
                  </div>
                  <p className="text-xs opacity-90 mt-1">Total Daily Energy Expenditure</p>
                </div>
              </div>
            </div>
          </div>

          {/* TDAA Breakdown Chart */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-4">TDAA Breakdown</h4>
            <div className="space-y-2">
              {[
                { label: 'BMR', value: calculatedTDAA.bmr, color: 'bg-blue-500', percentage: (calculatedTDAA.bmr / calculatedTDAA.totalTDEE) * 100 },
                { label: 'TEF', value: calculatedTDAA.tef, color: 'bg-green-500', percentage: (calculatedTDAA.tef / calculatedTDAA.totalTDEE) * 100 },
                { label: 'NEAT', value: calculatedTDAA.neat, color: 'bg-yellow-500', percentage: (calculatedTDAA.neat / calculatedTDAA.totalTDEE) * 100 },
                { label: 'EAT', value: calculatedTDAA.eat, color: 'bg-purple-500', percentage: (calculatedTDAA.eat / calculatedTDAA.totalTDEE) * 100 }
              ].map((item, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-16 text-xs font-medium text-gray-700">{item.label}</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                    <div 
                      className={`${item.color} h-4 rounded-full transition-all duration-500`}
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                      {item.value} cal ({Math.round(item.percentage)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Information Panel */}
        <div className="card animate-fadeIn">
          <div className="card-header">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <Info className="w-4 h-4 text-white" />
              </div>
              <h2 className="card-title">Understanding MBR & TDAA</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-3">MBR Components</h3>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900">BMR (60-75%)</h4>
                  <p className="text-blue-700">Energy needed for basic bodily functions like breathing, circulation, and cell production.</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900">TEF (8-12%)</h4>
                  <p className="text-green-700">Energy cost of digesting, absorbing, and processing food.</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-3">TDAA Components</h3>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <h4 className="font-medium text-yellow-900">NEAT (15-25%)</h4>
                  <p className="text-yellow-700">Energy for activities that aren't sleeping, eating, or sports-like exercise.</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <h4 className="font-medium text-purple-900">EAT (5-30%)</h4>
                  <p className="text-purple-700">Energy expended during planned exercise and sports activities.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Dashboard Component with MBR/TDAA Integration
  const Dashboard = () => (
    <div className="space-y-6">
      {/* MBR/TDAA Summary */}
      {userTDAA && (
        <div className="card animate-fadeIn">
          <div className="card-header">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <h2 className="card-title">Your Daily Energy Profile</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card bg-blue-50 border-blue-200">
              <div className="stat-value text-blue-600">{userTDAA.bmr}</div>
              <div className="stat-label">BMR (cal/day)</div>
            </div>
            <div className="stat-card bg-green-50 border-green-200">
              <div className="stat-value text-green-600">{userTDAA.tef}</div>
              <div className="stat-label">TEF (cal/day)</div>
            </div>
            <div className="stat-card bg-yellow-50 border-yellow-200">
              <div className="stat-value text-yellow-600">{userTDAA.neat}</div>
              <div className="stat-label">NEAT (cal/day)</div>
            </div>
            <div className="stat-card bg-purple-50 border-purple-200">
              <div className="stat-value text-purple-600">{userTDAA.totalTDEE}</div>
              <div className="stat-label">Total TDEE</div>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Progress with Predictions */}
      <div className="card animate-fadeIn">
        <div className="card-header">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <h2 className="card-title">Weekly Progress & Predictions</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calorie Balance */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Calorie Balance</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <span className="text-sm text-red-700">Calories In</span>
                <span className="font-bold text-red-600">{weeklyStats.caloriesIn.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm text-blue-700">Estimated TDEE</span>
                <span className="font-bold text-blue-600">{weeklyStats.estimatedTDEE.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-green-700">Exercise Burned</span>
                <span className="font-bold text-green-600">{weeklyStats.caloriesOut.toLocaleString()}</span>
              </div>
              <div className={`flex justify-between items-center p-3 rounded-lg ${
                weeklyStats.actualDeficit > 0 ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'
              }`}>
                <span className={`text-sm font-medium ${
                  weeklyStats.actualDeficit > 0 ? 'text-green-800' : 'text-red-800'
                }`}>
                  {weeklyStats.actualDeficit > 0 ? 'Deficit' : 'Surplus'}
                </span>
                <span className={`font-bold ${
                  weeklyStats.actualDeficit > 0 ? 'text-green-700' : 'text-red-700'
                }`}>
                  {Math.abs(weeklyStats.actualDeficit).toLocaleString()} cal
                </span>
              </div>
            </div>
          </div>

          {/* Weight Prediction */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Weight Prediction</h3>
            <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 mb-2">
                  {predictedWeightLoss > 0 ? '-' : '+'}{Math.abs(predictedWeightLoss)} kg
                </div>
                <p className="text-sm text-blue-700 mb-3">Predicted weekly change</p>
                <div className="text-xs text-gray-600">
                  Based on {weeklyStats.actualDeficit > 0 ? 'deficit' : 'surplus'} of {Math.abs(weeklyStats.actualDeficit)} calories
                </div>
              </div>
            </div>
            
            {predictedWeightLoss > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700">On track for healthy weight loss!</span>
                </div>
              </div>
            )}
            
            {predictedWeightLoss < -0.5 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-yellow-700">Consider increasing calorie intake</span>
                </div>
              </div>
            )}
          </div>

          {/* Activity Summary */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Activity Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm text-blue-700">Workouts</span>
                <span className="font-bold text-blue-600">{weeklyStats.workoutsCompleted}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <span className="text-sm text-purple-700">Avg Sleep</span>
                <span className="font-bold text-purple-600">{weeklyStats.avgSleep}h</span>
              </div>
              {userTDAA && (
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-sm text-green-700">Activity Level</span>
                  <span className="font-bold text-green-600 capitalize">
                    {(profile?.activity_level || 'moderate').replace('_', ' ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <Activity className="w-4 h-4" /> },
            { id: 'calculator', label: 'MBR/TDAA Calculator', icon: <Calculator className="w-4 h-4" /> },
            { id: 'calories', label: 'Calories', icon: <Flame className="w-4 h-4" /> },
            { id: 'workouts', label: 'Workouts', icon: <Zap className="w-4 h-4" /> },
            { id: 'weight', label: 'Weight', icon: <Scale className="w-4 h-4" /> },
            { id: 'sleep', label: 'Sleep', icon: <Moon className="w-4 h-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && <Dashboard />}
      {activeTab === 'calculator' && <MBRCalculator />}
      {activeTab === 'calories' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Calorie Tracking</h2>
            <button className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Entry
            </button>
          </div>
          <p className="text-gray-600">Calorie tracking interface coming soon...</p>
        </div>
      )}
      {activeTab === 'workouts' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Workout Tracking</h2>
            <button className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Workout
            </button>
          </div>
          <p className="text-gray-600">Workout tracking interface coming soon...</p>
        </div>
      )}
      {activeTab === 'weight' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Weight Tracking</h2>
            <button className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Weight
            </button>
          </div>
          <p className="text-gray-600">Weight tracking interface coming soon...</p>
        </div>
      )}
      {activeTab === 'sleep' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Sleep Tracking</h2>
            <button className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Sleep
            </button>
          </div>
          <p className="text-gray-600">Sleep tracking interface coming soon...</p>
        </div>
      )}
    </div>
  );
};

export default BodyTracker;