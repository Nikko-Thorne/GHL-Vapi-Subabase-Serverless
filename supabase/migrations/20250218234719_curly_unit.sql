/*
  # Calendar Functions Migration

  1. Functions Created
    - fn_check_availability: Checks time slot availability
    - fn_book_appointment: Books a new appointment
    - fn_get_calendar_events: Retrieves calendar events for a date range

  2. Changes
    - Added external_booking_id column to appointments table
    - Granted execute permissions to authenticated users

  3. Security
    - All functions use SECURITY DEFINER
    - Proper search_path set for security
*/

-- Function to check availability
CREATE OR REPLACE FUNCTION fn_check_availability(
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_duration_minutes int DEFAULT 15
)
RETURNS TABLE (
  slot_start timestamptz,
  slot_end timestamptz,
  is_available boolean
) SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.start_time as slot_start,
    a.end_time as slot_end,
    CASE WHEN b.id IS NULL THEN true ELSE false END as is_available
  FROM 
    cal.schedules a
    LEFT JOIN appointments b ON 
      b.start_time < a.end_time AND 
      b.end_time > a.start_time
  WHERE 
    a.start_time >= p_start_time AND 
    a.end_time <= p_end_time AND
    a.duration_minutes = p_duration_minutes
  ORDER BY a.start_time;
END;
$$;

-- Function to book appointment
CREATE OR REPLACE FUNCTION fn_book_appointment(
  p_start_time timestamptz,
  p_title text,
  p_client_name text,
  p_client_email text,
  p_client_phone text,
  p_duration_minutes int DEFAULT 15
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_appointment_id uuid;
  v_end_time timestamptz;
  v_booking_id text;
BEGIN
  -- Calculate end time
  v_end_time := p_start_time + (p_duration_minutes || ' minutes')::interval;
  
  -- Check if slot is available
  IF NOT EXISTS (
    SELECT 1 FROM fn_check_availability(p_start_time, v_end_time, p_duration_minutes)
    WHERE is_available = true
  ) THEN
    RAISE EXCEPTION 'Time slot is not available';
  END IF;

  -- Create booking in Cal.com
  INSERT INTO cal.bookings (
    start_time,
    end_time,
    title,
    attendee_name,
    attendee_email,
    attendee_phone
  ) VALUES (
    p_start_time,
    v_end_time,
    p_title,
    p_client_name,
    p_client_email,
    p_client_phone
  ) RETURNING id INTO v_booking_id;

  -- Create local appointment record
  INSERT INTO appointments (
    start_time,
    end_time,
    title,
    description,
    user_id,
    external_booking_id
  ) VALUES (
    p_start_time,
    v_end_time,
    p_title,
    format('Client: %s, Phone: %s', p_client_name, p_client_phone),
    auth.uid(),
    v_booking_id
  ) RETURNING id INTO v_appointment_id;

  RETURN v_appointment_id;
END;
$$;

-- Function to get calendar events
CREATE OR REPLACE FUNCTION fn_get_calendar_events(
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  id uuid,
  title text,
  start_time timestamptz,
  end_time timestamptz,
  client_name text,
  client_email text,
  client_phone text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.title,
    a.start_time,
    a.end_time,
    (regexp_matches(a.description, 'Client: ([^,]+)'))[1] as client_name,
    b.attendee_email as client_email,
    (regexp_matches(a.description, 'Phone: ([^,]+)'))[1] as client_phone
  FROM appointments a
  LEFT JOIN cal.bookings b ON b.id = a.external_booking_id
  WHERE 
    a.user_id = auth.uid() AND
    DATE(a.start_time) >= p_start_date AND
    DATE(a.end_time) <= p_end_date
  ORDER BY a.start_time;
END;
$$;

-- Add external_booking_id column to appointments if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'external_booking_id'
  ) THEN
    ALTER TABLE appointments ADD COLUMN external_booking_id text;
  END IF;
END $$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION fn_check_availability TO authenticated;
GRANT EXECUTE ON FUNCTION fn_book_appointment TO authenticated;
GRANT EXECUTE ON FUNCTION fn_get_calendar_events TO authenticated;
