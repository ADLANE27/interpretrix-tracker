
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

    const { email, first_name, last_name, role, ...additionalData } = await req.json()
    console.log(`Creating user with role ${role}: ${email}`)

    // Create user in auth
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password: Math.random().toString(36).slice(-8), // Random password
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
      },
    })

    if (authError) throw authError

    // Create user role
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role,
      })

    if (roleError) throw roleError

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
