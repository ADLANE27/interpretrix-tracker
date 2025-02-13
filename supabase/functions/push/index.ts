
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js';

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: {
    id: string;
    user_id: string;
    title: string;
    body: string;
    data?: any;
  };
  schema: 'public';
  old_record: null | any;
}

serve(async (req) => {
  try {
    console.log('[Push Webhook] Function called');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse webhook payload
    const rawBody = await req.text();
    console.log('[Push Webhook] Raw request body:', rawBody);
    
    const payload: WebhookPayload = JSON.parse(rawBody);
    console.log('[Push Webhook] Parsed payload:', payload);

    if (payload.type !== 'INSERT') {
      console.log('[Push Webhook] Ignoring non-INSERT event');
      return new Response(
        JSON.stringify({ message: 'Ignored non-INSERT event' }),
        { status: 200 }
      );
    }

    // Call send-push-notification with standardized format
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        interpreterIds: [payload.record.user_id],
        title: payload.record.title,
        body: payload.record.body,
        data: payload.record.data || {}
      }
    });

    if (error) {
      console.error('[Push Webhook] Error:', error);
      throw error;
    }

    console.log('[Push Webhook] Success:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200 }
    );

  } catch (error) {
    console.error('[Push Webhook] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
});
