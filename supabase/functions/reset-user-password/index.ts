
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting password reset process')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header provided')
      throw { status: 401, message: 'Authorization header is required' }
    }

    console.log('Verifying admin user')

    // Get admin user from the token
    const { data: { user: adminUser }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !adminUser) {
      console.error('Invalid token:', userError)
      throw { status: 401, message: 'Invalid authentication token' }
    }

    console.log('Checking admin status for user:', adminUser.id)

    // Check if user is admin
    const { data: adminRole, error: adminCheckError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', adminUser.id)
      .eq('role', 'admin')
      .eq('active', true)
      .maybeSingle()

    if (adminCheckError) {
      console.error('Error checking admin role:', adminCheckError)
      throw { status: 500, message: 'Error verifying admin privileges' }
    }

    if (!adminRole) {
      console.error('User is not an admin')
      throw { status: 403, message: 'Unauthorized: Only administrators can reset passwords' }
    }

    // Get the user ID and new password from request body
    let body
    try {
      body = await req.json()
    } catch (e) {
      throw { status: 400, message: 'Invalid request body' }
    }

    const { userId, password } = body

    if (!userId || !password) {
      console.error('Missing required fields')
      throw { status: 400, message: 'User ID and password are required' }
    }

    console.log('Resetting password for user:', userId)

    // Use admin API to update the user's password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: password }
    )

    if (updateError) {
      console.error('Error updating password:', updateError)
      throw { status: 500, message: updateError.message }
    }

    console.log('Password reset successful')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Password successfully updated' 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    )
  } catch (error) {
    console.error('Error in reset-user-password function:', error)
    const status = error.status || 500
    const message = error.message || 'An unexpected error occurred'
    
    return new Response(
      JSON.stringify({ 
        success: false,
        message: message
      }),
      { 
        status: status,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})
