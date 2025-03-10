
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface UpdateProfileData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  [key: string]: any; // Allow other profile fields
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const profileData: UpdateProfileData = await req.json();
    console.log('Updating profile with data:', profileData);

    // First update the auth.users email if it has changed
    const { error: authError } = await supabase.auth.admin.updateUserById(
      profileData.id,
      { email: profileData.email }
    );

    if (authError) {
      console.error('Error updating auth user:', authError);
      throw authError;
    }

    // Then update the interpreter profile
    const { error: profileError } = await supabase
      .from('interpreter_profiles')
      .update(profileData)
      .eq('id', profileData.id);

    if (profileError) {
      console.error('Error updating interpreter profile:', profileError);
      throw profileError;
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
