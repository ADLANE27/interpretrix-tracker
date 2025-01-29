import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  firstName: string;
  lastName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, lastName }: WelcomeEmailRequest = await req.json();

    if (!email || !firstName || !lastName) {
      throw new Error("Missing required fields");
    }

    console.log("Sending welcome email to:", { email, firstName, lastName });

    const { data: resetLink } = await resend.emails.send({
      from: "Interprétation <onboarding@resend.dev>",
      to: [email],
      subject: "Bienvenue sur la plateforme d'interprétation",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Bienvenue ${firstName} ${lastName},</h1>
          <p>Votre compte a été créé avec succès.</p>
          <p>Vous recevrez prochainement un email pour définir votre mot de passe.</p>
          <p>Une fois votre mot de passe défini, vous pourrez vous connecter à la plateforme.</p>
          <p>Si vous avez des questions, n'hésitez pas à contacter notre équipe support.</p>
          <p>Cordialement,<br>L'équipe d'interprétation</p>
        </div>
      `,
    });

    console.log("Email sent successfully:", resetLink);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    
    // Return a more detailed error response
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