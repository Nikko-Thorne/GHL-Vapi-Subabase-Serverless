/*
  # Create VAPI data capture function

  1. New Function
    - `fn_capture_vapi_data`: Captures and stores VAPI interaction data
      - Stores request details, function calls, and responses
      - Includes timestamps and request metadata
      - Enables tracking and analysis of VAPI interactions

  2. New Table
    - `vapi_logs`: Stores VAPI interaction data
      - `id` (uuid, primary key)
      - `request_id` (text)
      - `function_name` (text)
      - `parameters` (jsonb)
      - `response` (jsonb)
      - `created_at` (timestamptz)

  3. Security
    - Enable RLS on the logs table
    - Add policies for authenticated users
*/

-- Create vapi_logs table
CREATE TABLE IF NOT EXISTS vapi_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text NOT NULL,
  function_name text NOT NULL,
  parameters jsonb NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE vapi_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing logs
CREATE POLICY "Authenticated users can view logs"
  ON vapi_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Create the capture function
CREATE OR REPLACE FUNCTION fn_capture_vapi_data(
  p_request_id text,
  p_function_name text,
  p_parameters jsonb,
  p_response jsonb
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert the VAPI interaction data
  INSERT INTO vapi_logs (
    request_id,
    function_name,
    parameters,
    response,
    created_at
  ) VALUES (
    p_request_id,
    p_function_name,
    p_parameters,
    p_response,
    now()
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION fn_capture_vapi_data TO authenticated;
