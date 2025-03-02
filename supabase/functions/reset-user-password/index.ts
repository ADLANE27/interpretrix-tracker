
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
      throw new Error('No authorization header')
    }

    console.log('Verifying admin user')

    // Get admin user from the token
    const { data: { user: adminUser }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !adminUser) {
      console.error('Invalid token:', userError)
      throw new Error('Invalid token')
    }

    console.log('Checking admin status for user:', adminUser.id)

    // Check if user is admin using the is_admin RPC function
    const { data: { is_admin }, error: adminCheckError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', adminUser.id)
      .eq('role', 'admin')
      .eq('active', true)
      .single()

    if (adminCheckError || !is_admin) {
      console.error('User is not an admin:', adminCheckError)
      throw new Error('Unauthorized: Only administrators can reset passwords')
    }

    console.log('Admin verified, processing password reset')

    // Get the user ID and new password from request body
    const { userId, password } = await req.json()

    if (!userId || !password) {
      console.error('Missing required fields')
      throw new Error('Missing required fields')
    }

    console.log('Resetting password for user:', userId)

    // Use admin API to update the user's password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: password }
    )

    if (updateError) {
      console.error('Error updating password:', updateError)
      throw updateError
    }

    console.log('Password reset successful')

    return new Response(
      JSON.stringify({ success: true, message: 'Password successfully updated' }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    )
  } catch (error) {
    console.error('Error in reset-user-password function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})
