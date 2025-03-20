
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

    // Create the comprehensive linguistic analysis prompt
    const prompt = `
Primary Instructions
Analyze the term "${term}" in ${sourceLanguage} and translate to ${targetLanguage} with complete linguistic depth. Approach this analysis as a expert linguist, lexicographer, etymologist, and translator combined.

Required Analysis Components
1. Core Definition & Classification
- Provide a precise, academic definition
- Identify grammatical classification (part of speech, gender if applicable)
- Note register (formal, informal, archaic, technical, slang, etc.)
- List all major variant forms (plural, conjugations, declensions)

2. Etymological Analysis
- Trace complete etymological lineage back to proto-language when possible
- Detail all historical semantic shifts and meaning evolution
- Identify cognates in related languages
- Note significant spelling/pronunciation changes throughout history
- Include approximate dates/periods for key evolutionary stages

3. Comprehensive Translation
- Primary translation with notes on semantic precision/overlap
- Alternative translations with context-specific usage guidance
- Translation challenges and potential semantic gaps
- Cultural adaptations required for full meaning transfer
- Register-equivalent translations (formal, informal, technical)

4. Semantic Field Mapping
- Comprehensive synonyms organized by semantic nuance
- Antonyms with contextual opposition patterns
- Hypernyms and hyponyms (broader/narrower terms)
- Co-hyponyms (terms at same semantic level)
- Complete semantic network visualization

5. Contextual Usage Analysis
- Domain-specific meanings across disciplines
- Regional/dialectal variations with examples
- Historical usage patterns and frequency trends
- Modern usage frequency statistics
- Collocations and common phrasal patterns
- Idiomatic expressions containing the term

6. Phonological & Orthographic Analysis
- IPA transcription with stress patterns
- Historical pronunciation shifts
- Syllabic structure analysis
- Orthographic variations (historical and regional)
- Notable phonological features

7. Morphological Breakdown
- Root, prefix, suffix identification
- Morpheme boundaries and meaning contributions
- Derivational possibilities and patterns
- Compound formations and their semantic relationships

8. Cultural & Conceptual Dimensions
- Cultural associations and connotations
- Conceptual metaphors built on this term
- Presence in cultural expressions/artifacts
- Taboos or sensitivities associated with usage
- Cross-cultural perception differences

9. Corpus Examples
- Authentic usage examples from diverse sources
- Historical attestations showing meaning evolution
- Contemporary examples demonstrating semantic range
- Parallel examples in target language showing equivalence

10. Visual Representation
- Create a visual semantic map connecting all related terms
- Show hierarchical relationships within the concept field
- Indicate etymological connections visually
- Represent register variations on a spectrum

Special Instructions
- If encountering rare or specialized terminology, acknowledge limitations while providing maximum available information
- For terms with significant cultural loading, provide extensive cultural context
- When analyzing polysemous terms, organize all meanings historically and by frequency
- For neologisms or recently evolved terms, trace recent development and adoption patterns
- If term has specialized meaning in multiple domains, address each domain separately

Output Format
Present the analysis in a structured, hierarchical format with clear section headers. Use tables for comparative data, etymology timelines, and translation equivalents. Employ nested bullet points for semantic relationships.

Final Note
Apply the highest level of linguistic precision and academic rigor to this analysis. Draw upon historical linguistics, corpus linguistics, cognitive linguistics, and translation theory methodologies to ensure comprehensive coverage.
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
              content: "You are a world-class linguistic expert proficient in etymology, lexicography, semantics, and translation theory. Provide detailed linguistic analysis."
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 2000, // Increased from 50 to 2000
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
