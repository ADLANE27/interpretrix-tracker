
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
    
    // Get VAPID key from Supabase database
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Try getting key from secrets table first
    const { data: secretData, error: secretError } = await supabaseAdmin
      .from('secrets')
      .select('value')
      .eq('name', 'VAPID_PUBLIC_KEY')
      .single();

    if (secretError) {
      console.error('[VAPID] Error getting key from secrets:', secretError);
      
      // Fall back to environment variable
      const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
      
      if (!vapidPublicKey) {
        console.error('[VAPID] Public key not found in environment');
        throw new Error('VAPID public key not configured');
      }

      // Validate the key format
      if (!/^[A-Za-z0-9\-_]+$/.test(vapidPublicKey)) {
        console.error('[VAPID] Invalid public key format from env');
        throw new Error('Invalid VAPID public key format');
      }

      console.log('[VAPID] Successfully retrieved public key from env');
      return new Response(
        JSON.stringify({ vapidPublicKey }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    if (!secretData?.value) {
      console.error('[VAPID] No value found in secrets');
      throw new Error('VAPID public key not found');
    }

    // Validate the key format
    if (!/^[A-Za-z0-9\-_]+$/.test(secretData.value)) {
      console.error('[VAPID] Invalid public key format from secrets');
      throw new Error('Invalid VAPID public key format');
    }

    console.log('[VAPID] Successfully retrieved public key from secrets');

    return new Response(
      JSON.stringify({ vapidPublicKey: secretData.value }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[VAPID] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        errorCode: 'VAPID_KEY_ERROR',
        details: 'Error retrieving VAPID public key. Please ensure it is properly configured.'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
