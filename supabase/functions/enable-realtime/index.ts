
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

    console.log(`Enabling realtime for table: ${table}`);

    // Run SQL commands to enable realtime for the table
    try {
      // 1. Set REPLICA IDENTITY to FULL to ensure we get all necessary data
      console.log(`Attempting to set REPLICA IDENTITY FULL for ${table}`);
      const replicaResult = await supabase.rpc('execute_sql', {
        sql_statement: `ALTER TABLE ${table} REPLICA IDENTITY FULL;`
      });

      if (replicaResult.error) {
        console.error(`Error setting REPLICA IDENTITY for ${table}:`, replicaResult.error);
        if (replicaResult.error.message?.includes("permission denied")) {
          return new Response(
            JSON.stringify({ 
              error: "Permission denied when setting REPLICA IDENTITY", 
              details: replicaResult.error.message 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
          );
        }
      } else {
        console.log(`Successfully set REPLICA IDENTITY FULL for ${table}`);
      }

      // 2. Add the table to the supabase_realtime publication
      console.log(`Attempting to add ${table} to supabase_realtime publication`);
      const publicationResult = await supabase.rpc('execute_sql', {
        sql_statement: `
          ALTER PUBLICATION supabase_realtime ADD TABLE ${table};
        `
      });

      if (publicationResult.error) {
        console.error(`Error adding ${table} to publication:`, publicationResult.error);
        // If we fail here, check if it's because the table is already in the publication
        if (publicationResult.error.message?.includes("already in publication")) {
          console.log(`Table ${table} is already in the publication`);
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: `Table ${table} is already enabled for realtime` 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        if (publicationResult.error.message?.includes("permission denied")) {
          return new Response(
            JSON.stringify({ 
              error: "Permission denied when adding table to publication", 
              details: publicationResult.error.message 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
          );
        }
        
        return new Response(
          JSON.stringify({ 
            error: publicationResult.error.message,
            details: "Error adding table to publication"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      console.log(`Successfully enabled realtime for table: ${table}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Realtime enabled for table: ${table}` 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (sqlError) {
      console.error(`SQL execution error for table ${table}:`, sqlError);
      return new Response(
        JSON.stringify({ error: "Error executing SQL commands", details: sqlError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
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
