
-- Update the process_message_mentions function to only handle user mentions
CREATE OR REPLACE FUNCTION public.process_message_mentions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    mention_name text;
    mentioned_user_id uuid;
BEGIN
    -- Process direct user mentions (@Name LastName)
    FOR mention_name IN 
        SELECT trim((regexp_matches(NEW.content, '@([A-Za-zÀ-ÿ]+\s+[A-Za-zÀ-ÿ]+)', 'g'))[1])
    LOOP
        BEGIN
            SELECT id INTO mentioned_user_id
            FROM public.profiles
            WHERE 
                LOWER(SPLIT_PART(full_name, ' ', 1)) = LOWER(SPLIT_PART(mention_name, ' ', 1))
                AND LOWER(SPLIT_PART(full_name, ' ', 2)) = LOWER(SPLIT_PART(mention_name, ' ', 2));

            IF mentioned_user_id IS NOT NULL THEN
                INSERT INTO message_mentions (message_id, channel_id, mentioned_user_id, status, created_at)
                VALUES (NEW.id, NEW.channel_id, mentioned_user_id, 'unread', NOW())
                ON CONFLICT DO NOTHING;
            END IF;
        END;
    END LOOP;

    RETURN NEW;
END;
$$;

-- Make sure unaccent extension is still available if needed elsewhere
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'unaccent') THEN
        CREATE EXTENSION IF NOT EXISTS unaccent;
    END IF;
END
$$;
