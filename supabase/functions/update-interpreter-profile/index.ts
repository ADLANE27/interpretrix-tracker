
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { LanguagePair } from '../_shared/types.ts';

interface UpdateProfileData {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  languages?: LanguagePair[];
  employment_status?: string;
  status?: string;
  phone_number?: string | null;
  address?: {
    street: string;
    postal_code: string;
    city: string;
  } | null;
  birth_country?: string | null;
  nationality?: string | null;
  siret_number?: string | null;
  vat_number?: string | null;
  specializations?: string[];
  landline_phone?: string | null;
  tarif_15min?: number | null;
  tarif_5min?: number | null;
  booth_number?: string | null;
  private_phone?: string | null;
  professional_phone?: string | null;
  work_hours?: {
    start_morning: string;
    end_morning: string;
    start_afternoon: string;
    end_afternoon: string;
  } | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const profileData: UpdateProfileData = await req.json();
    console.log('Received profile data:', profileData);

    if (!profileData.id) {
      return new Response(
        JSON.stringify({ error: 'Missing interpreter ID' }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const updateData: Record<string, any> = {};
    const allowedFields = [
      'email', 'first_name', 'last_name', 'employment_status', 'status',
      'phone_number', 'address', 'birth_country', 'nationality', 'siret_number',
      'vat_number', 'specializations', 'landline_phone', 'tarif_15min',
      'tarif_5min', 'booth_number', 'private_phone', 'professional_phone',
      'work_hours', 'languages'  // Added languages to allowed fields
    ];

    // Process languages before other fields
    if ('languages' in profileData && Array.isArray(profileData.languages)) {
      const formattedLanguages = profileData.languages
        .filter((lang): lang is LanguagePair => (
          Boolean(lang) && 
          typeof lang === 'object' && 
          typeof lang.source === 'string' && 
          typeof lang.target === 'string' &&
          lang.source.trim() !== '' && 
          lang.target.trim() !== ''
        ))
        .map(lang => `${lang.source.trim()} → ${lang.target.trim()}`);
      
      console.log('Formatted languages:', formattedLanguages);
      updateData.languages = formattedLanguages;
    }

    // Process all other fields
    for (const field of allowedFields) {
      if (field !== 'languages' && field in profileData) {
        updateData[field] = profileData[field as keyof UpdateProfileData];
      }
    }

    console.log('Updating profile with data:', updateData);

    const { data, error: profileError } = await supabase
      .from('interpreter_profiles')
      .update(updateData)
      .eq('id', profileData.id)
      .select('*')
      .single();

    if (profileError) {
      console.error('Error updating interpreter profile:', profileError);
      return new Response(
        JSON.stringify({ error: profileError.message }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (profileData.email) {
      const { error: authError } = await supabase.auth.admin.updateUserById(
        profileData.id,
        { email: profileData.email }
      );

      if (authError) {
        console.error('Error updating auth user:', authError);
        return new Response(
          JSON.stringify({ error: authError.message }), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Profile updated successfully',
        data 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in update-interpreter-profile:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

