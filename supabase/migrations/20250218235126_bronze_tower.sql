/*
  # VAPI Data Capture Function Update

  1. Changes
    - Drop existing function to avoid conflicts
    - Create enhanced version with user_id parameter
    - Add input validation
    - Improve error handling and logging

  2. Security
    - Function uses SECURITY DEFINER
    - Proper search_path set for security
*/

-- Drop existing function if it exists (all versions)
DROP FUNCTION IF EXISTS fn_capture_vapi_data(text, text, jsonb, jsonb);
DROP FUNCTION IF EXISTS fn_capture_vapi_data(text, text, jsonb, jsonb, uuid);

-- Create the enhanced capture function
CREATE OR REPLACE FUNCTION fn_capture_vapi_data(
  p_request_id text,
  p_function_name text,
  p_parameters jsonb,
  p_response jsonb,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validate input
  IF p_request_id IS NULL OR p_function_name IS NULL THEN
    RAISE EXCEPTION 'request_id and function_name are required';
  END IF;

  -- Insert the VAPI interaction data
  INSERT INTO vapi_logs (
    request_id,
    function_name,
    parameters,
    response,
    user_id,
    created_at
  ) VALUES (
    p_request_id,
    p_function_name,
    p_parameters,
    p_response,
    p_user_id,
    now()
  );

  -- Log to Supabase's internal logging if needed
  -- This helps with debugging and monitoring
  RAISE NOTICE 'VAPI interaction logged: % - %', p_request_id, p_function_name;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION fn_capture_vapi_data(text, text, jsonb, jsonb, uuid) TO authenticated;
