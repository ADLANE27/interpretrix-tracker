
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
    const { user_id, new_password } = await req.json()

    // Validate input
    if (!user_id || !new_password) {
      throw new Error('Missing required fields')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user_id,
      { password: new_password }
    )

    if (updateError) {
      throw updateError
    }

    // If user is an interpreter, update password_changed flag
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user_id)
      .single()

    if (roleData?.role === 'interpreter') {
      await supabase
        .from('interpreter_profiles')
        .update({ password_changed: true })
        .eq('id', user_id)
    }

    return new Response(
      JSON.stringify({ message: 'Password updated successfully' }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    )
  } catch (error) {
    console.error('Error in reset-user-password function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})
