/*
  # Add channels table for content management

  1. New Tables
    - `channels`
      - `id` (uuid, primary key)
      - `name` (text, channel name)
      - `logo_url` (text, optional logo/icon URL)
      - `created_at` (timestamp)
      - `user_id` (uuid, foreign key)

  2. Security
    - Enable RLS on `channels` table
    - Add policies for authenticated users to manage their own channels
*/

-- Create channels table
CREATE TABLE IF NOT EXISTS channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own channels"
  ON channels
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS channels_user_idx ON channels(user_id, created_at DESC);