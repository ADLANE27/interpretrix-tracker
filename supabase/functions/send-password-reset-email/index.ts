
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { Resend } from "npm:resend@2.0.0";
import { corsHeaders } from '../_shared/cors.ts';

console.log('Initializing Resend with API key');
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, first_name, role } = await req.json();
    console.log('Sending password reset email to:', { email, first_name, role });

    // Ensure we have all required data
    if (!email || !first_name || !role) {
      throw new Error('Missing required user data');
    }

    // Generate password reset link using Supabase
    const { data, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `https://interpretix.netlify.app/reset-password?role=${role}`,
      }
    });

    if (resetError) {
      throw resetError;
    }

    const resetUrl = data.properties.action_link;
    const roleText = role === 'admin' ? "administrateur" : "interprète";
    
    const emailContent = `
      <h1>Réinitialisation de votre mot de passe Interpretix</h1>
      
      <p>Bonjour ${first_name},</p>

      <p>Une demande de réinitialisation de votre mot de passe ${roleText} a été effectuée.</p>

      <p>Vous pouvez réinitialiser votre mot de passe en utilisant le lien ci-dessous:</p>

      <p><a href="${resetUrl}" style="display: inline-block; background-color: #1A1F2C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Réinitialiser le mot de passe</a></p>

      <p>Pour des raisons de sécurité, ce lien expirera dans 24 heures.</p>

      <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.</p>

      <p>Cordialement,<br>L'équipe Interpretix</p>
    `;

    console.log('Attempting to send email with Resend');
    
    const emailResponse = await resend.emails.send({
      from: 'Interpretix <no-reply@aftraduction.com>',
      to: email,
      subject: `Interpretix - Réinitialisation de votre mot de passe`,
      html: emailContent,
    });

    console.log('Email sent successfully:', emailResponse);

    return new Response(
      JSON.stringify({ 
        message: 'Password reset email sent successfully',
        emailResponse 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('Error in send-password-reset-email:', error);
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

