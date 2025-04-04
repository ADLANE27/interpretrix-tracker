import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { adminIds } = await req.json()
    
    if (!adminIds || !Array.isArray(adminIds)) {
      throw new Error('adminIds array is required')
    }

    const admins = []
    for (const adminId of adminIds) {
      const { data: { user }, error: userError } = await supabaseClient.auth.admin.getUserById(adminId)
      if (userError) continue
      if (user) {
        admins.push({
          id: user.id,
          email: user.email
        })
      }
    }

    return new Response(
      JSON.stringify(admins),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})