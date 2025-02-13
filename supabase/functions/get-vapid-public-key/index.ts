
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    
    // Get VAPID key directly from environment
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    console.log('[VAPID] Environment check:', vapidPublicKey ? 'Found' : 'Not found')
    
    if (!vapidPublicKey) {
      console.error('[VAPID] No public key found')
      throw new Error('VAPID public key not configured')
    }

    // Remove any whitespace
    const cleanKey = vapidPublicKey.trim()
    
    // Validate that the key is a valid base64 URL-safe string
    // This regex allows for base64url-safe characters: A-Z, a-z, 0-9, -, _, =, and .
    if (!/^[A-Za-z0-9\-_=.]+$/.test(cleanKey)) {
      console.error('[VAPID] Invalid key format:', cleanKey)
      throw new Error('Invalid VAPID key format - must be base64url encoded')
    }

    try {
      // Test if the key can be properly decoded
      const decoded = atob(cleanKey.replace(/[-_.]/g, char => {
        switch (char) {
          case '-': return '+';
          case '_': return '/';
          case '.': return '=';
          default: return char;
        }
      }))
      console.log('[VAPID] Key successfully validated')
    } catch (error) {
      console.error('[VAPID] Key decode error:', error)
      throw new Error('Invalid base64 encoding in VAPID key')
    }
    
    console.log('[VAPID] Successfully retrieved and validated VAPID public key')
    
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
