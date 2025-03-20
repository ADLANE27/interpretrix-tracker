
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.1';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts';

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
    // Get the API key from environment variables
    const apiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!apiKey) {
      console.error('OPENROUTER_API_KEY is not set');
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
    const { term, sourceLanguage, targetLanguage, userId } = await req.json();

    if (!term || !sourceLanguage || !targetLanguage || !userId) {
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
    console.log(`Searching for term: ${term} from ${sourceLanguage} to ${targetLanguage}`);
    
    try {
      // Generate a request ID for tracing
      const requestId = crypto.randomUUID();
      console.log(`Request ID: ${requestId} - Starting API call to OpenRouter with DeepSeek-R1-Zero model`);
      
      // Use more complete URL and include timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      // Max retries
      const MAX_RETRIES = 2;
      let currentRetry = 0;
      let response = null;
      let data = null;
      
      while (currentRetry <= MAX_RETRIES) {
        if (currentRetry > 0) {
          console.log(`Request ID: ${requestId} - Retry attempt ${currentRetry} of ${MAX_RETRIES}`);
        }
        
        response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
                content: `You are a professional translator specialized in terminology. 
You need to provide an EXACT and DIRECT translation of a term from ${sourceLanguage} to ${targetLanguage}.

IMPORTANT GUIDELINES:
1. Respond ONLY with the translation itself - no explanations or additional text
2. If there are multiple possible translations, provide ONLY the most common or appropriate one
3. If you're not sure about a translation, give your best professional guess
4. NEVER leave the response empty or claim you cannot translate
5. Always return a usable translation as your entire response
6. Provide only a single word or phrase, nothing more`
              },
              {
                role: 'user',
                content: term
              }
            ],
            temperature: 0.1,
            max_tokens: 100,
          }),
          signal: controller.signal
        });
        
        console.log(`Request ID: ${requestId} - OpenRouter API response status: ${response.status}`);
        
        // If rate limited, wait and retry
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '2');
          console.log(`Request ID: ${requestId} - Rate limited. Waiting ${retryAfter} seconds before retry.`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          currentRetry++;
          continue;
        }
        
        // Handle non-rate-limit errors
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Request ID: ${requestId} - OpenRouter API error response:`, errorText);
          break; // Exit the retry loop for non-429 errors
        }
        
        // If we got an OK response, parse the data
        data = await response.json();
        console.log(`Request ID: ${requestId} - OpenRouter API response data:`, JSON.stringify(data));
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
          let result = data.choices[0].message.content.trim();
          
          // Check if result is empty or just whitespace
          if (!result || !result.trim()) {
            console.error(`Request ID: ${requestId} - Empty result returned from OpenRouter API`);
            if (currentRetry < MAX_RETRIES) {
              console.log(`Request ID: ${requestId} - Retrying due to empty result`);
              currentRetry++;
              continue;
            }
            // If we're out of retries, use a fallback message
            result = `[Translation not available]`;
          }
          
          // We have a valid result, so break out of the retry loop
          break;
        } else {
          console.error(`Request ID: ${requestId} - Unexpected OpenRouter API response format:`, JSON.stringify(data));
          currentRetry++;
          continue;
        }
      }
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      // Handle the case where all retries failed
      if (!response || !response.ok) {
        const errorStatus = response ? response.status : 500;
        const errorMessage = `Failed to get a valid response after ${MAX_RETRIES + 1} attempts`;
        console.error(`Request ID: ${requestId} - ${errorMessage}`);
        
        return new Response(
          JSON.stringify({ 
            error: errorMessage
          }),
          { 
            status: 502, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Handle the case where we got a response but no valid data
      if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error(`Request ID: ${requestId} - No valid data in response:`, data ? JSON.stringify(data) : "null");
        return new Response(
          JSON.stringify({ 
            error: 'Unexpected response format from OpenRouter API'
          }),
          { 
            status: 502, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Extract the result
      const result = data.choices[0].message.content.trim() || "[Translation not available]";
      
      // Create Supabase client
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase URL or service role key');
        return new Response(
          JSON.stringify({ 
            error: 'Database connection error' 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      // Save search to history
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
        console.error(`Request ID: ${requestId} - Error saving search history:`, insertError);
      }

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
      console.error('Error fetching from OpenRouter API:', fetchError);
      
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
    console.error('Error in terminology search function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
