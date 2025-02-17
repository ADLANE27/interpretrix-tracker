
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import webPush from 'https://esm.sh/web-push@3.6.6';

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
        Insert: {
          id?: string;
          public_key: string;
          private_key: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          expires_at?: string | null;
          status?: 'active' | 'expired' | 'revoked';
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
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

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

    // Generate VAPID keys
    const vapidKeys = webPush.generateVAPIDKeys();

    // Store VAPID keys in database
    const { data, error } = await supabaseClient
      .from('vapid_keys')
      .insert({
        public_key: vapidKeys.publicKey,
        private_key: vapidKeys.privateKey,
        is_active: true, // This will automatically deactivate other keys due to our trigger
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Return only the public key
    return new Response(
      JSON.stringify({
        public_key: data.public_key,
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
