
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

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
    // Get VAPID keys from secrets
    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')

    if (!publicKey || !privateKey) {
      throw new Error('VAPID keys not configured')
    }

    // Only return the public key to the client
    return new Response(
      JSON.stringify({
        publicKey
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in get-vapid-keys:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500,
      },
    )
  }
})
