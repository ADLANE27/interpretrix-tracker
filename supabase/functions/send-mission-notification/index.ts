
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { corsHeaders } from '../_shared/cors.ts';
import { format } from "npm:date-fns@2.30.0";
import { fr } from "npm:date-fns@2.30.0/locale/fr";

console.log('Initializing send-mission-notification function');
const resendApiKey = Deno.env.get("RESEND_API_KEY");

if (!resendApiKey) {
  console.error('RESEND_API_KEY is not configured');
}

const resend = new Resend(resendApiKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      interpreter,
      mission
    } = await req.json();

    console.log('Received notification request:', {
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
      const startTime = format(new Date(mission.scheduled_start_time), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
      const endTime = format(new Date(mission.scheduled_end_time), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
      timingInfo = `Date de début : ${startTime}\nDate de fin : ${endTime}`;
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

    console.log('Attempting to send email with Resend to:', interpreter.email);
    
    const emailResponse = await resend.emails.send({
      from: 'Interpretix <no-reply@aftraduction.com>',
      to: interpreter.email,
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
