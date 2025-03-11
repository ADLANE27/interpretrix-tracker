
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

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
  employment_status: "salaried_aft" | "salaried_aftcom" | "salaried_planet" | "self_employed" | "permanent_interpreter";
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

  try {
    console.log('Starting invitation process...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let interpreterData: InterpreterData;
    try {
      interpreterData = await req.json();
      console.log('Received interpreter data:', JSON.stringify(interpreterData, null, 2));
    } catch (error) {
      console.error('Error parsing request body:', error);
      throw new Error('Invalid request body');
    }

    // Validate required fields
    if (!interpreterData.email || !interpreterData.first_name || !interpreterData.last_name) {
      throw new Error('Missing required fields: email, first_name, or last_name');
    }

    if (!interpreterData.languages || interpreterData.languages.length === 0) {
      throw new Error('At least one language pair is required');
    }

    // Transform languages to the correct format
    const formattedLanguages = interpreterData.languages.map(lang => 
      `${lang.source}→${lang.target}`
    );

    console.log('Transformed languages:', formattedLanguages);

    // 1. Create the user with the provided or generated password
    const password = interpreterData.password || Math.random().toString(36).slice(-12);
    
    console.log('Creating user account...');
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

    if (!authData?.user) {
      throw new Error('User creation succeeded but no user data returned');
    }

    console.log('User created successfully:', authData);

    // 2. Add interpreter role
    console.log('Adding interpreter role...');
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
    console.log('Creating interpreter profile...');
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

    // 4. Send welcome email
    console.log('Sending welcome email...');
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
      // Don't block creation if email fails, but log it
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
