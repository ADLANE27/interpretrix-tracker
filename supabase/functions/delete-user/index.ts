
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Handle CORS preflight requests
const corsHandler = (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
}

export const deleteUserAndDependencies = async (userId: string, supabase: any) => {
  console.log(`[delete-user] Starting deletion process for user: ${userId}`)
  
  try {
    // 1. Delete all chat messages by the user
    const { error: chatMessagesError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('sender_id', userId)
    
    if (chatMessagesError) {
      console.error('[delete-user] Error deleting chat messages:', chatMessagesError)
      throw new Error(`Failed to delete chat messages: ${chatMessagesError.message}`)
    }

    // 2. Delete channel memberships
    const { error: channelMembersError } = await supabase
      .from('channel_members')
      .delete()
      .eq('user_id', userId)
    
    if (channelMembersError) {
      console.error('[delete-user] Error deleting channel members:', channelMembersError)
      throw new Error(`Failed to delete channel members: ${channelMembersError.message}`)
    }

    // 3. Delete message mentions
    const { error: mentionsError } = await supabase
      .from('message_mentions')
      .delete()
      .eq('mentioned_user_id', userId)
    
    if (mentionsError) {
      console.error('[delete-user] Error deleting message mentions:', mentionsError)
      throw new Error(`Failed to delete message mentions: ${mentionsError.message}`)
    }

    // 4. Delete interpreter connection status if exists
    const { error: connectionStatusError } = await supabase
      .from('interpreter_connection_status')
      .delete()
      .eq('interpreter_id', userId)
    
    if (connectionStatusError) {
      console.error('[delete-user] Error deleting connection status:', connectionStatusError)
      throw new Error(`Failed to delete connection status: ${connectionStatusError.message}`)
    }

    // 5. Check if user is the last admin
    const { data: adminCount, error: adminCountError } = await supabase
      .from('user_roles')
      .select('id', { count: 'exact' })
      .eq('role', 'admin')
      .eq('active', true)

    if (adminCountError) {
      console.error('[delete-user] Error checking admin count:', adminCountError)
      throw new Error(`Failed to check admin count: ${adminCountError.message}`)
    }

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single()

    if (adminCount === 1 && userRole?.role === 'admin') {
      throw new Error('Cannot delete the last admin user')
    }

    // 6. Delete from user_roles
    const { error: userRolesError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
    
    if (userRolesError) {
      console.error('[delete-user] Error deleting user roles:', userRolesError)
      throw new Error(`Failed to delete user roles: ${userRolesError.message}`)
    }

    // 7. Delete from interpreter_profiles or admin_profiles
    const { error: profileError } = await supabase
      .from('interpreter_profiles')
      .delete()
      .eq('id', userId)
    
    if (profileError) {
      const { error: adminProfileError } = await supabase
        .from('admin_profiles')
        .delete()
        .eq('id', userId)
      
      if (adminProfileError) {
        console.error('[delete-user] Error deleting admin profile:', adminProfileError)
        throw new Error(`Failed to delete admin profile: ${adminProfileError.message}`)
      }
    }

    // 8. Finally delete the auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(userId)
    
    if (authError) {
      console.error('[delete-user] Error deleting auth user:', authError)
      throw new Error(`Failed to delete auth user: ${authError.message}`)
    }

    console.log(`[delete-user] Successfully deleted user: ${userId}`)
    return { success: true }

  } catch (error) {
    console.error('[delete-user] Error in deletion process:', error)
    throw error
  }
}

serve(async (req) => {
  try {
    // Handle CORS
    const corsResponse = corsHandler(req)
    if (corsResponse) return corsResponse

    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get the request body
    const { userId } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Delete user and all dependencies
    await deleteUserAndDependencies(userId, supabaseClient)

    return new Response(
      JSON.stringify({ message: 'User deleted successfully' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('[delete-user] Error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    const status = errorMessage.includes('Cannot delete the last admin') ? 403 : 500

    return new Response(
      JSON.stringify({ 
        error: errorMessage
      }), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
