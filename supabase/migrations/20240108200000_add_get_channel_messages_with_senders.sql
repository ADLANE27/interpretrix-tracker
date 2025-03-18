
-- Create a function to get messages with sender details in a single query
CREATE OR REPLACE FUNCTION public.get_channel_messages_with_senders(p_channel_id UUID)
RETURNS TABLE (
  id UUID,
  content TEXT,
  created_at TIMESTAMPTZ,
  channel_id UUID,
  sender_id UUID,
  parent_message_id UUID,
  reactions JSONB,
  attachments JSONB[],
  channel_type TEXT,
  sender_name TEXT,
  sender_avatar TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH message_data AS (
    SELECT 
      m.*,
      c.channel_type
    FROM chat_messages m
    JOIN chat_channels c ON m.channel_id = c.id
    WHERE m.channel_id = p_channel_id
  )
  SELECT 
    md.id,
    md.content,
    md.created_at,
    md.channel_id,
    md.sender_id,
    md.parent_message_id,
    md.reactions,
    md.attachments,
    md.channel_type,
    -- Get sender details
    COALESCE(
      -- Interpreter name
      (SELECT first_name || ' ' || last_name FROM interpreter_profiles WHERE id = md.sender_id),
      -- Admin name from auth.users
      (SELECT 
        COALESCE(raw_user_meta_data->>'first_name', '') || ' ' || 
        COALESCE(raw_user_meta_data->>'last_name', '')
       FROM auth.users WHERE id = md.sender_id),
      'Unknown User'
    ) as sender_name,
    -- Get avatar URL
    COALESCE(
      (SELECT profile_picture_url FROM interpreter_profiles WHERE id = md.sender_id),
      ''
    ) as sender_avatar
  FROM message_data md
  ORDER BY md.created_at ASC;
END;
$$;

-- Add index to improve performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_id ON chat_messages (channel_id);
