
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import webPush from 'npm:web-push'

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
    console.log('[VAPID] Starting key generation')
    
    // Generate VAPID keys
    const vapidKeys = webPush.generateVAPIDKeys()
    
    console.log('[VAPID] Keys generated successfully')
    console.log('[VAPID] Public key format check:', /^[A-Za-z0-9\-_]+$/.test(vapidKeys.publicKey))
    console.log('[VAPID] Public key length:', vapidKeys.publicKey.length)
    
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
