/*
  # Add priority columns to todos table

  1. New Columns
    - `urgency` (integer, 1-10 scale, default 5)
    - `importance` (integer, 1-10 scale, default 5) 
    - `effort` (integer, 1-10 scale, default 5)
    - `impact` (integer, 1-10 scale, default 5)
    - `priority_score` (real, calculated score, default 5.0)
    - `due_time` (time, optional due time for tasks)

  2. Constraints
    - Add check constraints to ensure values are within valid ranges
    - Add index on priority_score for efficient sorting

  3. Notes
    - All columns are nullable except priority_score which has a default
    - Existing todos will get default values for new columns
*/

-- Add the missing priority columns to todos table
DO $$
BEGIN
  -- Add urgency column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'todos' AND column_name = 'urgency'
  ) THEN
    ALTER TABLE todos ADD COLUMN urgency INTEGER;
  END IF;

  -- Add importance column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'todos' AND column_name = 'importance'
  ) THEN
    ALTER TABLE todos ADD COLUMN importance INTEGER;
  END IF;

  -- Add effort column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'todos' AND column_name = 'effort'
  ) THEN
    ALTER TABLE todos ADD COLUMN effort INTEGER;
  END IF;

  -- Add impact column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'todos' AND column_name = 'impact'
  ) THEN
    ALTER TABLE todos ADD COLUMN impact INTEGER;
  END IF;

  -- Add priority_score column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'todos' AND column_name = 'priority_score'
  ) THEN
    ALTER TABLE todos ADD COLUMN priority_score REAL DEFAULT 5.0;
  END IF;

  -- Add due_time column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'todos' AND column_name = 'due_time'
  ) THEN
    ALTER TABLE todos ADD COLUMN due_time TIME;
  END IF;
END $$;

-- Add check constraints if they don't exist
DO $$
BEGIN
  -- Urgency constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'todos' AND constraint_name = 'todos_urgency_check'
  ) THEN
    ALTER TABLE todos ADD CONSTRAINT todos_urgency_check 
    CHECK (urgency IS NULL OR (urgency >= 1 AND urgency <= 10));
  END IF;

  -- Importance constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'todos' AND constraint_name = 'todos_importance_check'
  ) THEN
    ALTER TABLE todos ADD CONSTRAINT todos_importance_check 
    CHECK (importance IS NULL OR (importance >= 1 AND importance <= 10));
  END IF;

  -- Effort constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'todos' AND constraint_name = 'todos_effort_check'
  ) THEN
    ALTER TABLE todos ADD CONSTRAINT todos_effort_check 
    CHECK (effort IS NULL OR (effort >= 1 AND effort <= 10));
  END IF;

  -- Impact constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'todos' AND constraint_name = 'todos_impact_check'
  ) THEN
    ALTER TABLE todos ADD CONSTRAINT todos_impact_check 
    CHECK (impact IS NULL OR (impact >= 1 AND impact <= 10));
  END IF;

  -- Priority score constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'todos' AND constraint_name = 'todos_priority_score_check'
  ) THEN
    ALTER TABLE todos ADD CONSTRAINT todos_priority_score_check 
    CHECK (priority_score IS NULL OR (priority_score >= 0.1 AND priority_score <= 10.0));
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS todos_priority_score_idx ON todos (priority_score DESC);
CREATE INDEX IF NOT EXISTS todos_user_priority_idx ON todos (user_id, priority_score DESC);
CREATE INDEX IF NOT EXISTS todos_user_date_idx ON todos (user_id, date);