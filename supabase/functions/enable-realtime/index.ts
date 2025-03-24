
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Admin key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the request's body
    const reqJson = await req.json()
    const { table } = reqJson

    if (!table) {
      return new Response(
        JSON.stringify({ error: 'Table name is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    console.log(`Checking if table ${table} is already enabled for realtime`)

    // First check if the table is already enabled for realtime
    const { data: isEnabled, error: checkError } = await supabaseClient.rpc(
      'is_table_realtime_enabled',
      { table_name: table }
    )

    if (checkError) {
      console.error('Error checking if table is realtime enabled:', checkError)
      // Continue with enablement attempt
    } else if (isEnabled === true) {
      console.log(`Table ${table} is already enabled for realtime`)
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Table ${table} is already enabled for realtime`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    console.log(`Enabling realtime for table ${table}`)

    // Enable realtime for the table
    const { data, error } = await supabaseClient.rpc(
      'enable_realtime_for_table',
      { table_name: table }
    )

    if (error) {
      console.error('Error enabling realtime:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }

    console.log(`Successfully enabled realtime for table ${table}:`, data)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Realtime enabled for table: ${table}`,
        data
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Unexpected error', details: err.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
