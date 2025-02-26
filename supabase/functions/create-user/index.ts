
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

    // Get request data
    const { email, first_name, last_name, role, password, ...additionalData } = await req.json()
    console.log(`Creating new user with role ${role}: ${email}`)

    // Create user in auth with provided or random password
    const { data: authData, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      password: password || Math.random().toString(36).slice(-8),
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
      },
    })

    if (createError) {
      console.error('Error creating auth user:', createError)
      throw createError
    }

    // Create user role
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role,
      })

    if (roleError) {
      console.error('Error creating user role:', roleError)
      throw roleError
    }

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

      if (profileError) {
        console.error('Error creating interpreter profile:', profileError)
        throw profileError
      }
    }

    // Don't forget to send a welcome email with the generated password if no password was provided
    if (!password) {
      // Here you would typically integrate with your email service
      console.log('TODO: Send welcome email with generated password to:', email)
    }

    return new Response(
      JSON.stringify({ 
        id: authData.user.id,
        message: 'User created successfully'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in create-user function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred while creating the user'
      }),
      { 
        status: error.status || 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
