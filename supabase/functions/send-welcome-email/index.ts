
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

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
    Bonjour ${emailData.first_name},

    Votre compte ${roleText} a été créé avec succès.

    Vos identifiants de connexion :
    Email: ${emailData.email}
    Mot de passe: ${emailData.password}

    Vous pouvez vous connecter ici : ${loginUrl}

    Pour des raisons de sécurité, nous vous recommandons de changer votre mot de passe après votre première connexion.

    Cordialement,
    L'équipe Interpretix
    `;

    // Ici vous pouvez intégrer votre service d'envoi d'emails
    // Pour l'instant, on simule l'envoi et on log les informations
    console.log('Email content:', emailContent);

    return new Response(
      JSON.stringify({ 
        message: 'Welcome email sent successfully' 
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
