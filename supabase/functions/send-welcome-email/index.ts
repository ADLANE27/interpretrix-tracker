
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
  password: string;
  first_name: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, first_name, password }: WelcomeEmailRequest = await req.json();

    if (!email || !first_name || !password) {
      throw new Error("Missing required fields");
    }

    console.log("Sending welcome email to:", { email, first_name });

    const { data: resetLink } = await resend.emails.send({
      from: "Interprétation <onboarding@resend.dev>",
      to: [email],
      subject: "Bienvenue sur la plateforme d'interprétation",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Bienvenue ${first_name},</h1>
          <p>Votre compte a été créé avec succès.</p>
          <p>Voici vos identifiants de connexion :</p>
          <ul>
            <li>Email : ${email}</li>
            <li>Mot de passe : ${password}</li>
          </ul>
          <p>Lors de votre première connexion, nous vous recommandons de changer votre mot de passe.</p>
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
