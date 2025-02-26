
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, first_name, last_name, password } = await req.json();

    // Créer l'utilisateur dans auth.users
    const { data: userData, error: createUserError } = await supabase.auth.admin.createUser({
      email,
      password: password || undefined,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
      },
    });

    if (createUserError) {
      console.error('Error creating user:', createUserError);
      throw createUserError;
    }

    // Ajouter le rôle admin
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userData.user.id,
        role: 'admin',
      });

    if (roleError) {
      console.error('Error adding user role:', roleError);
      throw roleError;
    }

    // Create admin profile
    const { error: profileError } = await supabase
      .from('admin_profiles')
      .insert({
        id: userData.user.id,
        email,
        first_name,
        last_name,
      });

    if (profileError) {
      console.error('Error creating admin profile:', profileError);
      throw profileError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in send-admin-invitation:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
