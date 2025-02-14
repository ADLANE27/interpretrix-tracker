
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import webPush from 'npm:web-push';
import { createClient } from 'npm:@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[VAPID] Generating new VAPID keys');
    const vapidKeys = webPush.generateVAPIDKeys();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // First, deactivate any existing VAPID keys
    const { error: updateError } = await supabase
      .from('vapid_keys')
      .update({ is_active: false })
      .eq('is_active', true);

    if (updateError) {
      console.error('[VAPID] Error deactivating old keys:', updateError);
      throw updateError;
    }

    // Insert new VAPID keys
    const { error: insertError } = await supabase
      .from('vapid_keys')
      .insert({
        public_key: vapidKeys.publicKey,
        private_key: vapidKeys.privateKey,
        is_active: true
      });

    if (insertError) {
      console.error('[VAPID] Error inserting new keys:', insertError);
      throw insertError;
    }

    // Store keys in Supabase secrets
    const { error: secretsError } = await supabase
      .from('secrets')
      .insert([
        { name: 'VAPID_PUBLIC_KEY', value: vapidKeys.publicKey },
        { name: 'VAPID_PRIVATE_KEY', value: vapidKeys.privateKey }
      ])
      .onConflict('name')
      .merge();

    if (secretsError) {
      console.error('[VAPID] Error storing secrets:', secretsError);
      throw secretsError;
    }

    console.log('[VAPID] Successfully generated and stored new VAPID keys');

    return new Response(
      JSON.stringify({ 
        publicKey: vapidKeys.publicKey,
        metadata: {
          timestamp: new Date().toISOString(),
          success: true
        }
      }),
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
        details: 'Error generating or storing VAPID keys'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
