
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[VAPID] Starting VAPID key retrieval process');
    
    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // First try to get from environment
    let vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    
    // If not in environment, try to get from database
    if (!vapidPublicKey) {
      console.log('[VAPID] Key not found in environment, checking database...');
      const { data, error } = await supabaseAdmin
        .from('secrets')
        .select('value')
        .eq('name', 'VAPID_PUBLIC_KEY')
        .single()

      if (error) {
        console.error('[VAPID] Error fetching key from database:', error);
        throw error;
      }

      if (data) {
        vapidPublicKey = data.value;
        console.log('[VAPID] Key successfully retrieved from database');
      }
    }

    if (!vapidPublicKey) {
      console.error('[VAPID] Public key not found in environment or database');
      throw new Error('VAPID public key not configured');
    }
    
    console.log('[VAPID] Successfully retrieved VAPID public key');
    
    return new Response(
      JSON.stringify({ vapidPublicKey }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 200 
      },
    )
  } catch (error) {
    console.error('[VAPID] Error retrieving public key:', error);
    console.error('[VAPID] Error details:', {
      message: error.message,
      stack: error.stack
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 500
      },
    )
  }
})
