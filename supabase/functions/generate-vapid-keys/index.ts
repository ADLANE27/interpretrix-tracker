
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const vapidKeys = webPush.generateVAPIDKeys();
    
    // Store the keys in Supabase secrets
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing configuration');
    }

    const secretsResponse = await fetch(`${supabaseUrl}/rest/v1/secrets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify([
        { name: 'VAPID_PUBLIC_KEY', value: vapidKeys.publicKey },
        { name: 'VAPID_PRIVATE_KEY', value: vapidKeys.privateKey }
      ])
    });

    if (!secretsResponse.ok) {
      throw new Error('Failed to store VAPID keys');
    }

    return new Response(
      JSON.stringify({ 
        publicKey: vapidKeys.publicKey,
        privateKey: vapidKeys.privateKey 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
