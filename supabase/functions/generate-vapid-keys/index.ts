
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js';
import webPush from 'npm:web-push';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[VAPID] Starting key generation process');
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate VAPID keys
    const vapidKeys = webPush.generateVAPIDKeys();
    console.log('[VAPID] Keys generated successfully');

    // Store the keys in the database
    const { error: insertError } = await supabaseAdmin
      .from('vapid_keys')
      .insert({
        public_key: vapidKeys.publicKey,
        private_key: vapidKeys.privateKey,
        is_active: true,
        status: 'active'
      });

    if (insertError) {
      console.error('[VAPID] Error inserting keys:', insertError);
      throw insertError;
    }

    console.log('[VAPID] Keys stored in database successfully');

    return new Response(
      JSON.stringify({ 
        publicKey: vapidKeys.publicKey,
        privateKey: vapidKeys.privateKey,
        message: 'VAPID keys generated and stored successfully'
      }),
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

