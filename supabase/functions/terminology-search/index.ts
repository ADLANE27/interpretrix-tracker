
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.1';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request with CORS headers');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Generate a request ID for tracing
    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] Terminology search function invoked`);
    
    // Get the API key from environment variables
    const apiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!apiKey) {
      console.error(`[${requestId}] OPENROUTER_API_KEY is not set`);
      return new Response(
        JSON.stringify({ 
          error: 'API key not configured. Please contact administrator.' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get request data
    let requestData;
    try {
      requestData = await req.json();
      console.log(`[${requestId}] Request data received:`, JSON.stringify(requestData));
    } catch (error) {
      console.error(`[${requestId}] Error parsing request JSON:`, error);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { term, sourceLanguage, targetLanguage, userId } = requestData;

    if (!term || !sourceLanguage || !targetLanguage || !userId) {
      console.error(`[${requestId}] Missing required parameters:`, { term, sourceLanguage, targetLanguage, userId });
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create the prompt - use French prompt for better French results
    const prompt = `
Analysez le terme "${term}" en ${sourceLanguage} et traduisez-le en ${targetLanguage} avec une profondeur linguistique complète. Abordez cette analyse en combinant les expertises d'un linguiste, d'un lexicographe, d'un étymologiste et d'un traducteur.

Composantes d'Analyse Requises
1. Définition Fondamentale & Classification
- Fournissez une définition académique précise
- Identifiez la classification grammaticale (partie du discours, genre si applicable)
- Notez le registre (formel, informel, archaïque, technique, argotique, etc.)
- Énumérez toutes les formes variantes majeures (pluriel, conjugaisons, déclinaisons)

2. Analyse Étymologique
- Retracez la lignée étymologique complète jusqu'à la proto-langue lorsque possible
- Détaillez tous les changements sémantiques historiques et l'évolution du sens
- Identifiez les cognats dans les langues apparentées
- Notez les changements significatifs d'orthographe/prononciation à travers l'histoire
- Incluez les dates/périodes approximatives des étapes évolutives clés

3. Traduction Complète
- Traduction principale avec notes sur la précision/chevauchement sémantique
- Traductions alternatives avec conseils d'utilisation contextuelle
- Défis de traduction et lacunes sémantiques potentielles
- Adaptations culturelles requises pour un transfert complet du sens
- Traductions équivalentes selon le registre (formel, informel, technique)

4. Cartographie du Champ Sémantique
- Synonymes complets organisés par nuance sémantique
- Antonymes avec modèles d'opposition contextuelle
- Hyperonymes et hyponymes (termes plus larges/plus étroits)
- Co-hyponymes (termes au même niveau sémantique)
- Visualisation complète du réseau sémantique

5. Analyse d'Usage Contextuel
- Significations spécifiques à divers domaines disciplinaires
- Variations régionales/dialectales avec exemples
- Modèles d'usage historiques et tendances de fréquence
- Statistiques de fréquence d'usage moderne
- Collocations et modèles phrastiques courants
- Expressions idiomatiques contenant le terme

6. Analyse Phonologique & Orthographique
- Transcription API avec modèles d'accentuation
- Évolutions historiques de la prononciation
- Analyse de la structure syllabique
- Variations orthographiques (historiques et régionales)
- Caractéristiques phonologiques notables

7. Décomposition Morphologique
- Identification des racines, préfixes, suffixes
- Frontières morphémiques et contributions au sens
- Possibilités et modèles dérivationnels
- Formations composées et leurs relations sémantiques

8. Dimensions Culturelles & Conceptuelles
- Associations culturelles et connotations
- Métaphores conceptuelles construites autour de ce terme
- Présence dans les expressions/artefacts culturels
- Tabous ou sensibilités associés à l'usage
- Différences de perception interculturelle

9. Exemples de Corpus
- Exemples d'usage authentiques provenant de sources diverses
- Attestations historiques montrant l'évolution du sens
- Exemples contemporains démontrant l'étendue sémantique
- Exemples parallèles en langue cible montrant l'équivalence

10. Représentation Visuelle
- Créez une carte sémantique visuelle reliant tous les termes apparentés
- Montrez les relations hiérarchiques au sein du champ conceptuel
- Indiquez visuellement les connections étymologiques
- Représentez les variations de registre sur un spectre

Instructions Spéciales
- En cas de terminologie rare ou spécialisée, reconnaissez les limitations tout en fournissant le maximum d'informations disponibles
- Pour les termes à forte charge culturelle, fournissez un contexte culturel approfondi
- Lors de l'analyse de termes polysémiques, organisez toutes les significations historiquement et par fréquence
- Pour les néologismes ou termes récemment évolués, tracez les modèles de développement et d'adoption récents
- Si le terme a un sens spécialisé dans plusieurs domaines, abordez chaque domaine séparément

Format de Sortie
Présentez l'analyse dans un format structuré et hiérarchique avec des en-têtes de section clairs. Utilisez des tableaux pour les données comparatives, les chronologies étymologiques et les équivalents de traduction. Employez des listes à puces imbriquées pour les relations sémantiques.

Langue de Réponse
IMPORTANT: Votre analyse complète DOIT être rédigée en ${targetLanguage}. Tous les explications, en-têtes et contenus doivent être en ${targetLanguage}, pas en anglais ou français.

