
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Enable realtime function loaded");

// Create a cache to store which tables have been enabled
const enabledTablesCache = new Map<string, boolean>();

// Function to handle enabling realtime for a table
async function enableRealtimeForTable(
  supabase: any,
  tableName: string
): Promise<{ success: boolean; message: string; cached?: boolean }> {
  // Check if table is already in the cache
  if (enabledTablesCache.get(tableName)) {
    console.log(`Table ${tableName} is already enabled (from cache)`);
    return { 
      success: true, 
      message: `Table ${tableName} is already enabled for realtime (cached)`,
      cached: true
    };
  }

  console.log(`Checking if table ${tableName} is already enabled for realtime`);
  // Check if the table is already enabled using the is_table_realtime_enabled function
  const { data: isEnabledData, error: isEnabledError } = await supabase
    .rpc('is_table_realtime_enabled', { table_name: tableName });
  
  if (isEnabledError) {
    console.error(`Error checking if table ${tableName} is enabled:`, isEnabledError);
    return {
      success: false,
      message: `Error checking if table is already enabled: ${isEnabledError.message}`
    };
  } 
  
  if (isEnabledData) {
    console.log(`Table ${tableName} is already enabled for realtime`);
    // Add to cache
    enabledTablesCache.set(tableName, true);
    return { 
      success: true, 
      message: `Table ${tableName} is already enabled for realtime` 
    };
  }

  console.log(`Enabling realtime for table: ${tableName}`);

  // Call the database function to enable realtime
  const { data, error } = await supabase
    .rpc('enable_realtime_for_table', { table_name: tableName });

  if (error) {
    console.error(`Error enabling realtime for table ${tableName}:`, error);
    return { 
      success: false, 
      message: `Error enabling realtime: ${error.message}`
    };
  }

  console.log(`Successfully called enable_realtime_for_table for ${tableName}:`, data);
  
  // Update cache on success
  if (data.success) {
    enabledTablesCache.set(tableName, true);
  }

  return data;
}

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
    
    // Extract table name(s) from request
    try {
      const body = await req.json();
      
      // Single table enablement
      if (typeof body.table === 'string') {
        const tableName = body.table;
        
        if (!tableName) {
          console.error("No table name provided in request");
          return new Response(
            JSON.stringify({ error: "Table name is required" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }
        
        const result = await enableRealtimeForTable(supabase, tableName);
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Multiple tables enablement
      if (Array.isArray(body.tables)) {
        const tableNames = body.tables.filter(t => typeof t === 'string');
        
        if (tableNames.length === 0) {
          console.error("No valid table names provided in request");
          return new Response(
            JSON.stringify({ error: "At least one valid table name is required" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }
        
        const results = {};
        for (const tableName of tableNames) {
          results[tableName] = await enableRealtimeForTable(supabase, tableName);
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            results 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Invalid request format. Provide 'table' or 'tables' parameter" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
  } catch (error) {
    console.error("Unexpected error in enable-realtime function:", error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
