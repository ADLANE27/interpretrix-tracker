
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

    console.log('Checking if user exists:', email)

    // First, check if the user already exists
    const { data: existingUsers, error: searchError } = await supabaseClient
      .from('user_roles')
      .select('user_id, role')
      .eq('role', 'admin')
      .eq('user_id', (
        await supabaseClient.auth.admin.listUsers({
          filters: {
            email: email
          }
        })
      ).data.users[0]?.id || '')

    if (searchError) {
      console.error('Error searching for existing user:', searchError)
      throw searchError
    }

    if (existingUsers && existingUsers.length > 0) {
      console.log('User already exists as admin')
      throw new Error('Un administrateur avec cette adresse email existe déjà')
    }

    // Create the user with provided password or generate a random one
    const generatedPassword = password || Math.random().toString(36).slice(-8)

    console.log('Creating admin user:', { email, first_name, last_name })

    // Create the user with email confirmation disabled (since we're creating an admin)
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
        userId: user.id 
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
