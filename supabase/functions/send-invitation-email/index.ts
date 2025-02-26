
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface InterpreterData {
  email: string;
  first_name: string;
  last_name: string;
  password?: string;
  employment_status: string;
  languages: string[];
  phone_number?: string;
  birth_country?: string;
  nationality?: string;
  address?: {
    street: string;
    postal_code: string;
    city: string;
  };
  phone_interpretation_rate?: number;
  siret_number?: string;
  vat_number?: string;
  specializations?: string[];
  landline_phone?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const interpreterData: InterpreterData = await req.json();
    console.log('Creating interpreter with data:', interpreterData);

    // 1. Créer l'utilisateur avec le mot de passe fourni ou généré
    const password = interpreterData.password || Math.random().toString(36).slice(-12);
    
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email: interpreterData.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: interpreterData.first_name,
        last_name: interpreterData.last_name,
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      throw createError;
    }

    console.log('User created successfully:', authData);

    // 2. Ajouter le rôle d'interprète
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'interpreter',
        active: true,
      });

    if (roleError) {
      console.error('Error setting interpreter role:', roleError);
      // En cas d'erreur, nettoyer l'utilisateur créé
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw roleError;
    }

    // 3. Créer le profil d'interprète
    const { error: profileError } = await supabase
      .from('interpreter_profiles')
      .insert({
        id: authData.user.id,
        first_name: interpreterData.first_name,
        last_name: interpreterData.last_name,
        email: interpreterData.email,
        employment_status: interpreterData.employment_status,
        languages: interpreterData.languages,
        phone_number: interpreterData.phone_number,
        birth_country: interpreterData.birth_country,
        nationality: interpreterData.nationality,
        address: interpreterData.address,
        phone_interpretation_rate: interpreterData.phone_interpretation_rate,
        siret_number: interpreterData.siret_number,
        vat_number: interpreterData.vat_number,
        specializations: interpreterData.specializations,
        landline_phone: interpreterData.landline_phone,
        password_changed: false,
        status: 'available',
      });

    if (profileError) {
      console.error('Error creating interpreter profile:', profileError);
      // En cas d'erreur, nettoyer l'utilisateur et son rôle
      await supabase.from('user_roles').delete().eq('user_id', authData.user.id);
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    // 4. Envoyer l'email avec les informations de connexion
    const { error: emailError } = await supabase.functions.invoke('send-welcome-email', {
      body: {
        email: interpreterData.email,
        password: password,
        role: 'interpreter',
        first_name: interpreterData.first_name,
      },
    });

    if (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Ne pas bloquer la création si l'email échoue
    }

    return new Response(
      JSON.stringify({ 
        message: 'Interpreter created successfully',
        user: authData.user 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('Error in send-invitation-email:', error);
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
