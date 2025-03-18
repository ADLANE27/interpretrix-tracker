
-- Function to get source languages from channel interpreters
CREATE OR REPLACE FUNCTION public.get_channel_source_languages(p_channel_id uuid)
RETURNS TABLE(source_language text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH language_pairs AS (
        -- Get all languages from channel members who are interpreters
        SELECT DISTINCT unnest(ip.languages) as lang_pair
        FROM channel_members cm
        JOIN interpreter_profiles ip ON cm.user_id = ip.id
        JOIN user_roles ur ON cm.user_id = ur.user_id
        WHERE cm.channel_id = p_channel_id
        AND ur.role = 'interpreter'
    )
    SELECT DISTINCT trim(split_part(lang_pair, '→', 1)) as source_language
    FROM language_pairs
    WHERE lang_pair LIKE '%→%'
    ORDER BY source_language;
END;
$$;
