/*
  # Create Body Tracker Tables

  1. New Tables
    - `calorie_entries` - Track food intake with calories and categories
    - `workout_entries` - Track exercises with duration or repetitions
    - `weight_entries` - Track weight and body fat measurements
    - `sleep_entries` - Track sleep patterns and duration

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add indexes for better query performance
    - Add unique constraints to prevent duplicate daily entries
*/

-- Create calorie_entries table
CREATE TABLE IF NOT EXISTS calorie_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_name text NOT NULL,
  calories integer NOT NULL CHECK (calories > 0),
  category text NOT NULL CHECK (category IN ('breakfast', 'lunch', 'dinner', 'snack')),
  description text DEFAULT '',
  date date NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create workout_entries table
CREATE TABLE IF NOT EXISTS workout_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_name text NOT NULL,
  type text NOT NULL CHECK (type IN ('duration', 'reps')),
  duration_minutes integer CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  repetitions integer CHECK (repetitions IS NULL OR repetitions > 0),
  calories_burned integer NOT NULL CHECK (calories_burned > 0),
  date date NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create weight_entries table
CREATE TABLE IF NOT EXISTS weight_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weight real NOT NULL CHECK (weight > 0),
  body_fat real CHECK (body_fat IS NULL OR (body_fat >= 0 AND body_fat <= 100)),
  date date NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create sleep_entries table
CREATE TABLE IF NOT EXISTS sleep_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sleep_time text NOT NULL,
  wake_time text NOT NULL,
  duration_hours real NOT NULL CHECK (duration_hours > 0 AND duration_hours <= 24),
  date date NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE calorie_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for calorie_entries
CREATE POLICY "Users can manage their own calorie entries"
  ON calorie_entries
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for workout_entries
CREATE POLICY "Users can manage their own workout entries"
  ON workout_entries
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for weight_entries
CREATE POLICY "Users can manage their own weight entries"
  ON weight_entries
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for sleep_entries
CREATE POLICY "Users can manage their own sleep entries"
  ON sleep_entries
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS calorie_entries_user_date_idx ON calorie_entries (user_id, date);
CREATE INDEX IF NOT EXISTS workout_entries_user_date_idx ON workout_entries (user_id, date);
CREATE INDEX IF NOT EXISTS weight_entries_user_date_idx ON weight_entries (user_id, date);
CREATE INDEX IF NOT EXISTS sleep_entries_user_date_idx ON sleep_entries (user_id, date);

-- Create unique constraints to prevent duplicate entries per day
CREATE UNIQUE INDEX IF NOT EXISTS weight_entries_user_date_unique ON weight_entries (user_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS sleep_entries_user_date_unique ON sleep_entries (user_id, date);