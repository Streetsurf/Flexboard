/*
  # Add priority system columns to todos table

  1. New Columns
    - `priority_score` (real) - Calculated priority score for sorting
    - `urgency` (integer) - Urgency level (1-10)
    - `importance` (integer) - Importance level (1-10)
    - `effort` (integer) - Effort required (1-10)
    - `impact` (integer) - Expected impact (1-10)
    - `due_time` (time) - Optional due time for the task

  2. Changes
    - All columns are nullable to maintain compatibility with existing todos
    - Added check constraints to ensure valid ranges for priority factors
    - Default priority_score of 5.0 for existing todos without priority data
*/

-- Add priority-related columns to todos table
DO $$
BEGIN
  -- Add priority_score column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'todos' AND column_name = 'priority_score'
  ) THEN
    ALTER TABLE todos ADD COLUMN priority_score real DEFAULT 5.0;
  END IF;

  -- Add urgency column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'todos' AND column_name = 'urgency'
  ) THEN
    ALTER TABLE todos ADD COLUMN urgency integer;
  END IF;

  -- Add importance column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'todos' AND column_name = 'importance'
  ) THEN
    ALTER TABLE todos ADD COLUMN importance integer;
  END IF;

  -- Add effort column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'todos' AND column_name = 'effort'
  ) THEN
    ALTER TABLE todos ADD COLUMN effort integer;
  END IF;

  -- Add impact column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'todos' AND column_name = 'impact'
  ) THEN
    ALTER TABLE todos ADD COLUMN impact integer;
  END IF;

  -- Add due_time column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'todos' AND column_name = 'due_time'
  ) THEN
    ALTER TABLE todos ADD COLUMN due_time time;
  END IF;
END $$;

-- Add check constraints for valid priority factor ranges
DO $$
BEGIN
  -- Check constraint for urgency (1-10)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'todos' AND constraint_name = 'todos_urgency_check'
  ) THEN
    ALTER TABLE todos ADD CONSTRAINT todos_urgency_check 
    CHECK (urgency IS NULL OR (urgency >= 1 AND urgency <= 10));
  END IF;

  -- Check constraint for importance (1-10)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'todos' AND constraint_name = 'todos_importance_check'
  ) THEN
    ALTER TABLE todos ADD CONSTRAINT todos_importance_check 
    CHECK (importance IS NULL OR (importance >= 1 AND importance <= 10));
  END IF;

  -- Check constraint for effort (1-10)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'todos' AND constraint_name = 'todos_effort_check'
  ) THEN
    ALTER TABLE todos ADD CONSTRAINT todos_effort_check 
    CHECK (effort IS NULL OR (effort >= 1 AND effort <= 10));
  END IF;

  -- Check constraint for impact (1-10)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'todos' AND constraint_name = 'todos_impact_check'
  ) THEN
    ALTER TABLE todos ADD CONSTRAINT todos_impact_check 
    CHECK (impact IS NULL OR (impact >= 1 AND impact <= 10));
  END IF;

  -- Check constraint for priority_score (0.1-10.0)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'todos' AND constraint_name = 'todos_priority_score_check'
  ) THEN
    ALTER TABLE todos ADD CONSTRAINT todos_priority_score_check 
    CHECK (priority_score IS NULL OR (priority_score >= 0.1 AND priority_score <= 10.0));
  END IF;
END $$;

-- Create index for priority_score to optimize sorting
CREATE INDEX IF NOT EXISTS todos_priority_score_idx ON todos(priority_score DESC);

-- Create composite index for user_id and priority_score
CREATE INDEX IF NOT EXISTS todos_user_priority_idx ON todos(user_id, priority_score DESC);