
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

    // Make a request to OpenRouter API
    console.log(`[${requestId}] Searching for term: "${term}" from ${sourceLanguage} to ${targetLanguage}`);
    
    try {
      // Use more complete URL and include timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      console.log(`[${requestId}] Making API call to OpenRouter with DeepSeek-R1-Zero model`);
      
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
          model: 'deepseek/deepseek-r1-zero:free',
          messages: [
            {
              role: 'system',
              content: `Translate the term from ${sourceLanguage} to ${targetLanguage}. Reply only with the translation, no explanations.`
            },
            {
              role: 'user',
              content: term
            }
          ],
          temperature: 0.2,
          max_tokens: 100,
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
          // Log detailed error information for debugging
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
      console.log(`[${requestId}] OpenRouter API response received`);

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

      console.log(`[${requestId}] Returning successful response`);
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
