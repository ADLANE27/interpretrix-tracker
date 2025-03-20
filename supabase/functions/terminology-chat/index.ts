
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
    const { message, sourceLanguage, targetLanguage, userId, conversationId, previousMessages = [] } = await req.json();

    if (!message || !sourceLanguage || !targetLanguage || !userId) {
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

    // Generate a request ID for tracing
    const requestId = crypto.randomUUID();
    console.log(`Request ID: ${requestId} - Starting chat API call to OpenRouter with DeepSeek-R1-Zero model`);
    
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
    let chatId = conversationId;

    // If no conversation ID is provided, create a new chat session
    if (!chatId) {
      const { data: newChat, error: createChatError } = await supabase
        .from('terminology_chats')
        .insert({
          user_id: userId,
          source_language: sourceLanguage,
          target_language: targetLanguage,
          title: message.substring(0, 50) + (message.length > 50 ? '...' : '')
        })
        .select()
        .single();

      if (createChatError) {
        console.error(`Request ID: ${requestId} - Error creating chat session:`, createChatError);
        return new Response(
          JSON.stringify({ error: 'Failed to create chat session' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      chatId = newChat.id;
      console.log(`Request ID: ${requestId} - Created new chat session with ID: ${chatId}`);
    }

    // Save the user message to the database
    const { error: insertUserMessageError } = await supabase
      .from('terminology_chat_messages')
      .insert({
        chat_id: chatId,
        role: 'user',
        content: message
      });

    if (insertUserMessageError) {
      console.error(`Request ID: ${requestId} - Error saving user message:`, insertUserMessageError);
    }

    // Construct messages for the API, only including previous context without system message
    let apiMessages = [];

    // Add previous messages to maintain conversation context
    if (previousMessages && previousMessages.length > 0) {
      for (const prevMsg of previousMessages) {
        apiMessages.push({
          role: prevMsg.role,
          content: prevMsg.content
        });
      }
    }

    // Add the current user message
    apiMessages.push({
      role: 'user',
      content: message
    });

    // Use more complete URL and include timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      // Call OpenRouter API with a more reasonable timeout
      console.log(`Request ID: ${requestId} - Sending request to OpenRouter API`);
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://interpretor-app.com',
          'X-Title': 'Interpreter Terminology Chat',
          'User-Agent': 'Supabase Edge Function',
          'X-Request-ID': requestId
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-r1-zero:free',
          messages: apiMessages,
          temperature: 0.7,
          max_tokens: 800,
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log(`Request ID: ${requestId} - OpenRouter API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Request ID: ${requestId} - OpenRouter API error response:`, errorText);
        throw new Error(`API returned status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log(`Request ID: ${requestId} - OpenRouter API response data received`);

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error(`Request ID: ${requestId} - Unexpected API response format:`, JSON.stringify(data));
        throw new Error('Unexpected response format from API');
      }

      // Get the raw response without any additional processing
      const assistantResponse = data.choices[0].message.content.trim();
      console.log(`Request ID: ${requestId} - Assistant response: ${assistantResponse.substring(0, 100)}...`);

      // Save the assistant response to the database
      const { data: savedResponse, error: insertAssistantMessageError } = await supabase
        .from('terminology_chat_messages')
        .insert({
          chat_id: chatId,
          role: 'assistant',
          content: assistantResponse
        })
        .select()
        .single();

      if (insertAssistantMessageError) {
        console.error(`Request ID: ${requestId} - Error saving assistant response:`, insertAssistantMessageError);
        // Continue anyway to return the response to the user
      }

      return new Response(
        JSON.stringify({ 
          chatId,
          message: assistantResponse,
          messageId: savedResponse?.id || null,
          isNewChat: !conversationId
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error(`Request ID: ${requestId} - Error fetching from OpenRouter API:`, fetchError);
      
      // Determine if this is a network connectivity issue
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
      
      // Special handling for different error types
      if (errorMessage.includes('AbortError')) {
        return new Response(
          JSON.stringify({ 
            error: `Request to API timed out. Please try again later.` 
          }),
          { 
            status: 504, // Gateway Timeout
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } else if (errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch')) {
        return new Response(
          JSON.stringify({ 
            error: `Network error connecting to API. Please try again later.` 
          }),
          { 
            status: 503, // Service Unavailable
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: `Error connecting to API: ${errorMessage}` 
        }),
        { 
          status: 502, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    console.error('Error in terminology chat function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An unknown error occurred' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
