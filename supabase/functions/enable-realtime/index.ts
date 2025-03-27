
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Enable realtime function loaded");

// Create a cache to store which tables have been enabled
const enabledTablesCache = new Map<string, boolean>();

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Extract table name from request
    let table = '';
    
    try {
      const body = await req.json();
      table = body.table;
      
      if (!table) {
        console.error("No table name provided in request");
        return new Response(
          JSON.stringify({ error: "Table name is required" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check if table is already in the cache
    if (enabledTablesCache.get(table)) {
      console.log(`Table ${table} is already enabled (from cache)`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Table ${table} is already enabled for realtime (cached)` 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Checking if table ${table} is already enabled for realtime`);
    // Check if the table is already enabled using the is_table_realtime_enabled function
    const { data: isEnabledData, error: isEnabledError } = await supabase
      .rpc('is_table_realtime_enabled', { table_name: table });
    
    if (isEnabledError) {
      console.error(`Error checking if table ${table} is enabled:`, isEnabledError);
    } else if (isEnabledData) {
      console.log(`Table ${table} is already enabled for realtime`);
      // Add to cache
      enabledTablesCache.set(table, true);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Table ${table} is already enabled for realtime` 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Enabling realtime for table: ${table}`);

    // Call the database function to enable realtime
    const { data, error } = await supabase
      .rpc('enable_realtime_for_table', { table_name: table });

    if (error) {
      console.error(`Error enabling realtime for table ${table}:`, error);
      return new Response(
        JSON.stringify({ 
          error: error.message,
          details: "Error enabling realtime" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log(`Successfully called enable_realtime_for_table for ${table}:`, data);
    
    // Update cache on success
    if (data.success) {
      enabledTablesCache.set(table, true);
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error in enable-realtime function:", error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
