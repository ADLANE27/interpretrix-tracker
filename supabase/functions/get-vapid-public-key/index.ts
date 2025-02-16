
import { serve } from 'https://deno.fresh.dev/std@v1/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Database {
  public: {
    Tables: {
      vapid_keys: {
        Row: {
          id: string;
          public_key: string;
          private_key: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          expires_at: string | null;
          status: 'active' | 'expired' | 'revoked';
        };
      };
    };
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get active VAPID key
    const { data, error } = await supabaseClient
      .from('vapid_keys')
      .select('public_key')
      .eq('is_active', true)
      .eq('status', 'active')
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('No active VAPID key found');
    }

    return new Response(
      JSON.stringify({
        vapidPublicKey: data.public_key,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
