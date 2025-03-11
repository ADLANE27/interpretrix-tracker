
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface UpdateProfileData {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  languages?: { source: string; target: string; }[];
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

    // Transform language pairs to the required format
    const transformedData = {
      ...profileData,
      languages: profileData.languages 
        ? profileData.languages.map(lang => `${lang.source} → ${lang.target}`)
        : undefined
    };

    console.log('Transforming profile data:', transformedData);

    // Remove id from the data to be updated
    const { id, ...updateData } = transformedData;

    // First update the interpreter profile
    const { error: profileError } = await supabase
      .from('interpreter_profiles')
      .update(updateData)
      .eq('id', id);

    if (profileError) {
      console.error('Error updating interpreter profile:', profileError);
      throw profileError;
    }

    // Only update auth email if it has changed and is provided
    if (profileData.email) {
      const { error: authError } = await supabase.auth.admin.updateUserById(
        id,
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
