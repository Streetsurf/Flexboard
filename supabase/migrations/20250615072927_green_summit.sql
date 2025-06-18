/*
  # Update Todo Duration System

  1. Changes
    - Replace `due_time` with `duration_minutes` (estimated time needed)
    - Add `actual_minutes` (time actually spent)
    - Add `timer_start_time` (when timer was started)
    - Add `is_timer_active` (timer status)

  2. Security
    - Maintain existing RLS policies
    - Add constraints for valid duration values
*/

-- Remove due_time column and add duration-related columns
DO $$
BEGIN
  -- Remove due_time column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'todos' AND column_name = 'due_time'
  ) THEN
    ALTER TABLE todos DROP COLUMN due_time;
  END IF;

  -- Add duration_minutes column (estimated time needed)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'todos' AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE todos ADD COLUMN duration_minutes INTEGER;
  END IF;

  -- Add actual_minutes column (time actually spent)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'todos' AND column_name = 'actual_minutes'
  ) THEN
    ALTER TABLE todos ADD COLUMN actual_minutes INTEGER DEFAULT 0;
  END IF;

  -- Add timer_start_time column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'todos' AND column_name = 'timer_start_time'
  ) THEN
    ALTER TABLE todos ADD COLUMN timer_start_time TIMESTAMPTZ;
  END IF;

  -- Add is_timer_active column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'todos' AND column_name = 'is_timer_active'
  ) THEN
    ALTER TABLE todos ADD COLUMN is_timer_active BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add check constraints for duration values
DO $$
BEGIN
  -- Duration constraint (1-480 minutes = 8 hours max)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'todos' AND constraint_name = 'todos_duration_minutes_check'
  ) THEN
    ALTER TABLE todos ADD CONSTRAINT todos_duration_minutes_check 
    CHECK (duration_minutes IS NULL OR (duration_minutes >= 1 AND duration_minutes <= 480));
  END IF;

  -- Actual minutes constraint (0-1440 minutes = 24 hours max)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'todos' AND constraint_name = 'todos_actual_minutes_check'
  ) THEN
    ALTER TABLE todos ADD CONSTRAINT todos_actual_minutes_check 
    CHECK (actual_minutes >= 0 AND actual_minutes <= 1440);
  END IF;
END $$;

-- Create index for timer queries
CREATE INDEX IF NOT EXISTS todos_timer_active_idx ON todos (user_id, is_timer_active) WHERE is_timer_active = TRUE;