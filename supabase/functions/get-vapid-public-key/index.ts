
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js';

// Enhanced CORS headers for maximum compatibility
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with, accept',
  'Access-Control-Max-Age': '86400',
};

// Validate VAPID key format
function isValidVapidKey(key: string): boolean {
  // Must be base64url format
  return /^[A-Za-z0-9\-_]+$/.test(key) && key.length >= 20;
}

// Retry mechanism for database operations
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`[VAPID] Attempt ${attempt}/${maxRetries} failed:`, error);
      if (attempt === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  throw new Error('All retry attempts failed');
}

serve(async (req) => {
  // Enhanced CORS handling
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204
    });
  }

  console.log('[VAPID] Function invoked with method:', req.method);

  try {
    // Validate environment variables early
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[VAPID] Missing required environment variables');
      throw new Error('Server configuration error');
    }

    // Initialize Supabase client with retry mechanism
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Multiple sources strategy with fallbacks
    let vapidPublicKey: string | null = null;
    let source: string = '';

    try {
      // 1. Try secrets table first
      console.log('[VAPID] Attempting to fetch from secrets table...');
      const { data: secretData, error: secretError } = await retryOperation(async () => 
        await supabaseAdmin
          .from('secrets')
          .select('value')
          .eq('name', 'VAPID_PUBLIC_KEY')
          .single()
      );

      if (!secretError && secretData?.value) {
        vapidPublicKey = secretData.value;
        source = 'secrets';
        console.log('[VAPID] Successfully retrieved from secrets table');
      } else {
        console.log('[VAPID] Not found in secrets table, checking environment...');
      }
    } catch (dbError) {
      console.error('[VAPID] Database error:', dbError);
    }

    // 2. Try environment variable as fallback
    if (!vapidPublicKey) {
      vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || null;
      if (vapidPublicKey) {
        source = 'environment';
        console.log('[VAPID] Retrieved from environment variable');
      }
    }

    // Final validation
    if (!vapidPublicKey) {
      console.error('[VAPID] Public key not found in any source');
      throw new Error('VAPID public key not configured');
    }

    if (!isValidVapidKey(vapidPublicKey)) {
      console.error('[VAPID] Invalid key format from source:', source);
      throw new Error('Invalid VAPID public key format');
    }

    // Success response with detailed metadata
    console.log('[VAPID] Successfully retrieved public key from:', source);
    
    return new Response(
      JSON.stringify({
        vapidPublicKey,
        metadata: {
          source,
          timestamp: new Date().toISOString(),
          keyLength: vapidPublicKey.length,
          isValid: true
        }
      }),
      { 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        status: 200
      }
    );

  } catch (error) {
    console.error('[VAPID] Critical error:', error);
    
    // Enhanced error response
    return new Response(
      JSON.stringify({
        error: error.message,
        errorCode: 'VAPID_KEY_ERROR',
        details: 'Error retrieving VAPID public key. Please ensure it is properly configured.',
        timestamp: new Date().toISOString(),
        debug: {
          hasEnvVar: !!Deno.env.get('VAPID_PUBLIC_KEY'),
          hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
          hasServiceRole: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
          stack: error.stack
        }
      }),
      { 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        status: 500
      }
    );
  }
});
