/*
  # Add gender column to profiles table

  1. Changes
    - Add `gender` column to `profiles` table
    - Set default value to 'male' for existing records
    - Add check constraint to ensure valid values

  2. Security
    - No changes to RLS policies needed as existing policies cover all columns
*/

-- Add gender column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'gender'
  ) THEN
    ALTER TABLE profiles ADD COLUMN gender text DEFAULT 'male';
    
    -- Add check constraint for valid gender values
    ALTER TABLE profiles ADD CONSTRAINT profiles_gender_check 
      CHECK (gender IN ('male', 'female'));
  END IF;
END $$;