import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface LanguagePair {
  source: string;
  target: string;
}

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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

    // Map only the fields that exist in the database table
    const allowedFields = [
      'email', 'first_name', 'last_name', 'employment_status', 'status',
      'phone_number', 'address', 'birth_country', 'nationality', 'siret_number',
      'vat_number', 'specializations', 'landline_phone', 'tarif_15min',
      'tarif_5min', 'booth_number', 'private_phone', 'professional_phone',
      'work_hours'
    ];

    // Process all fields, including null values
    for (const field of allowedFields) {
      if (field in profileData) {
        updateData[field] = profileData[field as keyof UpdateProfileData];
      }
    }

    // Handle languages separately if provided
    if ('languages' in profileData) {
      const formattedLanguages = profileData.languages
        ? profileData.languages
            .filter(lang => lang.source && lang.target)
            .map(lang => `${lang.source} → ${lang.target}`)
        : [];
      updateData.languages = formattedLanguages;
      console.log('Formatted languages:', formattedLanguages);
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
