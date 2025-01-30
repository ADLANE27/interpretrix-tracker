import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const {
      email,
      first_name,
      last_name,
      role,
      employment_status,
      languages,
      phone_number,
      landline_phone,
      address,
      birth_country,
      nationality,
      tarif_15min,
    } = await req.json()

    // Generate a random password
    const password = Math.random().toString(36).slice(-8)

    // Create the user
    const { data: { user }, error: createUserError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
      },
    })

    if (createUserError) throw createUserError

    // Create user role
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: user.id,
        role,
      })

    if (roleError) throw roleError

    // Create interpreter profile
    const { error: profileError } = await supabaseClient
      .from('interpreter_profiles')
      .insert({
        id: user.id,
        first_name,
        last_name,
        email,
        employment_status,
        languages,
        phone_number,
        landline_phone,
        address,
        birth_country,
        nationality,
        tarif_15min,
        password_changed: false,
      })

    if (profileError) throw profileError

    // Send welcome email with credentials
    const { error: emailError } = await supabaseClient.functions.invoke('send-welcome-email', {
      body: {
        email,
        password,
        first_name,
      },
    })

    if (emailError) throw emailError

    return new Response(
      JSON.stringify({ message: 'User created successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})