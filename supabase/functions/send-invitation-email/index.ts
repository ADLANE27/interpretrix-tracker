import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  email: string;
  firstName: string;
  lastName: string;
  resetLink: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, lastName, resetLink }: InvitationEmailRequest = await req.json();

    if (!email || !firstName || !lastName || !resetLink) {
      throw new Error("Missing required fields");
    }

    console.log("Sending invitation email to:", { email, firstName, lastName });

    const { data: emailResponse } = await resend.emails.send({
      from: "Interprétation <onboarding@resend.dev>",
      to: [email],
      subject: "Bienvenue sur la plateforme d'interprétation",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Bienvenue ${firstName} ${lastName},</h1>
          <p>Votre compte interprète a été créé avec succès.</p>
          <p>Pour accéder à votre espace, veuillez d'abord définir votre mot de passe en cliquant sur le lien ci-dessous :</p>
          <p>
            <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
              Définir mon mot de passe
            </a>
          </p>
          <p>Ce lien est valable pendant 24 heures.</p>
          <p>Une fois votre mot de passe défini, vous pourrez vous connecter à la plateforme en utilisant votre email.</p>
          <p>Si vous avez des questions, n'hésitez pas à contacter notre équipe support.</p>
          <p>Cordialement,<br>L'équipe d'interprétation</p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-invitation-email function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.details || "No additional details available"
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);