
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { corsHeaders } from '../_shared/cors.ts';
import { format } from "npm:date-fns@2.30.0";
import frLocale from "npm:date-fns/locale/fr/index.js";

console.log('Initializing send-mission-notification function');
const resendApiKey = Deno.env.get("RESEND_API_KEY");

if (!resendApiKey) {
  console.error('RESEND_API_KEY is not configured');
}

const resend = new Resend(resendApiKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body;
    try {
      body = await req.json();
      console.log('Received request body:', JSON.stringify(body, null, 2));
    } catch (error) {
      console.error('Error parsing request body:', error);
      throw new Error('Invalid request body');
    }

    const { interpreter, mission } = body;

    if (!interpreter || !mission) {
      console.error('Missing required fields in request:', { interpreter, mission });
      throw new Error('Missing required fields');
    }

    console.log('Processing notification request:', {
      interpreterEmail: interpreter.email,
      missionId: mission.id,
      missionType: mission.mission_type
    });

    const isMissionImmediate = mission.mission_type === 'immediate';
    const missionTypeText = isMissionImmediate ? 'immédiate' : 'programmée';
    
    let timingInfo = '';
    if (isMissionImmediate) {
      timingInfo = `Durée estimée : ${mission.estimated_duration} minutes`;
    } else {
      try {
        const startTime = format(new Date(mission.scheduled_start_time), "EEEE d MMMM yyyy 'à' HH:mm", { locale: frLocale });
        const endTime = format(new Date(mission.scheduled_end_time), "EEEE d MMMM yyyy 'à' HH:mm", { locale: frLocale });
        timingInfo = `Date de début : ${startTime}\nDate de fin : ${endTime}`;
      } catch (error) {
        console.error('Error formatting dates:', error);
        throw new Error('Invalid date format');
      }
    }

    const baseUrl = "https://interpretix.netlify.app";
    const loginPath = interpreter.role === 'interpreter' ? '/interpreter/login' : '/admin/login';
    const loginUrl = `${baseUrl}${loginPath}`;

    console.log('Preparing email with timing info:', timingInfo);

    const emailContent = `
      <h1>Nouvelle mission d'interprétation ${missionTypeText}</h1>
      
      <p>Bonjour ${interpreter.first_name},</p>

      <p>Une nouvelle mission d'interprétation ${missionTypeText} vous a été proposée avec les détails suivants :</p>

      <ul>
        <li>Type de mission : ${missionTypeText}</li>
        <li>Langue source : ${mission.source_language}</li>
        <li>Langue cible : ${mission.target_language}</li>
        <li>${timingInfo}</li>
      </ul>

      <p>Pour accepter ou refuser cette mission, veuillez vous connecter à votre espace :</p>

      <p><a href="${loginUrl}" style="display: inline-block; background-color: #1A1F2C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Se connecter à Interpretix</a></p>

      <p>Cette mission sera proposée à d'autres interprètes. Plus vite vous répondrez, plus de chances vous aurez d'obtenir la mission.</p>

      <p>Cordialement,<br>L'équipe Interpretix</p>
    `;

    console.log('Email content prepared:', emailContent);
    console.log('Attempting to send email with Resend to:', interpreter.email);
    
    const emailResponse = await resend.emails.send({
      from: 'Interpretix <no-reply@aftraduction.com>',
      to: [interpreter.email],
      subject: `Interpretix - Nouvelle mission d'interprétation ${missionTypeText}`,
      html: emailContent,
    });

    console.log('Email sent successfully, Resend response:', emailResponse);

    return new Response(
      JSON.stringify({ 
        message: 'Mission notification email sent successfully',
        emailResponse 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('Error in send-mission-notification:', error);
    
    // Log additional error details if available
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        details: error
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
