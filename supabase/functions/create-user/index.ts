
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the JWT token from the request header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the JWT token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid token')
    }

    // Check if the user is an admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || !roleData || roleData.role !== 'admin') {
      throw new Error('User is not an admin')
    }

    const { email, first_name, last_name, role, ...additionalData } = await req.json()
    console.log(`Admin ${user.email} creating new user with role ${role}: ${email}`)

    // Create user in auth
    const { data: authData, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      password: Math.random().toString(36).slice(-8), // Random password
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
      },
    })

    if (createError) throw createError

    // Create user role
    const { error: newRoleError } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role,
      })

    if (newRoleError) throw newRoleError

    // If interpreter, create profile
    if (role === 'interpreter') {
      const { error: profileError } = await supabaseClient
        .from('interpreter_profiles')
        .insert({
          id: authData.user.id,
          first_name,
          last_name,
          email,
          ...additionalData,
          password_changed: false,
        })

      if (profileError) throw profileError
    }

    return new Response(
      JSON.stringify({ id: authData.user.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error creating user:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
