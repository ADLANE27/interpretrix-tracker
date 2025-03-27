
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Handle CORS preflight requests
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Extract the request body
    const { table } = await req.json();
    
    if (!table) {
      return new Response(
        JSON.stringify({ error: 'Table name is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Checking if table ${table} is already enabled for realtime`);

    // Check if the table is already in the supabase_realtime publication
    const { data: publicationData, error: publicationError } = await supabaseClient.rpc(
      'is_table_realtime_enabled',
      { table_name: table }
    );

    if (publicationError) {
      console.error('Error checking realtime status:', publicationError);
      throw publicationError;
    }

    if (publicationData) {
      console.log(`Table ${table} is already enabled for realtime`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Table ${table} is already enabled for realtime`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enable realtime for the table
    const { data, error } = await supabaseClient.rpc(
      'enable_realtime_for_table',
      { table_name: table }
    );

    if (error) {
      console.error('Error enabling realtime:', error);
      throw error;
    }

    console.log('Realtime enabled successfully:', data);

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in enable-realtime function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
})
