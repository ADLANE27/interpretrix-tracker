import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import webPush from 'npm:web-push'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    console.log('Generating VAPID keys...')
    const vapidKeys = webPush.generateVAPIDKeys()
    console.log('VAPID keys generated:', vapidKeys)

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Store VAPID keys as secrets
    const { error: publicKeyError } = await supabaseAdmin.functions.setSecret(
      'VAPID_PUBLIC_KEY',
      vapidKeys.publicKey
    )

    if (publicKeyError) {
      console.error('Error storing public key:', publicKeyError)
      throw publicKeyError
    }

    const { error: privateKeyError } = await supabaseAdmin.functions.setSecret(
      'VAPID_PRIVATE_KEY',
      vapidKeys.privateKey
    )

    if (privateKeyError) {
      console.error('Error storing private key:', privateKeyError)
      throw privateKeyError
    }

    console.log('VAPID keys stored successfully')
    
    return new Response(
      JSON.stringify(vapidKeys),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 200 
      },
    )
  } catch (error) {
    console.error('Error generating or storing VAPID keys:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 500
      },
    )
  }
})