
-- Create or update a Supabase database function that handles interpreter status updates with transaction IDs
CREATE OR REPLACE FUNCTION update_interpreter_status(
  p_interpreter_id UUID,
  p_status TEXT,
  p_transaction_id TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  -- Update the interpreter status
  UPDATE public.interpreter_profiles
  SET 
    status = p_status,
    updated_at = now()
  WHERE id = p_interpreter_id;
  
  -- For debugging purposes, we could log the transaction in a separate table
  -- But this is optional and can be implemented later if needed
  
  -- Return success
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
