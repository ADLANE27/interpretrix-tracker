import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { generateVAPIDKeys } from 'npm:web-push'

serve(async (req) => {
  try {
    const vapidKeys = generateVAPIDKeys()
    
    return new Response(
      JSON.stringify(vapidKeys),
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