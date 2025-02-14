
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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
    console.log('[VAPID] Getting public key');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try to get the active VAPID key from the database
    const { data: vapidKey, error: dbError } = await supabase
      .from('vapid_keys')
      .select('public_key')
      .eq('is_active', true)
      .single();

    if (dbError) {
      console.error('[VAPID] Database error:', dbError);
      throw dbError;
    }

    if (!vapidKey) {
      console.error('[VAPID] No active VAPID key found');
      throw new Error('No active VAPID key found');
    }

    console.log('[VAPID] Successfully retrieved public key');
    
    return new Response(
      JSON.stringify({
        vapidPublicKey: vapidKey.public_key,
        metadata: {
          timestamp: new Date().toISOString(),
          keyLength: vapidKey.public_key.length
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
        details: 'Error retrieving VAPID public key'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
