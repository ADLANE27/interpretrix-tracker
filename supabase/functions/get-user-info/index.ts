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

    const { userId } = await req.json()
    
    if (!userId) {
      throw new Error('userId is required')
    }

    console.log('Fetching user info for userId:', userId)

    // First try to get interpreter profile
    const { data: interpreterProfile, error: interpreterError } = await supabaseClient
      .from('interpreter_profiles')
      .select('first_name, last_name')
      .eq('id', userId)
      .single()

    if (interpreterProfile) {
      console.log('Found interpreter profile:', interpreterProfile)
      return new Response(
        JSON.stringify(interpreterProfile),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // If no interpreter profile found, get admin info from auth.users
    const { data: { user }, error: userError } = await supabaseClient.auth.admin.getUserById(userId)
    
    if (userError) throw userError

    console.log('Found user in auth.users:', user)

    return new Response(
      JSON.stringify({
        first_name: user?.user_metadata?.first_name || 'Admin',
        last_name: user?.user_metadata?.last_name || '',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error in get-user-info:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})