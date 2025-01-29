import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface WelcomeEmailRequest {
  email: string;
  firstName: string;
  lastName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, lastName }: WelcomeEmailRequest = await req.json();

    // Generate password reset link
    const { data: { user }, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
    });

    if (resetError) {
      throw new Error(`Error generating reset link: ${resetError.message}`);
    }

    // Get the action link from the response
    const actionLink = user?.action_link;
    if (!actionLink) {
      throw new Error('No action link generated');
    }

    // Send welcome email with password reset link
    const emailResponse = await resend.emails.send({
      from: "Interprétation <onboarding@resend.dev>",
      to: [email],
      subject: "Bienvenue sur la plateforme d'interprétation",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Bienvenue ${firstName} ${lastName},</h1>
          <p>Votre compte interprète a été créé avec succès.</p>
          <p>Pour commencer à utiliser la plateforme, veuillez définir votre mot de passe en cliquant sur le lien ci-dessous :</p>
          <p style="margin: 20px 0;">
            <a href="${actionLink}" 
               style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
              Définir mon mot de passe
            </a>
          </p>
          <p>Ce lien est valable pendant 24 heures. Si vous ne l'utilisez pas dans ce délai, vous devrez demander un nouveau lien de réinitialisation.</p>
          <p>Une fois votre mot de passe défini, vous pourrez vous connecter à la plateforme et commencer à recevoir des missions d'interprétation.</p>
          <p>Si vous avez des questions, n'hésitez pas à contacter notre équipe support.</p>
          <p>Cordialement,<br>L'équipe d'interprétation</p>
        </div>
      `,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);