
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface AdminData {
  email: string;
  first_name: string;
  last_name: string;
  password?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const adminData: AdminData = await req.json();
    console.log('Creating admin with data:', adminData);

    // 1. Créer l'utilisateur avec le mot de passe fourni ou généré
    const password = adminData.password || Math.random().toString(36).slice(-12);
    
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email: adminData.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: adminData.first_name,
        last_name: adminData.last_name,
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      throw createError;
    }

    console.log('User created successfully:', authData);

    // 2. Ajouter le rôle d'administrateur
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'admin',
        active: true,
      });

    if (roleError) {
      console.error('Error setting admin role:', roleError);
      // En cas d'erreur, nettoyer l'utilisateur créé
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw roleError;
    }

    // 3. Envoyer l'email avec les informations de connexion
    const { error: emailError } = await supabase.functions.invoke('send-welcome-email', {
      body: {
        email: adminData.email,
        password: password,
        role: 'admin',
        first_name: adminData.first_name,
      },
    });

    if (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Ne pas bloquer la création si l'email échoue
    }

    return new Response(
      JSON.stringify({ 
        message: 'Admin created successfully',
        user: authData.user 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('Error in send-admin-invitation:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
