
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    console.log('[VAPID] Getting public key');
    
    // First try getting from environment variable
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');

    if (!vapidPublicKey) {
      console.error('[VAPID] Public key not found in environment');
      throw new Error('VAPID public key not configured');
    }

    // Validate the key format
    if (!/^[A-Za-z0-9\-_]+$/.test(vapidPublicKey)) {
      console.error('[VAPID] Invalid public key format');
      throw new Error('Invalid VAPID public key format');
    }

    console.log('[VAPID] Successfully retrieved public key');

    return new Response(
      JSON.stringify({ vapidPublicKey }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[VAPID] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
