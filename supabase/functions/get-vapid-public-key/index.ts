import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    
    if (!vapidPublicKey) {
      throw new Error('VAPID public key not configured')
    }
    
    return new Response(
      JSON.stringify({ vapidPublicKey }),
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