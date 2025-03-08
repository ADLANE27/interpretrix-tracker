
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { corsHeaders } from '../_shared/cors.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface WelcomeEmailData {
  email: string;
  password: string;
  role: 'admin' | 'interpreter';
  first_name: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const emailData: WelcomeEmailData = await req.json();
    console.log('Sending welcome email to:', emailData.email);

    // Construire le contenu de l'email en fonction du rôle
    const loginUrl = emailData.role === 'admin' 
      ? 'https://interpretix.netlify.app/admin/login'
      : 'https://interpretix.netlify.app/interpreter/login';

    const roleText = emailData.role === 'admin' ? "administrateur" : "interprète";
    
    const emailContent = `
      <h1>Bienvenue sur Interpretix !</h1>
      
      <p>Bonjour ${emailData.first_name},</p>

      <p>Votre compte ${roleText} a été créé avec succès.</p>

      <h2>Vos identifiants de connexion :</h2>
      <ul>
        <li>Email: ${emailData.email}</li>
        <li>Mot de passe: ${emailData.password}</li>
      </ul>

      <p><a href="${loginUrl}" style="display: inline-block; background-color: #1A1F2C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Se connecter</a></p>

      <p>Pour des raisons de sécurité, nous vous recommandons de changer votre mot de passe après votre première connexion.</p>

      <p>Cordialement,<br>L'équipe Interpretix</p>
    `;

    // Send the email using Resend
    const emailResponse = await resend.emails.send({
      from: 'Interpretix <onboarding@resend.dev>',
      to: emailData.email,
      subject: `Bienvenue sur Interpretix - Vos identifiants de connexion ${roleText}`,
      html: emailContent,
    });

    console.log('Email sent successfully:', emailResponse);

    return new Response(
      JSON.stringify({ 
        message: 'Welcome email sent successfully',
        emailResponse 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('Error in send-welcome-email:', error);
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
