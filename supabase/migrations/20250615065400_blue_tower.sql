/*
  # Add date column to todos table

  1. Changes
    - Add `date` column to `todos` table with DATE type
    - Set default value to CURRENT_DATE
    - Make column NOT NULL since it has a default value

  2. Notes
    - This ensures the todos table has the date column that the application expects
    - Uses IF NOT EXISTS pattern to prevent errors if column already exists
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'todos' AND column_name = 'date'
  ) THEN
    ALTER TABLE todos ADD COLUMN date DATE NOT NULL DEFAULT CURRENT_DATE;
  END IF;
END $$;