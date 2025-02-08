
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import webPush from 'npm:web-push'
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
    console.log('Generating VAPID keys...')
    const vapidKeys = webPush.generateVAPIDKeys()
    console.log('Raw VAPID keys generated:', vapidKeys)

    // Validate key format
    if (!vapidKeys.publicKey || !vapidKeys.privateKey || 
        !/^[A-Za-z0-9\-_]+$/.test(vapidKeys.publicKey) || 
        !/^[A-Za-z0-9\-_]+$/.test(vapidKeys.privateKey)) {
      throw new Error('Generated VAPID keys are not in valid URL-safe base64 format')
    }

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('Storing public key...')
    const { error: publicKeyError } = await supabaseAdmin
      .from('secrets')
      .upsert({ 
        name: 'VAPID_PUBLIC_KEY',
        value: vapidKeys.publicKey
      }, {
        onConflict: 'name'
      })

    if (publicKeyError) {
      console.error('Error storing public key:', publicKeyError)
      throw publicKeyError
    }

    console.log('Storing private key...')
    const { error: privateKeyError } = await supabaseAdmin
      .from('secrets')
      .upsert({ 
        name: 'VAPID_PRIVATE_KEY',
        value: vapidKeys.privateKey
      }, {
        onConflict: 'name'
      })

    if (privateKeyError) {
      console.error('Error storing private key:', privateKeyError)
      throw privateKeyError
    }

    console.log('VAPID keys stored successfully')
    
    return new Response(
      JSON.stringify({
        publicKey: vapidKeys.publicKey,
        privateKey: vapidKeys.privateKey
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 200 
      },
    )
  } catch (error) {
    console.error('Error in generate-vapid-keys:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
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
