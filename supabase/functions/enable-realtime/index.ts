
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Enable realtime function loaded");

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Extract table name from request
    const { table } = await req.json();
    
    if (!table) {
      return new Response(
        JSON.stringify({ error: "Table name is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Run SQL commands to enable realtime for the table
    const { data, error } = await supabase.rpc('enable_realtime_for_table', {
      table_name: table
    });

    if (error) {
      console.error("Error enabling realtime:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
