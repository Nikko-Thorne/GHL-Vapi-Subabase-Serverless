/*
  # Create cal schema and tables

  1. New Schema
    - Creates the `cal` schema for calendar-specific tables

  2. New Tables
    - `cal.schedules`: Stores available time slots
      - `id` (uuid, primary key)
      - `start_time` (timestamptz)
      - `end_time` (timestamptz)
      - `duration_minutes` (integer)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamptz)
    
    - `cal.bookings`: Stores calendar bookings
      - `id` (text, primary key)
      - `start_time` (timestamptz)
      - `end_time` (timestamptz)
      - `title` (text)
      - `attendee_name` (text)
      - `attendee_email` (text)
      - `attendee_phone` (text)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamptz)

  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create cal schema
CREATE SCHEMA IF NOT EXISTS cal;

-- Create schedules table
CREATE TABLE IF NOT EXISTS cal.schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 15,
  user_id uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_duration CHECK (duration_minutes > 0)
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS cal.bookings (
  id text PRIMARY KEY,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  title text NOT NULL,
  attendee_name text NOT NULL,
  attendee_email text NOT NULL,
  attendee_phone text NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Enable RLS
ALTER TABLE cal.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE cal.bookings ENABLE ROW LEVEL SECURITY;

-- Schedules policies
CREATE POLICY "Anyone can view schedules"
  ON cal.schedules
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their own schedules"
  ON cal.schedules
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Bookings policies
CREATE POLICY "Users can view their own bookings"
  ON cal.bookings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own bookings"
  ON cal.bookings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Grant usage on cal schema
GRANT USAGE ON SCHEMA cal TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA cal TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA cal TO authenticated;
