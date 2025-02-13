
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    
    // Get VAPID key from environment
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    console.log('[VAPID] Environment check:', vapidPublicKey ? 'Found' : 'Not found')
    
    if (!vapidPublicKey) {
      console.error('[VAPID] No public key found')
      throw new Error('VAPID public key not configured')
    }

    // Just trim whitespace, don't modify the key itself
    const cleanKey = vapidPublicKey.trim()
    
    console.log('[VAPID] Key length:', cleanKey.length)
    
    return new Response(
      JSON.stringify({ vapidPublicKey: cleanKey }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        },
        status: 200 
      },
    )
  } catch (error) {
    console.error('[VAPID] Error:', error)
    
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
