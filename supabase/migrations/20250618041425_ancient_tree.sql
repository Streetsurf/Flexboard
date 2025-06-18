/*
  # Update content_items status constraint

  1. Changes
    - Update status check constraint to include 'published' option
    - Remove old constraint and add new one with all 4 status options

  2. Status Options
    - planned: Content is planned but not started
    - watching: Content is in progress (On Progress)
    - completed: Content is ready to post (Ready to Post)
    - published: Content has been published
*/

-- Drop the existing status check constraint
ALTER TABLE content_items DROP CONSTRAINT IF EXISTS content_items_status_check;

-- Add new status check constraint with all 4 options
ALTER TABLE content_items ADD CONSTRAINT content_items_status_check 
  CHECK (status = ANY (ARRAY['planned'::text, 'watching'::text, 'completed'::text, 'published'::text]));