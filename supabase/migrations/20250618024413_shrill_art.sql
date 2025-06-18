/*
  # Add notes column to content_items table

  1. Changes
    - Add `notes` column to `content_items` table
    - Column type: text (nullable)
    - Used to store additional metadata and descriptions for content items

  2. Notes
    - This column will store JSON strings with content metadata like descriptions, scenes, and voice-over settings
    - Making it nullable to maintain compatibility with existing records
*/

-- Add notes column to content_items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_items' AND column_name = 'notes'
  ) THEN
    ALTER TABLE content_items ADD COLUMN notes text;
  END IF;
END $$;