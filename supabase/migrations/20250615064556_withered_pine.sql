/*
  # Add date field to todos table

  1. Changes
    - Add `date` column to todos table with default value of current date
    - Update existing todos to have today's date
    - Add index on user_id and date for better query performance

  2. Security
    - No changes to RLS policies needed
*/

-- Add date column to todos table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'todos' AND column_name = 'date'
  ) THEN
    ALTER TABLE todos ADD COLUMN date date DEFAULT CURRENT_DATE;
  END IF;
END $$;

-- Update existing todos to have today's date if they don't have one
UPDATE todos SET date = CURRENT_DATE WHERE date IS NULL;

-- Make date column not null
ALTER TABLE todos ALTER COLUMN date SET NOT NULL;

-- Add index for better performance on user_id + date queries
CREATE INDEX IF NOT EXISTS todos_user_date_idx ON todos(user_id, date);