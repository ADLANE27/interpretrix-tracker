
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import * as base64 from "https://deno.land/std@0.168.0/encoding/base64.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function signECDSA(signingInput: string, privateKey: string): Promise<string> {
  try {
    // Convert base64 private key to raw bytes
    const rawPrivateKey = base64.decode(privateKey);

    // Import the private key
    const key = await crypto.subtle.importKey(
      'pkcs8',
      rawPrivateKey,
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      false,
      ['sign']
    );

    // Sign the input
    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      new TextEncoder().encode(signingInput)
    );

    // Convert signature to base64url
    let base64Signature = base64.encode(new Uint8Array(signature));
    base64Signature = base64Signature
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return base64Signature;
  } catch (error) {
    console.error('Error signing with ECDSA:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const { signingInput, subscription, payload, vapidPublicKey, vapidPrivateKey } = await req.json();

    if (!signingInput || !subscription || !payload || !vapidPublicKey || !vapidPrivateKey) {
      throw new Error('Missing required parameters');
    }

    console.log('Signing input received:', signingInput);
    console.log('Subscription:', subscription);

    // Sign the input with ECDSA
    const signature = await signECDSA(signingInput, vapidPrivateKey);
    console.log('Generated signature:', signature);

    // Create final JWT
    const jwt = `${signingInput}.${signature}`;
    console.log('Final JWT:', jwt);

    // Create authorization header
    const authHeader = `vapid t=${jwt}, k=${vapidPublicKey}`;

    // Send the push notification
    const pushResponse = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'TTL': '86400',
        'Content-Length': JSON.stringify(payload).length.toString(),
      },
      body: JSON.stringify(payload),
    });

    console.log('Push notification response:', pushResponse.status, await pushResponse.text());

    return new Response(
      JSON.stringify({
        success: pushResponse.ok,
        status: pushResponse.status,
        statusText: pushResponse.statusText,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in push notification function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
})
