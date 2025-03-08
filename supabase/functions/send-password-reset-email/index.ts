
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { corsHeaders } from '../_shared/cors.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface ResetPasswordData {
  email: string;
  user_id: string;
  first_name: string;
  role: 'admin' | 'interpreter';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resetData: ResetPasswordData = await req.json();
    console.log('Sending password reset email to:', resetData.email);

    // Construire le contenu de l'email en fonction du rôle
    const loginUrl = resetData.role === 'admin' 
      ? 'https://interpretix.netlify.app/admin/login'
      : 'https://interpretix.netlify.app/interpreter/login';

    const roleText = resetData.role === 'admin' ? "administrateur" : "interprète";
    
    const emailContent = `
      <h1>Réinitialisation de votre mot de passe Interpretix</h1>
      
      <p>Bonjour ${resetData.first_name},</p>

      <p>Votre mot de passe ${roleText} a été réinitialisé.</p>

      <p>Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>

      <p><a href="${loginUrl}" style="display: inline-block; background-color: #1A1F2C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Se connecter</a></p>

      <p>Pour des raisons de sécurité, nous vous recommandons de changer votre mot de passe après votre première connexion.</p>

      <p>Cordialement,<br>L'équipe Interpretix</p>
    `;

    // Send the email using Resend with the custom domain
    const emailResponse = await resend.emails.send({
      from: 'Interpretix <no-reply@aftraduction.com>',
      to: resetData.email,
      subject: `Interpretix - Votre mot de passe a été réinitialisé`,
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
