import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email, first_name, last_name, password } = await req.json()

    console.log('Creating admin user:', { email, first_name, last_name })

    // Create the user with provided password or generate a random one
    const generatedPassword = password || Math.random().toString(36).slice(-8)

    // Create the user
    const { data: { user }, error: createUserError } = await supabaseClient.auth.admin.createUser({
      email,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
      },
    })

    if (createUserError) {
      console.error('Error creating user:', createUserError)
      throw createUserError
    }

    if (!user) {
      throw new Error('No user returned after creation')
    }

    console.log('User created successfully:', user.id)

    // Create user role as admin
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: user.id,
        role: 'admin',
      })

    if (roleError) {
      console.error('Error creating user role:', roleError)
      throw roleError
    }

    console.log('Admin role assigned successfully')

    // Send welcome email with credentials
    const { error: emailError } = await supabaseClient.functions.invoke('send-welcome-email', {
      body: {
        email,
        password: generatedPassword,
        first_name,
      },
    })

    if (emailError) {
      console.error('Error sending welcome email:', emailError)
      // Don't throw here, as the user is already created
      // Just log the error and continue
    }

    return new Response(
      JSON.stringify({ message: 'Admin user created successfully', userId: user.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in send-admin-invitation:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})