import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
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
    )

    const { data: publicKey, error: publicKeyError } = await supabaseAdmin
      .from('secrets')
      .select('value')
      .eq('name', 'VAPID_PUBLIC_KEY')
      .single()

    if (publicKeyError) throw publicKeyError

    const { data: privateKey, error: privateKeyError } = await supabaseAdmin
      .from('secrets')
      .select('value')
      .eq('name', 'VAPID_PRIVATE_KEY')
      .single()

    if (privateKeyError) throw privateKeyError

    return new Response(
      JSON.stringify({
        publicKey: publicKey.value,
        privateKey: privateKey.value
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 200 
      },
    )
  } catch (error) {
    console.error('Error retrieving VAPID keys:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
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