
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
      throw new Error('Missing interpreter ID');
    }

    // Build update object only with provided fields
    const updateData: Record<string, any> = {};

    // Format language pairs if provided
    if (profileData.languages) {
      const formattedLanguages = profileData.languages
        .filter(lang => lang.source && lang.target)
        .map(lang => `${lang.source} → ${lang.target}`);
      updateData.languages = formattedLanguages;
      console.log('Formatted languages:', formattedLanguages);
    }

    // Add all fields that are present in the request, even if they are null
    Object.keys(profileData).forEach(field => {
      if (field !== 'id' && field !== 'languages' && field in profileData) {
        updateData[field] = profileData[field];
      }
    });

    console.log('Updating profile with data:', updateData);

    // Update the interpreter profile
    const { error: profileError } = await supabase
      .from('interpreter_profiles')
      .update(updateData)
      .eq('id', profileData.id);

    if (profileError) {
      console.error('Error updating interpreter profile:', profileError);
      throw profileError;
    }

    // Only update auth email if it has changed and is provided
    if (profileData.email) {
      const { error: authError } = await supabase.auth.admin.updateUserById(
        profileData.id,
        { email: profileData.email }
      );

      if (authError) {
        console.error('Error updating auth user:', authError);
        throw authError;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Profile updated successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('Error in update-interpreter-profile:', error);
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
