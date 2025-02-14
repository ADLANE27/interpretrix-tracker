
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the VAPID keys from environment variables
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    console.log('[VAPID] Validating keys:', {
      publicKeyLength: vapidPublicKey?.length,
      privateKeyLength: vapidPrivateKey?.length
    });

    // Check if keys are present
    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys are not set in environment variables');
    }

    // Validate base64url format (only contains A-Z, a-z, 0-9, -, _)
    const isValidBase64Url = (str: string) => /^[A-Za-z0-9\-_]+$/.test(str);

    if (!isValidBase64Url(vapidPublicKey) || !isValidBase64Url(vapidPrivateKey)) {
      throw new Error('VAPID keys are not in valid base64url format');
    }

    // Additional length validation (VAPID keys should be around 87-88 characters for public, 43-44 for private)
    if (vapidPublicKey.length < 85 || vapidPublicKey.length > 90) {
      throw new Error('VAPID public key has invalid length');
    }

    if (vapidPrivateKey.length < 40 || vapidPrivateKey.length > 45) {
      throw new Error('VAPID private key has invalid length');
    }

    console.log('[VAPID] Keys validated successfully');

    return new Response(
      JSON.stringify({ 
        valid: true,
        message: 'VAPID keys are valid'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('[VAPID] Validation error:', error);

    return new Response(
      JSON.stringify({ 
        valid: false,
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
