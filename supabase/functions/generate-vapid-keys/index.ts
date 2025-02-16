
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import webpush from 'npm:web-push';
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

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    // Check if user is admin
    const { data: roles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roles?.role !== 'admin') {
      throw new Error('Unauthorized - Admin access required');
    }

    // Generate new VAPID keys
    const vapidKeys = webpush.generateVAPIDKeys();
    console.log('[VAPID] Generated new keys');

    // Store keys in database
    const { data: keyData, error: keyError } = await supabaseAdmin
      .from('vapid_keys')
      .insert({
        public_key: vapidKeys.publicKey,
        private_key: vapidKeys.privateKey,
        created_by: user.id,
        is_active: true, // This will trigger our RLS policy to deactivate other keys
        status: 'active'
      })
      .select()
      .single();

    if (keyError) {
      console.error('[VAPID] Error storing keys:', keyError);
      throw new Error('Failed to store VAPID keys');
    }

    console.log('[VAPID] Keys stored successfully');

    return new Response(
      JSON.stringify({
        success: true,
        publicKey: vapidKeys.publicKey,
        created_at: keyData.created_at
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
        details: 'Failed to generate VAPID keys'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message.includes('Unauthorized') ? 403 : 500
      }
    );
  }
});