Note Finale
Appliquez le plus haut niveau de précision linguistique et de rigueur académique à cette analyse. Appuyez-vous sur les méthodologies de la linguistique historique, de la linguistique de corpus, de la linguistique cognitive et de la théorie de la traduction pour assurer une couverture complète.
`;

    // Make a request to OpenRouter API
    console.log(`[${requestId}] Searching for term: "${term}" from ${sourceLanguage} to ${targetLanguage}`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout (increased from 10)
      
      console.log(`[${requestId}] Making API call to OpenRouter with larger token limit`);
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://interpretor-app.com',
          'X-Title': 'Interpreter Terminology Tool',
          'User-Agent': 'Supabase Edge Function',
          'X-Request-ID': requestId
        },
        body: JSON.stringify({
          model: 'mistralai/mistral-7b-instruct:free',
          messages: [
            {
              role: 'system',
              content: `Vous êtes un expert linguistique de classe mondiale, spécialisé en étymologie, lexicographie, sémantique et théorie de la traduction. Fournissez une analyse linguistique détaillée. Votre réponse DOIT être entièrement rédigée en ${targetLanguage}.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 2000,
        }),
        signal: controller.signal
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);

      console.log(`[${requestId}] OpenRouter API response status: ${response.status}`);
      
      // Handle rate limit exceeded
      if (response.status === 429) {
        console.error(`[${requestId}] OpenRouter API rate limit exceeded`);
        return new Response(
          JSON.stringify({ 
            error: 'Service temporarily unavailable. Please try again later.' 
          }),
          { 
            status: 429, 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'Retry-After': response.headers.get('Retry-After') || '60'
            } 
          }
        );
      }
      
      // Log detailed error information
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${requestId}] OpenRouter API error response:`, errorText);
        
        let errorDetail;
        try {
          const errorJson = JSON.parse(errorText);
          errorDetail = JSON.stringify(errorJson);
          console.error(`[${requestId}] OpenRouter API error details:`, JSON.stringify(errorJson, null, 2));
        } catch (e) {
          errorDetail = errorText;
          console.error(`[${requestId}] OpenRouter API error (not JSON):`, errorText);
        }
        
        return new Response(
          JSON.stringify({ 
            error: `OpenRouter API error: ${response.status} - ${errorDetail}`
          }),
          { 
            status: 502, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const data = await response.json();
      console.log(`[${requestId}] OpenRouter API response received:`, JSON.stringify(data));

      // Extract the result from the response structure that OpenRouter returns
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error(`[${requestId}] Unexpected OpenRouter API response format:`, JSON.stringify(data));
        return new Response(
          JSON.stringify({ 
            error: 'Unexpected response format from OpenRouter API',
            response: data
          }),
          { 
            status: 502, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const result = data.choices[0].message.content.trim();
      console.log(`[${requestId}] Extracted result: "${result.substring(0, 100)}..."` + (result.length > 100 ? " (truncated for logs)" : ""));
      
      // Check if result is empty or just whitespace
      if (!result || !result.trim()) {
        console.error(`[${requestId}] Empty result returned from OpenRouter API`);
        return new Response(
          JSON.stringify({ 
            error: 'No translation result received. Please try again.' 
          }),
          { 
            status: 422, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Create Supabase client
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (!supabaseUrl || !supabaseKey) {
        console.error(`[${requestId}] Missing Supabase URL or service role key`);
        // Still return the result even if we can't save to history
        return new Response(
          JSON.stringify({ 
            result,
            term,
            sourceLanguage,
            targetLanguage,
            warning: 'Result not saved to history due to database configuration issue'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      // Save search to history
      console.log(`[${requestId}] Saving search to history for user ${userId}`);
      const { error: insertError } = await supabase
        .from('terminology_searches')
        .insert({
          user_id: userId,
          term,
          result,
          source_language: sourceLanguage,
          target_language: targetLanguage,
        });

      if (insertError) {
        console.error(`[${requestId}] Error saving search history:`, insertError);
      } else {
        console.log(`[${requestId}] Search saved to history successfully`);
      }

      console.log(`[${requestId}] Returning successful response with detailed linguistic analysis`);
      return new Response(
        JSON.stringify({ 
          result,
          term,
          sourceLanguage,
          targetLanguage 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } catch (fetchError) {
      console.error(`[${requestId}] Error fetching from OpenRouter API:`, fetchError);
      
      // Determine if this is a network connectivity issue
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
      
      // Special handling for different error types
      if (errorMessage.includes('AbortError')) {
        return new Response(
          JSON.stringify({ 
            error: `Request to OpenRouter API timed out. Please try again later.` 
          }),
          { 
            status: 504, // Gateway Timeout
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } else if (errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch')) {
        return new Response(
          JSON.stringify({ 
            error: `Network error connecting to OpenRouter API. Please try again later.` 
          }),
          { 
            status: 503, // Service Unavailable
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: `Error connecting to OpenRouter API: ${errorMessage}` 
        }),
        { 
          status: 502, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    const errorId = crypto.randomUUID();
    console.error(`[${errorId}] Unhandled error in terminology search function:`, error);
    return new Response(
      JSON.stringify({ 
        error: `An unexpected error occurred (ID: ${errorId}). Please try again later.`,
        errorDetails: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
