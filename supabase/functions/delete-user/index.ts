
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify the request is from an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      throw new Error('Unauthorized')
    }

    // Use maybeSingle() instead of single() to handle no results case
    const { data: userRoles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (rolesError) {
      console.error('Roles error:', rolesError)
      throw new Error('Error fetching user roles')
    }

    if (!userRoles || userRoles.role !== 'admin') {
      console.error('Not an admin. User roles:', userRoles)
      throw new Error('Unauthorized - Admin access required')
    }

    // Get the user ID to delete from request body
    const { userId } = await req.json()
    
    if (!userId) {
      throw new Error('User ID is required')
    }

    console.log('Attempting to delete user:', userId)

    // First delete from interpreter_connection_status
    const { error: connectionStatusDeleteError } = await supabaseClient
      .from('interpreter_connection_status')
      .delete()
      .eq('interpreter_id', userId)

    if (connectionStatusDeleteError) {
      console.error('Error deleting connection status:', connectionStatusDeleteError)
      throw new Error('Failed to delete connection status')
    }

    // Then delete from user_roles
    const { error: roleDeleteError } = await supabaseClient
      .from('user_roles')
      .delete()
      .eq('user_id', userId)

    if (roleDeleteError) {
      console.error('Error deleting user roles:', roleDeleteError)
      throw new Error('Failed to delete user roles')
    }

    // Then delete from interpreter_profiles if exists
    const { error: profileDeleteError } = await supabaseClient
      .from('interpreter_profiles')
      .delete()
      .eq('id', userId)

    if (profileDeleteError) {
      console.error('Error deleting interpreter profile:', profileDeleteError)
      // Don't throw here as the profile might not exist
    }

    // Finally delete the user from auth
    const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      throw deleteError
    }

    console.log('User deleted successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User deleted successfully' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in delete-user function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
