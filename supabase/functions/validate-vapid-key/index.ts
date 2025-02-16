
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get active VAPID key
    const { data: activeKey, error: keyError } = await supabaseAdmin
      .from('vapid_keys')
      .select('public_key, private_key, created_at')
      .eq('is_active', true)
      .single();

    if (keyError) {
      console.error('[VAPID] Error getting active key:', keyError);
      throw new Error('Failed to get active VAPID key');
    }

    if (!activeKey) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'No active VAPID key found'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      );
    }

    // Basic format validation
    const isValidBase64Url = (key: string) => /^[A-Za-z0-9\-_]+$/.test(key);
    const publicKeyValid = isValidBase64Url(activeKey.public_key);
    const privateKeyValid = isValidBase64Url(activeKey.private_key);

    return new Response(
      JSON.stringify({
        valid: publicKeyValid && privateKeyValid,
        publicKeyValid,
        privateKeyValid,
        details: {
          publicKey: activeKey.public_key,
          privateKey: activeKey.private_key
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
        details: 'Failed to validate VAPID keys'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
