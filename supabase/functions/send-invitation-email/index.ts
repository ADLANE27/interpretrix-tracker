
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { Resend } from "npm:resend@2.0.0";

interface Address {
  street: string;
  postal_code: string;
  city: string;
}

interface LanguagePair {
  source: string;
  target: string;
}

interface InterpreterData {
  email: string;
  first_name: string;
  last_name: string;
  password?: string;
  employment_status: "salaried_aft" | "salaried_aftcom" | "salaried_planet" | "self_employed" | "permanent_interpreter" | "permanent_interpreter_aftcom";
  languages: LanguagePair[];
  phone_number?: string;
  birth_country?: string;
  nationality?: string;
  address?: Address;
  phone_interpretation_rate?: number;
  siret_number?: string;
  vat_number?: string;
  specializations?: string[];
  landline_phone?: string;
  tarif_15min: number;
  tarif_5min: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const interpreterData: InterpreterData = await req.json();
    console.log('Creating interpreter with data:', interpreterData);

    // Validate required fields
    if (!interpreterData.email || !interpreterData.first_name || !interpreterData.last_name) {
      throw new Error('Missing required fields: email, first_name, or last_name');
    }

    // Transform languages to the correct format
    const formattedLanguages = interpreterData.languages.map(lang => 
      `${lang.source}→${lang.target}`
    );

    // 1. Create the user with the provided or generated password
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

    // 2. Add interpreter role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'interpreter',
        active: true,
      });

    if (roleError) {
      console.error('Error setting interpreter role:', roleError);
      // Clean up created user if role assignment fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw roleError;
    }

    // 3. Create interpreter profile
    const { error: profileError } = await supabase
      .from('interpreter_profiles')
      .insert({
        id: authData.user.id,
        first_name: interpreterData.first_name,
        last_name: interpreterData.last_name,
        email: interpreterData.email,
        employment_status: interpreterData.employment_status,
        languages: formattedLanguages,
        phone_number: interpreterData.phone_number || null,
        birth_country: interpreterData.birth_country || null,
        nationality: interpreterData.nationality || null,
        address: interpreterData.address || null,
        phone_interpretation_rate: interpreterData.phone_interpretation_rate || 0,
        siret_number: interpreterData.siret_number || null,
        vat_number: interpreterData.vat_number || null,
        specializations: interpreterData.specializations || [],
        landline_phone: interpreterData.landline_phone || null,
        password_changed: false,
        status: 'available',
        tarif_15min: interpreterData.tarif_15min || 0,
        tarif_5min: interpreterData.tarif_5min || 0
      });

    if (profileError) {
      console.error('Error creating interpreter profile:', profileError);
      // Clean up user and role if profile creation fails
      await supabase.from('user_roles').delete().eq('user_id', authData.user.id);
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    // 4. Send welcome email using Resend
    try {
      const emailContent = `
        <h1>Bienvenue sur Interpretix !</h1>
        
        <p>Bonjour ${interpreterData.first_name},</p>

        <p>Votre compte interprète a été créé avec succès.</p>

        <h2>Vos identifiants de connexion :</h2>
        <ul>
          <li>Email: ${interpreterData.email}</li>
          <li>Mot de passe: ${password}</li>
        </ul>

        <p><a href="https://interpretix.netlify.app/interpreter/login" style="display: inline-block; background-color: #1A1F2C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Se connecter</a></p>

        <p>Pour des raisons de sécurité, nous vous recommandons de changer votre mot de passe après votre première connexion.</p>

        <p>Cordialement,<br>L'équipe Interpretix</p>
      `;

      const emailResponse = await resend.emails.send({
        from: 'Interpretix <no-reply@aftraduction.com>',
        to: interpreterData.email,
        subject: 'Bienvenue sur Interpretix - Vos identifiants de connexion interprète',
        html: emailContent,
      });

      console.log('Welcome email sent successfully:', emailResponse);

    } catch (emailError) {
      // Log the email error but don't throw it - the user has been created successfully
      console.error('Error sending welcome email:', emailError);
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
