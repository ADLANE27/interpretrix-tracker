
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, content-range, content-disposition, content-length',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'content-range, content-disposition'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with admin privileges
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

    const { userId } = await req.json()
    
    if (!userId) {
      throw new Error('userId is required')
    }

    // Get user data using admin auth client
    const { data: { user }, error: userError } = await supabaseClient.auth.admin.getUserById(userId)
    
    if (userError) {
      console.error('Error fetching user:', userError)
      throw userError
    }

    if (!user) {
      throw new Error('User not found')
    }

    console.log('Raw user data:', user)
    console.log('User metadata:', user.user_metadata)

    // Extract user data with better error handling
    const firstName = user?.user_metadata?.first_name || 
                     user?.user_metadata?.firstName || 
                     user?.user_metadata?.given_name ||
                     user?.raw_user_meta_data?.first_name || 
                     user?.raw_user_meta_data?.firstName || 
                     ''

    const lastName = user?.user_metadata?.last_name || 
                    user?.user_metadata?.lastName || 
                    user?.user_metadata?.family_name ||
                    user?.raw_user_meta_data?.last_name || 
                    user?.raw_user_meta_data?.lastName || 
                    ''

    const userData = {
      email: user.email || '',
      first_name: firstName,
      last_name: lastName,
    }

    console.log('Processed user data:', userData)

    return new Response(
      JSON.stringify(userData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
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
