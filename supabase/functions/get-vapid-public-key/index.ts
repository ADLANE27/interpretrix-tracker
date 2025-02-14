
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Enhanced CORS headers for maximum compatibility
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');

    if (!vapidPublicKey) {
      console.error('[VAPID] Missing VAPID_PUBLIC_KEY');
      throw new Error('VAPID public key not configured');
    }

    if (!isValidVapidKey(vapidPublicKey)) {
      console.error('[VAPID] Invalid key format');
      throw new Error('Invalid VAPID public key format');
    }

    // Success response with metadata
    console.log('[VAPID] Successfully retrieved public key');
    
    return new Response(
      JSON.stringify({
        vapidPublicKey,
        metadata: {
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
