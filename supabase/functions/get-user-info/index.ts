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

    const { userId } = await req.json()
    
    if (!userId) {
      throw new Error('userId is required')
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.admin.getUserById(userId)
    
    if (userError) throw userError

    console.log('User metadata:', user?.user_metadata) // Debug log

    // Make sure we extract all necessary user data
    const userData = {
      email: user?.email || '',
      first_name: user?.user_metadata?.first_name || user?.user_metadata?.firstName || '',
      last_name: user?.user_metadata?.last_name || user?.user_metadata?.lastName || '',
    }

    console.log('Returning user data:', userData) // Debug log

    return new Response(
      JSON.stringify(userData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error in get-user-info:', error) // Debug log
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})