
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    })
  }

  try {
    console.log('[VAPID] Starting VAPID key retrieval process')
    
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

    // First try to get from environment
    let vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    console.log('[VAPID] Checking environment variable:', vapidPublicKey ? 'Found' : 'Not found')
    
    // If not in environment, try to get from database
    if (!vapidPublicKey) {
      console.log('[VAPID] Key not found in environment, checking database...')
      const { data, error } = await supabaseAdmin
        .from('secrets')
        .select('value')
        .eq('name', 'VAPID_PUBLIC_KEY')
        .single()

      if (error) {
        console.error('[VAPID] Database error:', error)
        throw new Error('Failed to retrieve VAPID key from database')
      }

      if (data) {
        vapidPublicKey = data.value
        console.log('[VAPID] Key retrieved from database')
      }
    }

    if (!vapidPublicKey) {
      console.error('[VAPID] No public key found')
      throw new Error('VAPID public key not configured')
    }

    // Validate key format
    if (!isValidBase64UrlSafe(vapidPublicKey)) {
      console.error('[VAPID] Invalid key format:', vapidPublicKey)
      // Generate new keys if the current one is invalid
      const { data: newKeys, error: genError } = await supabaseAdmin.functions.invoke('generate-vapid-keys')
      if (genError || !newKeys?.publicKey) {
        console.error('[VAPID] Failed to generate new keys:', genError)
        throw new Error('Failed to generate valid VAPID keys')
      }
      vapidPublicKey = newKeys.publicKey
      console.log('[VAPID] Generated and stored new valid keys')
    }
    
    console.log('[VAPID] Successfully retrieved valid VAPID public key')
    
    return new Response(
      JSON.stringify({ vapidPublicKey }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
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
