
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Get admin user from the token
    const { data: { user: adminUser }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !adminUser) {
      throw new Error('Invalid token')
    }

    // Verify that the user is an admin
    const { data: isAdmin, error: adminCheckError } = await supabase
      .rpc('is_admin')

    if (adminCheckError || !isAdmin) {
      throw new Error('Unauthorized: Only administrators can reset passwords')
    }

    // Get the user ID and new password from request body
    const { userId, password } = await req.json()

    if (!userId || !password) {
      throw new Error('Missing required fields')
    }

    // Use admin API to update the user's password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: password }
    )

    if (updateError) {
      throw updateError
    }

    console.log(`Password reset successful for user ${userId} by admin ${adminUser.id}`)

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
