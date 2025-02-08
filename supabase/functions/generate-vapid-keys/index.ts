
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import webPush from 'npm:web-push'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function isValidBase64UrlSafe(str: string): boolean {
  return /^[A-Za-z0-9\-_]+$/.test(str);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[VAPID] Starting key generation process')
    
    // Try up to 3 times to generate valid keys
    let vapidKeys;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        vapidKeys = webPush.generateVAPIDKeys();
        console.log('[VAPID] Generated keys, validating format...')
        
        if (isValidBase64UrlSafe(vapidKeys.publicKey) && 
            isValidBase64UrlSafe(vapidKeys.privateKey)) {
          console.log('[VAPID] Valid keys generated')
          break;
        }
        
        console.log('[VAPID] Invalid key format, retrying...')
        attempts++;
      } catch (genError) {
        console.error('[VAPID] Key generation error:', genError)
        attempts++;
        if (attempts === maxAttempts) throw genError;
      }
    }

    if (!vapidKeys || !isValidBase64UrlSafe(vapidKeys.publicKey) || 
        !isValidBase64UrlSafe(vapidKeys.privateKey)) {
      throw new Error('Failed to generate valid VAPID keys after multiple attempts')
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

    console.log('[VAPID] Storing public key...')
    const { error: publicKeyError } = await supabaseAdmin
      .from('secrets')
      .upsert({ 
        name: 'VAPID_PUBLIC_KEY',
        value: vapidKeys.publicKey
      }, {
        onConflict: 'name'
      })

    if (publicKeyError) {
      console.error('[VAPID] Error storing public key:', publicKeyError)
      throw publicKeyError
    }

    console.log('[VAPID] Storing private key...')
    const { error: privateKeyError } = await supabaseAdmin
      .from('secrets')
      .upsert({ 
        name: 'VAPID_PRIVATE_KEY',
        value: vapidKeys.privateKey
      }, {
        onConflict: 'name'
      })

    if (privateKeyError) {
      console.error('[VAPID] Error storing private key:', privateKeyError)
      throw privateKeyError
    }

    console.log('[VAPID] Keys stored successfully')
    
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
    console.error('[VAPID] Error:', error.message)
    console.error('[VAPID] Stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.stack
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
