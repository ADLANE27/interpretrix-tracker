import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Initialize Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    }
  }
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // First, verify the JWT token from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    console.log("Verifying token...");

    // Verify the JWT and get the user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      throw new Error('Invalid token');
    }

    console.log("Token verified, checking admin role...");

    // Check if the user has admin role
    const { data: roles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !roles || roles.role !== 'admin') {
      console.error("Role error:", roleError);
      throw new Error('User is not an admin');
    }

    console.log("Admin role verified, proceeding with invitation...");

    const { email, firstName, lastName } = await req.json();

    if (!email || !firstName || !lastName) {
      throw new Error("Missing required fields");
    }

    console.log("Generating reset link for:", { email, firstName, lastName });

    // Use supabaseAdmin to generate the reset link
    const { data, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
    });

    if (resetError) {
      console.error("Error generating reset link:", resetError);
      throw resetError;
    }
    
    if (!data.properties?.action_link) {
      throw new Error("No reset link generated");
    }

    console.log("Reset link generated successfully");

    const { data: emailResponse, error: emailError } = await resend.emails.send({
      from: "Interprétation <onboarding@resend.dev>",
      to: [email],
      subject: "Bienvenue sur la plateforme d'interprétation",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Bienvenue ${firstName} ${lastName},</h1>
          <p>Votre compte interprète a été créé avec succès.</p>
          <p>Pour accéder à votre espace, veuillez d'abord définir votre mot de passe en cliquant sur le lien ci-dessous :</p>
          <p>
            <a href="${data.properties.action_link}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
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

    if (emailError) {
      console.error("Error sending email:", emailError);
      throw emailError;
    }

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