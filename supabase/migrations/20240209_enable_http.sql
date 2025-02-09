
-- Enable the http extension
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA public;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA http TO postgres;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA http TO postgres;
GRANT USAGE ON SCHEMA http TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA http TO authenticated;
GRANT USAGE ON SCHEMA http TO supabase_functions_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA http TO supabase_functions_admin;
