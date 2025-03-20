
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get DeepSeek API key from environment
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!deepseekApiKey) {
      throw new Error("DeepSeek API key not found");
    }

    // Parse request
    const { term, sourceLanguage, targetLanguage, context } = await req.json();
    
    console.log(`Searching terminology: "${term}" from ${sourceLanguage} to ${targetLanguage}`);

    // Build prompt based on search requirements
    let prompt = `Je suis un interprète professionnel travaillant du ${sourceLanguage} vers le ${targetLanguage}. 
    J'ai besoin de la traduction précise et du contexte d'utilisation du terme technique suivant: "${term}".`;

    if (context) {
      prompt += `\nContexte supplémentaire: "${context}"`;
    }

    // Call DeepSeek API
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "Tu es un dictionnaire terminologique spécialisé pour les interprètes professionnels. Fournis des traductions précises avec contexte d'utilisation, domaine d'application, et exemples d'usage. Sois concis mais complet."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("DeepSeek API error:", data);
      throw new Error(`DeepSeek API error: ${data.error?.message || "Unknown error"}`);
    }

    return new Response(
      JSON.stringify({
        result: data.choices[0]?.message?.content || "Pas de résultat trouvé",
        searchTerm: term,
        sourceLanguage,
        targetLanguage
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in terminology-search function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
