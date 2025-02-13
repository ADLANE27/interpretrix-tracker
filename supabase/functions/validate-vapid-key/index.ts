
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: { ...corsHeaders }
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the current active VAPID key
    const { data: activeKey, error: keyError } = await supabaseAdmin
      .from('vapid_keys')
      .select('public_key, private_key')
      .eq('is_active', true)
      .single();

    if (keyError) {
      console.error('Error fetching VAPID key:', keyError);
      throw new Error('Failed to fetch VAPID key');
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

    // Validate key format
    const isValidFormat = (key: string) => /^[A-Za-z0-9\-_]+$/.test(key);
    const publicKeyValid = isValidFormat(activeKey.public_key);
    const privateKeyValid = isValidFormat(activeKey.private_key);

    return new Response(
      JSON.stringify({
        valid: publicKeyValid && privateKeyValid,
        publicKeyValid,
        privateKeyValid,
        details: {
          publicKey: publicKeyValid ? 'valid' : 'invalid format',
          privateKey: privateKeyValid ? 'valid' : 'invalid format'
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error validating VAPID key:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
