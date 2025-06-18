/*
  # Add open_in_app column to quick_links table

  1. New Columns
    - `open_in_app` (boolean) - Whether to open link in app or browser
    - Default value is false (open in browser)

  2. Security
    - No RLS changes needed as this is just adding a column
*/

-- Add open_in_app column to quick_links table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quick_links' AND column_name = 'open_in_app'
  ) THEN
    ALTER TABLE quick_links ADD COLUMN open_in_app boolean DEFAULT false;
  END IF;
END $$;