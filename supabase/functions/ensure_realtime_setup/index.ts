
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const { table_name } = await req.json()
    
    if (!table_name) {
      return new Response(
        JSON.stringify({ error: 'table_name is required' }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    
    // Check if the user has admin privileges
    const { data: isAdmin, error: adminCheckError } = await supabaseClient.rpc('is_admin')
    
    if (adminCheckError || !isAdmin) {
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized. Only administrators can perform this action.',
          details: adminCheckError
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 403 }
      )
    }
    
    // Execute SQL to enable REPLICA IDENTITY FULL and add table to realtime publication
    const { data, error } = await supabaseClient.rpc('enable_realtime_for_table', {
      p_table_name: table_name
    })
    
    if (error) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to check realtime setup', 
          details: error 
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Realtime is properly set up for table ${table_name}`,
        data
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
