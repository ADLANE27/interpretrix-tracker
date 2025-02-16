
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  interpreterIds: string[];
  title: string;
  body: string;
  data?: any;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get request payload
    const payload: NotificationPayload = await req.json();
    const { interpreterIds, title, body, data } = payload;

    console.log('[OneSignal] Sending notifications to interpreters:', interpreterIds);

    // Get active OneSignal subscriptions for the specified interpreters
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('onesignal_subscriptions')
      .select('*')
      .in('interpreter_id', interpreterIds)
      .eq('status', 'active');

    if (subError) {
      console.error('[OneSignal] Error fetching subscriptions:', subError);
      throw subError;
    }

    console.log('[OneSignal] Found subscriptions:', subscriptions);

    if (subscriptions.length === 0) {
      console.log('[OneSignal] No active subscriptions found');
      return new Response(
        JSON.stringify({
          success: true,
          sent: 0,
          message: 'No active subscriptions found'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Get player IDs for all subscriptions
    const playerIds = subscriptions.map(sub => sub.player_id);
    console.log('[OneSignal] Player IDs:', playerIds);

    if (!Deno.env.get('ONESIGNAL_APP_ID') || !Deno.env.get('ONESIGNAL_REST_API_KEY')) {
      throw new Error('OneSignal credentials not configured');
    }

    // Prepare OneSignal notification payload
    const oneSignalPayload = {
      app_id: Deno.env.get('ONESIGNAL_APP_ID'),
      include_player_ids: playerIds,
      headings: { en: title },
      contents: { en: body },
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
      android_channel_id: "interpretrix-missions",
      ios_sound: "notification.wav",
      android_sound: "notification",
      priority: 10,
      large_icon: "/lovable-uploads/8277f799-8748-4846-add4-f1f81f7576d3.png"
    };

    console.log('[OneSignal] Sending notification with payload:', oneSignalPayload);

    // Send notification via OneSignal
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Deno.env.get('ONESIGNAL_REST_API_KEY')}`,
      },
      body: JSON.stringify(oneSignalPayload),
    });

    const responseData = await response.json();
    console.log('[OneSignal] OneSignal API response:', responseData);

    if (!response.ok) {
      console.error('[OneSignal] Error sending notification:', responseData);
      throw new Error(responseData.errors?.[0] || 'Failed to send notification');
    }

    // Record notifications in history
    const notificationRecords = interpreterIds.map(interpreterId => ({
      interpreter_id: interpreterId,
      mission_id: data?.mission_id,
      notification_type: data?.type || 'mission',
      title,
      message: body,
      status: 'sent',
      metadata: {
        oneSignalResponse: responseData,
        data
      }
    }));

    const { error: historyError } = await supabaseAdmin
      .from('notification_history')
      .insert(notificationRecords);

    if (historyError) {
      console.error('[OneSignal] Error recording notification history:', historyError);
    }

    // Update last_notification_sent and increment notification_count
    const { error: updateError } = await supabaseAdmin
      .from('onesignal_subscriptions')
      .update({ 
        last_notification_sent: new Date().toISOString(),
        notification_count: subscriptions[0].notification_count + 1
      })
      .in('player_id', playerIds);

    if (updateError) {
      console.error('[OneSignal] Error updating subscription stats:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: playerIds.length,
        oneSignalResponse: responseData
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[OneSignal] Fatal error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: 'Failed to send push notifications'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
