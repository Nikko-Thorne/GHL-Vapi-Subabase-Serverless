/*
  # Calendar Schema

  1. New Tables
    - `appointments`
      - `id` (uuid, primary key)
      - `start_time` (timestamptz)
      - `end_time` (timestamptz)
      - `title` (text)
      - `description` (text)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `availability`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `day_of_week` (integer, 0-6)
      - `start_time` (time)
      - `end_time` (time)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own appointments
    - Add policies for reading availability
*/

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  title text NOT NULL,
  description text,
  user_id uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Create availability table
CREATE TABLE IF NOT EXISTS availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  UNIQUE (user_id, day_of_week)
);

-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

-- Appointments policies
CREATE POLICY "Users can view their own appointments"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own appointments"
  ON appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own appointments"
  ON appointments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own appointments"
  ON appointments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Availability policies
CREATE POLICY "Anyone can view availability"
  ON availability
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their own availability"
  ON availability
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
