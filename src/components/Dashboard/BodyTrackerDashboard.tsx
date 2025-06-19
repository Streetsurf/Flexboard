import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Target, 
  Calendar,
  Award,
  Flame,
  Trophy,
  Star,
  Zap,
  Heart,
  CheckCircle
} from 'lucide-react';

interface WeeklyStats {
  caloriesIn: number;
  caloriesOut: number;
  weightChange: number;
  workoutsCompleted: number;
  avgSleep: number;
}

interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  dateAchieved: string;
  color: string;
  unlocked: boolean;
}

const BodyTrackerDashboard: React.FC = () => {
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    caloriesIn: 12500,
    caloriesOut: 14700,
    weightChange: -0.7,
    workoutsCompleted: 5,
    avgSleep: 7.2
  });

  const [achievements, setAchievements] = useState<Achievement[]>([
    {
      id: '1',
      icon: '🔥',
      title: 'Kalori Defisit Konsisten',
      description: 'Defisit 7 hari berturut-turut',
      dateAchieved: '2024-01-15',
      color: 'bg-red-50 border-red-200',
      unlocked: true
    },
    {
      id: '2',
      icon: '🎯',
      title: 'Target Workout',
      description: 'Selesaikan 5 workout minggu ini',
      dateAchieved: '2024-01-14',
      color: 'bg-blue-50 border-blue-200',
      unlocked: true
    },
    {
      id: '3',
      icon: '🏆',
      title: 'Penurunan Berat Ideal',
      description: 'Turun 0.5-1kg dalam seminggu',
      dateAchieved: '2024-01-13',
      color: 'bg-yellow-50 border-yellow-200',
      unlocked: true
    },
    {
      id: '4',
      icon: '💪',
      title: 'Konsistensi Latihan',
      description: 'Latihan 3 hari berturut-turut',
      dateAchieved: '2024-01-12',
      color: 'bg-green-50 border-green-200',
      unlocked: true
    },
    {
      id: '5',
      icon: '⭐',
      title: 'Tidur Berkualitas',
      description: 'Rata-rata tidur 7+ jam',
      dateAchieved: '2024-01-11',
      color: 'bg-purple-50 border-purple-200',
      unlocked: true
    },
    {
      id: '6',
      icon: '🎖️',
      title: 'Minggu Sempurna',
      description: 'Semua target tercapai',
      dateAchieved: '',
      color: 'bg-gray-50 border-gray-200',
      unlocked: false
    }
  ]);

  const getStatColor = (type: string, value: number) => {
    switch (type) {
      case 'deficit':
        return value > 0 ? 'text-green-600' : value < -500 ? 'text-red-600' : 'text-yellow-600';
      case 'weight':
        return value < 0 ? 'text-green-600' : value > 0.5 ? 'text-red-600' : 'text-yellow-600';
      case 'workout':
        return value >= 4 ? 'text-green-600' : value >= 2 ? 'text-yellow-600' : 'text-red-600';
      case 'sleep':
        return value >= 7 ? 'text-green-600' : value >= 6 ? 'text-yellow-600' : 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatBgColor = (type: string, value: number) => {
    switch (type) {
      case 'deficit':
        return value > 0 ? 'bg-green-50 border-green-200' : value < -500 ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200';
      case 'weight':
        return value < 0 ? 'bg-green-50 border-green-200' : value > 0.5 ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200';
      case 'workout':
        return value >= 4 ? 'bg-green-50 border-green-200' : value >= 2 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';
      case 'sleep':
        return value >= 7 ? 'bg-green-50 border-green-200' : value >= 6 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const calorieDeficit = weeklyStats.caloriesOut - weeklyStats.caloriesIn;
  
  const generateWeeklySummary = () => {
    const deficitText = calorieDeficit > 0 ? `defisit ${calorieDeficit.toLocaleString()} kalori` : `surplus ${Math.abs(calorieDeficit).toLocaleString()} kalori`;
    const weightText = weeklyStats.weightChange < 0 ? `menurunkan ${Math.abs(weeklyStats.weightChange)} kg` : weeklyStats.weightChange > 0 ? `menaikkan ${weeklyStats.weightChange} kg` : 'mempertahankan berat badan';
    const workoutText = weeklyStats.workoutsCompleted >= 4 ? 'Latihanmu konsisten!' : weeklyStats.workoutsCompleted >= 2 ? 'Latihan cukup baik!' : 'Perlu lebih banyak latihan!';
    
    return `🔥 Minggu ini kamu ${deficitText} dan berhasil ${weightText}. ${workoutText} 💪`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Weekly Report Summary */}
      <div className="card animate-fadeIn">
        <div className="card-header">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <h2 className="card-title">Weekly Report Summary</h2>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Calorie Deficit */}
          <div className={`stat-card ${getStatBgColor('deficit', calorieDeficit)} stagger-item`}>
            <div className="flex items-center justify-between mb-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className={`text-xs font-medium ${getStatColor('deficit', calorieDeficit)}`}>
                {calorieDeficit > 0 ? 'Defisit' : 'Surplus'}
              </span>
            </div>
            <div className={`stat-value ${getStatColor('deficit', calorieDeficit)}`}>
              {Math.abs(calorieDeficit).toLocaleString()}
            </div>
            <div className="stat-label">Kalori</div>
          </div>

          {/* Weight Change */}
          <div className={`stat-card ${getStatBgColor('weight', weeklyStats.weightChange)} stagger-item`}>
            <div className="flex items-center justify-between mb-2">
              {weeklyStats.weightChange < 0 ? (
                <TrendingDown className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingUp className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-xs font-medium ${getStatColor('weight', weeklyStats.weightChange)}`}>
                {weeklyStats.weightChange < 0 ? 'Turun' : weeklyStats.weightChange > 0 ? 'Naik' : 'Stabil'}
              </span>
            </div>
            <div className={`stat-value ${getStatColor('weight', weeklyStats.weightChange)}`}>
              {weeklyStats.weightChange > 0 ? '+' : ''}{weeklyStats.weightChange}
            </div>
            <div className="stat-label">kg</div>
          </div>

          {/* Workouts Completed */}
          <div className={`stat-card ${getStatBgColor('workout', weeklyStats.workoutsCompleted)} stagger-item`}>
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-4 h-4 text-blue-500" />
              <span className={`text-xs font-medium ${getStatColor('workout', weeklyStats.workoutsCompleted)}`}>
                {weeklyStats.workoutsCompleted >= 4 ? 'Excellent' : weeklyStats.workoutsCompleted >= 2 ? 'Good' : 'Poor'}
              </span>
            </div>
            <div className={`stat-value ${getStatColor('workout', weeklyStats.workoutsCompleted)}`}>
              {weeklyStats.workoutsCompleted}
            </div>
            <div className="stat-label">Workout</div>
          </div>

          {/* Average Sleep */}
          <div className={`stat-card ${getStatBgColor('sleep', weeklyStats.avgSleep)} stagger-item`}>
            <div className="flex items-center justify-between mb-2">
              <Heart className="w-4 h-4 text-purple-500" />
              <span className={`text-xs font-medium ${getStatColor('sleep', weeklyStats.avgSleep)}`}>
                {weeklyStats.avgSleep >= 7 ? 'Good' : weeklyStats.avgSleep >= 6 ? 'Fair' : 'Poor'}
              </span>
            </div>
            <div className={`stat-value ${getStatColor('sleep', weeklyStats.avgSleep)}`}>
              {weeklyStats.avgSleep}
            </div>
            <div className="stat-label">Jam Tidur</div>
          </div>
        </div>

        {/* Weekly Summary Highlight */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl animate-fadeIn">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <Target className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-blue-900 mb-1 text-sm">Ringkasan Minggu Ini</h3>
              <p className="text-blue-700 text-sm leading-relaxed">
                {generateWeeklySummary()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Achievement System */}
      <div className="card animate-fadeIn">
        <div className="card-header">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
              <Award className="w-4 h-4 text-white" />
            </div>
            <h2 className="card-title">Achievements</h2>
          </div>
          <div className="text-xs text-gray-500">
            {achievements.filter(a => a.unlocked).length}/{achievements.length} unlocked
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {achievements.map((achievement, index) => (
            <div
              key={achievement.id}
              className={`p-4 rounded-xl border transition-all duration-300 hover-lift stagger-item ${
                achievement.unlocked 
                  ? `${achievement.color} hover:shadow-md` 
                  : 'bg-gray-50 border-gray-200 opacity-60'
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="text-center">
                {/* Achievement Icon */}
                <div className={`text-2xl mb-2 ${achievement.unlocked ? '' : 'grayscale'}`}>
                  {achievement.icon}
                </div>
                
                {/* Achievement Title */}
                <h3 className={`font-medium mb-1 text-sm ${
                  achievement.unlocked ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {achievement.title}
                </h3>
                
                {/* Achievement Description */}
                <p className={`text-xs mb-2 ${
                  achievement.unlocked ? 'text-gray-600' : 'text-gray-400'
                }`}>
                  {achievement.description}
                </p>
                
                {/* Achievement Date */}
                {achievement.unlocked && achievement.dateAchieved && (
                  <div className="flex items-center justify-center space-x-1">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-gray-500">
                      {formatDate(achievement.dateAchieved)}
                    </span>
                  </div>
                )}
                
                {/* Locked State */}
                {!achievement.unlocked && (
                  <div className="flex items-center justify-center space-x-1">
                    <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                    <span className="text-xs text-gray-400">Locked</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Achievement Progress */}
        <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Achievement Progress</span>
            <span className="text-sm text-gray-600">
              {achievements.filter(a => a.unlocked).length}/{achievements.length}
            </span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${(achievements.filter(a => a.unlocked).length / achievements.length) * 100}%` 
              }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {achievements.length - achievements.filter(a => a.unlocked).length} achievements remaining
          </p>
        </div>
      </div>
    </div>
  );
};

export default BodyTrackerDashboard;