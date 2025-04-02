
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { Resend } from "npm:resend@2.0.0";
import { corsHeaders } from '../_shared/cors.ts';

console.log('Initializing admin-reset-password function');
const resendApiKey = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!resendApiKey) {
  console.error('RESEND_API_KEY is not configured');
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured');
}

const resend = new Resend(resendApiKey);
const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

interface ResetPasswordRequest {
  user_id: string;
  email: string;
  new_password: string;
  user_name: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the request body containing the user ID and new password
    const { user_id, email, new_password, user_name }: ResetPasswordRequest = await req.json();
    console.log('Admin reset password for:', { email, user_id });

    // Ensure we have all required data
    if (!user_id || !new_password || !email) {
      throw new Error('Missing required user data or password');
    }

    // Verify the requesting user is an admin (via JWT)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: adminUser } } = await supabase.auth.getUser(token);

    if (!adminUser) {
      throw new Error('Unauthorized - invalid admin token');
    }

    // Check if the user making the request has admin role
    const { data: adminRole, error: roleCheckError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', adminUser.id)
      .eq('role', 'admin')
      .single();

    if (roleCheckError || !adminRole) {
      throw new Error('Unauthorized - not an admin user');
    }

    // Update the user's password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user_id,
      { password: new_password }
    );

    if (updateError) {
      throw updateError;
    }

    // For interpreter users, set password_changed flag to true
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user_id)
      .single();

    if (userRole && userRole.role === 'interpreter') {
      const { error: profileError } = await supabase
        .from('interpreter_profiles')
        .update({ password_changed: true })
        .eq('id', user_id);

      if (profileError) {
        console.error('Error updating interpreter profile:', profileError);
      }
    }

    // Send notification email to the user
    try {
      const emailContent = `
        <h1>Réinitialisation de mot de passe Interpretix</h1>
        
        <p>Bonjour ${user_name},</p>

        <p>Votre mot de passe a été réinitialisé par un administrateur.</p>

        <p>Votre nouveau mot de passe temporaire est: <strong>${new_password}</strong></p>

        <p>Pour des raisons de sécurité, nous vous recommandons de changer ce mot de passe après votre prochaine connexion.</p>

        <p><a href="https://interpretix.netlify.app/login" style="display: inline-block; background-color: #1A1F2C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Se connecter</a></p>

        <p>Cordialement,<br>L'équipe Interpretix</p>
      `;

      const emailResponse = await resend.emails.send({
        from: 'Interpretix <no-reply@aftraduction.com>',
        to: email,
        subject: 'Interpretix - Votre mot de passe a été réinitialisé',
        html: emailContent,
      });

      console.log('Password reset notification email sent:', emailResponse);
    } catch (emailError) {
      console.error('Error sending password reset notification:', emailError);
      // Don't throw here, as the password was successfully reset
    }

    return new Response(
      JSON.stringify({ 
        message: 'Password reset successfully',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('Error in admin-reset-password function:', error);
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
