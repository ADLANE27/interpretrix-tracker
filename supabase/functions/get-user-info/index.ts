
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      throw new Error('Invalid token')
    }

    // Get user role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role, active')
      .eq('user_id', user.id)
      .single()

    if (roleError) {
      throw roleError
    }

    // Get additional profile info if interpreter
    let profile = null
    if (roleData.role === 'interpreter') {
      const { data: interpreterData, error: interpreterError } = await supabase
        .from('interpreter_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!interpreterError) {
        profile = interpreterData
      }
    }

    console.log('Raw user data:', JSON.stringify(user, null, 2))

    return new Response(
      JSON.stringify({
        id: user.id,
        email: user.email,
        role: roleData.role,
        active: roleData.active,
        profile,
        metadata: user.user_metadata
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    )
  } catch (error) {
    console.error('Error in get-user-info function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 401,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})
