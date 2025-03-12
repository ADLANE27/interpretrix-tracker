
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface WorkHours {
  start_morning: string;
  end_morning: string;
  start_afternoon: string;
  end_afternoon: string;
}

interface Address {
  street: string;
  postal_code: string;
  city: string;
}

interface LanguagePair {
  source: string;
  target: string;
}

interface InterpreterData {
  email: string;
  first_name: string;
  last_name: string;
  password?: string;
  employment_status: "salaried_aft" | "salaried_aftcom" | "salaried_planet" | "self_employed" | "permanent_interpreter" | "permanent_interpreter_aftcom";
  languages: LanguagePair[];
  phone_number?: string;
  birth_country?: string;
  nationality?: string;
  address?: Address;
  phone_interpretation_rate?: number;
  siret_number?: string;
  vat_number?: string;
  specializations?: string[];
  landline_phone?: string;
  booth_number?: string;
  private_phone?: string;
  professional_phone?: string;
  work_hours?: WorkHours;
  tarif_15min: number;
  tarif_5min: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting invitation process...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let interpreterData: InterpreterData;
    try {
      const rawData = await req.json();
      console.log('Received raw data:', JSON.stringify(rawData, null, 2));

      // Basic validation
      if (!rawData.email?.trim()) {
        throw new Error('Email is required');
      }

      if (!rawData.first_name?.trim() || !rawData.last_name?.trim()) {
        throw new Error('First name and last name are required');
      }

      if (!rawData.employment_status || 
          !['salaried_aft', 'salaried_aftcom', 'salaried_planet', 'self_employed', 'permanent_interpreter', 'permanent_interpreter_aftcom']
            .includes(rawData.employment_status)) {
        throw new Error('Invalid employment status');
      }

      if (!Array.isArray(rawData.languages) || rawData.languages.length === 0) {
        throw new Error('At least one language pair is required');
      }

      if (typeof rawData.tarif_15min !== 'number' || rawData.tarif_15min < 0) {
        throw new Error('Invalid tarif_15min value');
      }

      if (typeof rawData.tarif_5min !== 'number' || rawData.tarif_5min < 0) {
        throw new Error('Invalid tarif_5min value');
      }

      // Password validation
      if (rawData.password !== undefined) {
        if (typeof rawData.password !== 'string') {
          throw new Error('Password must be a string');
        }
        if (rawData.password.length < 8) {
          throw new Error('Password must be at least 8 characters long');
        }
        // Add more password validation as needed
      }

      // Process and validate language pairs
      if (Array.isArray(rawData.languages)) {
        interpreterData = {
          ...rawData,
          languages: rawData.languages.map((lang: any) => {
            try {
              if (typeof lang === 'string') {
                const [source, target] = lang.split('→').map(l => l.trim());
                if (!source || !target) {
                  throw new Error('Invalid language pair format');
                }
                return { source, target };
              }
              if (typeof lang === 'object' && lang.source && lang.target) {
                return { 
                  source: lang.source.trim(), 
                  target: lang.target.trim() 
                };
              }
              throw new Error('Invalid language pair format');
            } catch (error) {
              throw new Error(`Invalid language pair format: ${JSON.stringify(lang)}`);
            }
          })
        };
      } else {
        throw new Error('Languages must be an array');
      }

      console.log('Processed interpreter data:', JSON.stringify(interpreterData, null, 2));
    } catch (error) {
      console.error('Error parsing/validating request body:', error);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid request data: ' + error.message 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Generate a secure random password if none provided
    const password = interpreterData.password || generateSecurePassword();
    
    console.log('Creating user account...');

    // Start a transaction
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email: interpreterData.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: interpreterData.first_name,
        last_name: interpreterData.last_name,
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: createError.message 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!authData?.user) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'User creation succeeded but no user data returned' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('User created successfully:', authData);

    try {
      console.log('Adding interpreter role...');
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'interpreter',
          active: true,
        });

      if (roleError) throw roleError;

      console.log('Creating interpreter profile...');
      const { error: profileError } = await supabase
        .from('interpreter_profiles')
        .insert({
          id: authData.user.id,
          first_name: interpreterData.first_name,
          last_name: interpreterData.last_name,
          email: interpreterData.email,
          employment_status: interpreterData.employment_status,
          languages: interpreterData.languages.map(lang => 
            `${lang.source}→${lang.target}`
          ),
          phone_number: interpreterData.phone_number || null,
          birth_country: interpreterData.birth_country || null,
          nationality: interpreterData.nationality || null,
          address: interpreterData.address || null,
          siret_number: interpreterData.siret_number || null,
          vat_number: interpreterData.vat_number || null,
          specializations: interpreterData.specializations || [],
          landline_phone: interpreterData.landline_phone || null,
          booth_number: interpreterData.booth_number || null,
          private_phone: interpreterData.private_phone || null,
          professional_phone: interpreterData.professional_phone || null,
          work_hours: interpreterData.work_hours || {
            start_morning: "09:00",
            end_morning: "13:00",
            start_afternoon: "14:00",
            end_afternoon: "17:00"
          },
          status: 'available',
          password_changed: false,
          tarif_15min: interpreterData.tarif_15min || 0,
          tarif_5min: interpreterData.tarif_5min || 0
        });

      if (profileError) throw profileError;

      console.log('Sending welcome email...');
      try {
        const emailContent = `
          <h1>Bienvenue sur Interpretix !</h1>
          
          <p>Bonjour ${interpreterData.first_name},</p>

          <p>Votre compte interprète a été créé avec succès.</p>

          <h2>Vos identifiants de connexion :</h2>
          <ul>
            <li>Email: ${interpreterData.email}</li>
            <li>Mot de passe: ${password}</li>
          </ul>

          <p><a href="https://interpretix.netlify.app/interpreter/login" style="display: inline-block; background-color: #1A1F2C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Se connecter</a></p>

          <p>Pour des raisons de sécurité, nous vous recommandons de changer votre mot de passe après votre première connexion.</p>

          <p>Cordialement,<br>L'équipe Interpretix</p>
        `;

        const emailResponse = await resend.emails.send({
          from: 'Interpretix <no-reply@aftraduction.com>',
          to: interpreterData.email,
          subject: `Bienvenue sur Interpretix - Vos identifiants de connexion interprète`,
          html: emailContent,
        });

        console.log('Email sent successfully:', emailResponse);

      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
        // Don't throw here, as the user is already created
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Interpreter created successfully',
          user: authData.user 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );

    } catch (error) {
      // If anything fails after user creation, clean up by deleting the user
      if (authData?.user?.id) {
        console.log('Rolling back user creation...');
        await supabase.auth.admin.deleteUser(authData.user.id);
      }
      throw error;
    }

  } catch (error) {
    console.error('Error in send-invitation-email:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'An unexpected error occurred'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});

function generateSecurePassword(): string {
  const length = 12;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  
  // Ensure at least one uppercase, one lowercase, one number, and one special character
  password += getRandomChar("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  password += getRandomChar("abcdefghijklmnopqrstuvwxyz");
  password += getRandomChar("0123456789");
  password += getRandomChar("!@#$%^&*");
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

function getRandomChar(charset: string): string {
  return charset.charAt(Math.floor(Math.random() * charset.length));
}
