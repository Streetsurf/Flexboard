/*
  # Add Body Tracker profile fields to profiles table

  1. New Columns
    - `age` (integer) - User's age
    - `height` (real) - User's height in cm
    - `activity_level` (text) - Activity level (sedentary, lightly_active, moderately_active, very_active, extremely_active)
    - `target_weight` (real) - Target weight in kg
    - `target_calories` (integer) - Daily calorie target
    - `target_workouts_per_week` (integer) - Weekly workout target

  2. Security
    - No RLS changes needed as profiles table already has proper policies
*/

-- Add Body Tracker specific fields to profiles table
DO $$
BEGIN
  -- Add age column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'age'
  ) THEN
    ALTER TABLE profiles ADD COLUMN age integer CHECK (age IS NULL OR (age >= 10 AND age <= 120));
  END IF;

  -- Add height column (in cm)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'height'
  ) THEN
    ALTER TABLE profiles ADD COLUMN height real CHECK (height IS NULL OR (height >= 50 AND height <= 300));
  END IF;

  -- Add activity_level column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'activity_level'
  ) THEN
    ALTER TABLE profiles ADD COLUMN activity_level text DEFAULT 'moderately_active' 
    CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active'));
  END IF;

  -- Add target_weight column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'target_weight'
  ) THEN
    ALTER TABLE profiles ADD COLUMN target_weight real CHECK (target_weight IS NULL OR (target_weight >= 20 AND target_weight <= 300));
  END IF;

  -- Add target_calories column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'target_calories'
  ) THEN
    ALTER TABLE profiles ADD COLUMN target_calories integer CHECK (target_calories IS NULL OR (target_calories >= 800 AND target_calories <= 5000));
  END IF;

  -- Add target_workouts_per_week column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'target_workouts_per_week'
  ) THEN
    ALTER TABLE profiles ADD COLUMN target_workouts_per_week integer DEFAULT 3 CHECK (target_workouts_per_week IS NULL OR (target_workouts_per_week >= 0 AND target_workouts_per_week <= 14));
  END IF;
END $$;