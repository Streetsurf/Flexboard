/*
  # Add icon column to quick_links table

  1. Changes
    - Add `icon` column to `quick_links` table
    - Column is nullable text type to store icon names
    - Default value is 'globe' to match application expectations

  2. Notes
    - This resolves the "Could not find the 'icon' column" error
    - Existing records will get the default 'globe' icon
    - Column is optional as per application design
*/

-- Add icon column to quick_links table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quick_links' AND column_name = 'icon'
  ) THEN
    ALTER TABLE quick_links ADD COLUMN icon text DEFAULT 'globe';
  END IF;
END $$;