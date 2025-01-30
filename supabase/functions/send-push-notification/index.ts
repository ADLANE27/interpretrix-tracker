import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import webPush from 'npm:web-push'
import { createClient } from 'npm:@supabase/supabase-js'

serve(async (req) => {
  try {
    const { message } = await req.json()
    
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys not configured')
    }
    
    webPush.setVapidDetails(
      'mailto:debassi.adlane@gmail.com',
      vapidPublicKey,
      vapidPrivateKey
    )
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Récupérer tous les abonnements actifs pour les interprètes concernés
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('status', 'active')
      .in('interpreter_id', message.interpreterIds || [])
    
    if (subscriptionError) throw subscriptionError
    
    const notifications = subscriptions?.map(async (sub) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          },
          JSON.stringify({
            title: message.title,
            body: message.body,
            icon: message.icon,
            data: message.data
          })
        )
        
        // Mettre à jour la date du dernier envoi réussi
        await supabase
          .from('push_subscriptions')
          .update({ 
            last_successful_push: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', sub.id)
          
      } catch (error) {
        console.error(`Failed to send notification to subscription ${sub.id}:`, error)
        
        if (error.statusCode === 410) {
          // L'abonnement n'est plus valide
          await supabase
            .from('push_subscriptions')
            .update({ 
              status: 'expired',
              updated_at: new Date().toISOString()
            })
            .eq('id', sub.id)
        }
      }
    })
    
    await Promise.all(notifications || [])
    
    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { "Content-Type": "application/json" },
        status: 200 
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { "Content-Type": "application/json" },
        status: 500
      },
    )
  }
})