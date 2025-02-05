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

    const { searchQuery } = await req.json()

    // Get admin users from user_roles that match the search
    const { data: adminRoles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')

    if (rolesError) throw rolesError

    if (!adminRoles?.length) {
      return new Response(
        JSON.stringify([]),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    // Get admin user details from auth.users
    const adminIds = adminRoles.map(role => role.user_id)
    const { data: adminUsers, error: usersError } = await supabaseClient.auth.admin.listUsers()

    if (usersError) throw usersError

    const matchingAdmins = adminUsers.users
      .filter(user => adminIds.includes(user.id))
      .filter(user => {
        const searchLower = searchQuery.toLowerCase()
        const email = user.email?.toLowerCase() || ''
        const firstName = (user.user_metadata?.first_name || '').toLowerCase()
        const lastName = (user.user_metadata?.last_name || '').toLowerCase()
        
        return email.includes(searchLower) ||
               firstName.includes(searchLower) ||
               lastName.includes(searchLower)
      })
      .map(user => ({
        id: user.id,
        email: user.email,
        first_name: user.user_metadata?.first_name || '',
        last_name: user.user_metadata?.last_name || '',
        role: 'admin'
      }))

    return new Response(
      JSON.stringify(matchingAdmins),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in search-admin-users:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})