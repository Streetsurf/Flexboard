/*
  # Add channel_id to content_items table

  1. Changes
    - Add `channel_id` column to `content_items` table
    - Add foreign key constraint to reference channels table
    - Column is nullable to maintain compatibility with existing content

  2. Security
    - No RLS changes needed as existing policies will still work
*/

-- Add channel_id column to content_items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_items' AND column_name = 'channel_id'
  ) THEN
    ALTER TABLE content_items ADD COLUMN channel_id uuid REFERENCES channels(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for better performance on channel content queries
CREATE INDEX IF NOT EXISTS content_items_channel_idx ON content_items(channel_id, created_at DESC);