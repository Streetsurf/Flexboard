/*
  # Money Tracker Tables

  1. New Tables
    - `money_categories`
      - `id` (uuid, primary key)
      - `name` (text, category name)
      - `type` (text, income/outcome)
      - `created_at` (timestamp)
      - `user_id` (uuid, foreign key)
    
    - `money_income`
      - `id` (uuid, primary key)
      - `amount` (bigint, in rupiah)
      - `category_id` (uuid, foreign key)
      - `description` (text, optional)
      - `date` (date)
      - `created_at` (timestamp)
      - `user_id` (uuid, foreign key)
    
    - `money_outcome`
      - `id` (uuid, primary key)
      - `amount` (bigint, in rupiah)
      - `category_id` (uuid, foreign key)
      - `description` (text, optional)
      - `date` (date)
      - `created_at` (timestamp)
      - `user_id` (uuid, foreign key)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create money_categories table
CREATE TABLE IF NOT EXISTS money_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'outcome')),
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create money_income table
CREATE TABLE IF NOT EXISTS money_income (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount bigint NOT NULL CHECK (amount > 0),
  category_id uuid NOT NULL REFERENCES money_categories(id) ON DELETE RESTRICT,
  description text DEFAULT '',
  date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create money_outcome table
CREATE TABLE IF NOT EXISTS money_outcome (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount bigint NOT NULL CHECK (amount > 0),
  category_id uuid NOT NULL REFERENCES money_categories(id) ON DELETE RESTRICT,
  description text DEFAULT '',
  date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS on all tables
ALTER TABLE money_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_outcome ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for money_categories
CREATE POLICY "Users can manage their own money categories"
  ON money_categories
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for money_income
CREATE POLICY "Users can manage their own money income"
  ON money_income
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for money_outcome
CREATE POLICY "Users can manage their own money outcome"
  ON money_outcome
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS money_categories_user_type_idx ON money_categories (user_id, type);
CREATE INDEX IF NOT EXISTS money_income_user_date_idx ON money_income (user_id, date DESC);
CREATE INDEX IF NOT EXISTS money_outcome_user_date_idx ON money_outcome (user_id, date DESC);
CREATE INDEX IF NOT EXISTS money_income_category_idx ON money_income (category_id);
CREATE INDEX IF NOT EXISTS money_outcome_category_idx ON money_outcome (category_id);

-- Insert default categories for new users
-- This will be handled by a trigger function
CREATE OR REPLACE FUNCTION public.create_default_money_categories()
RETURNS trigger AS $$
BEGIN
  -- Insert default income categories
  INSERT INTO public.money_categories (name, type, user_id) VALUES
    ('Gaji', 'income', NEW.id),
    ('Bonus', 'income', NEW.id),
    ('Freelance', 'income', NEW.id),
    ('Bisnis', 'income', NEW.id),
    ('Lainnya', 'income', NEW.id);
  
  -- Insert default outcome categories
  INSERT INTO public.money_categories (name, type, user_id) VALUES
    ('Makanan & Minuman', 'outcome', NEW.id),
    ('Transportasi', 'outcome', NEW.id),
    ('Belanja', 'outcome', NEW.id),
    ('Hiburan', 'outcome', NEW.id),
    ('Kesehatan', 'outcome', NEW.id),
    ('Rumah Tangga', 'outcome', NEW.id),
    ('Lainnya', 'outcome', NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create default categories
DROP TRIGGER IF EXISTS on_auth_user_created_money_categories ON auth.users;
CREATE TRIGGER on_auth_user_created_money_categories
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.create_default_money_categories();