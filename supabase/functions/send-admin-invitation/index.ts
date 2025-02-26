
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  console.log('Received request:', req.method)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request')
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Parsing request body...')
    const { email, first_name, last_name, password } = await req.json()
    
    console.log('Validating input...')
    if (!email || !first_name || !last_name) {
      throw new Error('Email, first name, and last name are required')
    }

    console.log('Checking if user exists:', email)

    // First, check if the user already exists as admin
    const { data: { users }, error: listError } = await supabaseClient.auth.admin.listUsers({
      filters: {
        email: email
      }
    })

    if (listError) {
      console.error('Error listing users:', listError)
      throw listError
    }

    const existingUserId = users?.[0]?.id

    if (existingUserId) {
      const { data: existingRoles, error: rolesError } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', existingUserId)
        .eq('role', 'admin')

      if (rolesError) {
        console.error('Error checking existing roles:', rolesError)
        throw rolesError
      }

      if (existingRoles && existingRoles.length > 0) {
        console.log('User already exists as admin')
        throw new Error('Un administrateur avec cette adresse email existe déjà')
      }
    }

    // Generate password if not provided
    const generatedPassword = password || Math.random().toString(36).slice(-8)

    console.log('Creating admin user:', { email, first_name, last_name })

    // Create the user with email confirmation disabled
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
      throw new Error('Aucun utilisateur créé')
    }

    console.log('User created successfully:', user.id)

    // Create user role as admin
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: user.id,
        role: 'admin',
        active: true
      })

    if (roleError) {
      console.error('Error creating user role:', roleError)
      // If we fail to create the role, delete the user
      await supabaseClient.auth.admin.deleteUser(user.id)
      throw roleError
    }

    console.log('Admin role assigned successfully')

    return new Response(
      JSON.stringify({ 
        message: 'Administrateur créé avec succès',
        userId: user.id,
        password: generatedPassword // Include password in response if it was generated
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in send-admin-invitation:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.details || 'No additional details available'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
