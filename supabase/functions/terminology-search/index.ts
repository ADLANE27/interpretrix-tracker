
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
              content: `You are a professional translator specialized in terminology. Your task is to provide an exact, precise, and direct translation of a term from ${sourceLanguage} to ${targetLanguage}. Respond ONLY with the translation itself - no explanations, commentary, or additional text. Provide the exact equivalent term in the target language, nothing more. If multiple translations are possible, provide only the most commonly used equivalent.`
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

      console.log(`Request ID: ${requestId} - OpenRouter API response status: ${response.status}`);
      
      // Handle rate limit exceeded
      if (response.status === 429) {
        console.error(`Request ID: ${requestId} - OpenRouter API rate limit exceeded`);
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
        console.error(`Request ID: ${requestId} - OpenRouter API error response:`, errorText);
        
        let errorDetail;
        try {
          const errorJson = JSON.parse(errorText);
          errorDetail = JSON.stringify(errorJson);
          // Log detailed error information for debugging
          console.error(`Request ID: ${requestId} - OpenRouter API error details:`, JSON.stringify(errorJson, null, 2));
        } catch (e) {
          errorDetail = errorText;
          console.error(`Request ID: ${requestId} - OpenRouter API error (not JSON):`, errorText);
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
      console.log(`Request ID: ${requestId} - OpenRouter API response data:`, JSON.stringify(data));

      // Extract the result from the response structure that OpenRouter returns
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error(`Request ID: ${requestId} - Unexpected OpenRouter API response format:`, JSON.stringify(data));
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
        console.error(`Request ID: ${requestId} - Empty result returned from OpenRouter API`);
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
