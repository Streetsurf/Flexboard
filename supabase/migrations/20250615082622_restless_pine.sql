/*
  # Fix actual_minutes column to support decimal values

  1. Changes
    - Change `actual_minutes` column type from `integer` to `real` in `todos` table
    - This allows storing decimal minute values for precise time tracking

  2. Security
    - No RLS changes needed as this is just a column type change
    - Existing constraints and policies remain unchanged
*/

-- Change actual_minutes column from integer to real to support decimal values
ALTER TABLE todos ALTER COLUMN actual_minutes TYPE real;

-- Update the check constraint to work with real values
ALTER TABLE todos DROP CONSTRAINT IF EXISTS todos_actual_minutes_check;
ALTER TABLE todos ADD CONSTRAINT todos_actual_minutes_check 
  CHECK (((actual_minutes >= 0) AND (actual_minutes <= 1440)));