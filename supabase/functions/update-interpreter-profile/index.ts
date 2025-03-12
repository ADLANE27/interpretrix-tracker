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
  phone_number?: string;
  address?: {
    street: string;
    postal_code: string;
    city: string;
  } | null;
  birth_country?: string;
  nationality?: string;
  siret_number?: string;
  vat_number?: string;
  specializations?: string[];
  landline_phone?: string;
  tarif_15min?: number;
  tarif_5min?: number;
  booth_number?: string;
  private_phone?: string;
  professional_phone?: string;
  work_hours?: {
    start_morning: string;
    end_morning: string;
    start_afternoon: string;
    end_afternoon: string;
  };
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
      if (formattedLanguages.length > 0) {
        updateData.languages = formattedLanguages;
      }
      console.log('Formatted languages:', formattedLanguages);
    }

    // Add other fields only if they are provided and not empty
    if (profileData.first_name !== undefined) updateData.first_name = profileData.first_name;
    if (profileData.last_name !== undefined) updateData.last_name = profileData.last_name;
    if (profileData.employment_status !== undefined) updateData.employment_status = profileData.employment_status;
    if (profileData.status !== undefined) updateData.status = profileData.status;
    if (profileData.phone_number !== undefined) updateData.phone_number = profileData.phone_number;
    if (profileData.address !== undefined) updateData.address = profileData.address;
    if (profileData.birth_country !== undefined) updateData.birth_country = profileData.birth_country;
    if (profileData.nationality !== undefined) updateData.nationality = profileData.nationality;
    if (profileData.siret_number !== undefined) updateData.siret_number = profileData.siret_number;
    if (profileData.vat_number !== undefined) updateData.vat_number = profileData.vat_number;
    if (profileData.specializations !== undefined) updateData.specializations = profileData.specializations;
    if (profileData.landline_phone !== undefined) updateData.landline_phone = profileData.landline_phone;
    if (profileData.tarif_15min !== undefined) updateData.tarif_15min = profileData.tarif_15min;
    if (profileData.tarif_5min !== undefined) updateData.tarif_5min = profileData.tarif_5min;

    // Special handling for the three problematic fields - only update if they have a value
    if (profileData.booth_number) updateData.booth_number = profileData.booth_number;
    if (profileData.private_phone) updateData.private_phone = profileData.private_phone;
    if (profileData.professional_phone) updateData.professional_phone = profileData.professional_phone;
    
    if (profileData.work_hours !== undefined) updateData.work_hours = profileData.work_hours;

    console.log('Updating profile with data:', updateData);

    // First update the interpreter profile
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
