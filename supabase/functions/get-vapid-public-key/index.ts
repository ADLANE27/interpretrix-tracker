
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
      console.log('VAPID key not found in environment, checking database...')
      const { data, error } = await supabaseAdmin
        .from('secrets')
        .select('value')
        .eq('name', 'VAPID_PUBLIC_KEY')
        .single()

      if (error) {
        console.error('Error fetching VAPID key from database:', error)
        throw error
      }

      if (data) {
        vapidPublicKey = data.value
        console.log('VAPID key retrieved from database')
      }
    }

    if (!vapidPublicKey) {
      console.error('VAPID public key not found in environment or database')
      throw new Error('VAPID public key not configured')
    }
    
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
    console.error('Error retrieving VAPID public key:', error)
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
