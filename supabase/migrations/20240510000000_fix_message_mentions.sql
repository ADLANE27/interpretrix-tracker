
-- Update the process_message_mentions function to handle both user and language mentions properly
CREATE OR REPLACE FUNCTION public.process_message_mentions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    mention_name text;
    mentioned_user_id uuid;
    language_name text;
    interpreter_record uuid;
BEGIN
    -- Process direct user mentions (@Name LastName)
    FOR mention_name IN 
        SELECT trim((regexp_matches(NEW.content, '@([A-Za-zÀ-ÿ]+\s+[A-Za-zÀ-ÿ]+)', 'g'))[1])
    LOOP
        BEGIN
            -- Find mentioned user by checking interpreter_profiles first
            SELECT id INTO mentioned_user_id
            FROM interpreter_profiles
            WHERE 
                LOWER(CONCAT(first_name, ' ', last_name)) = LOWER(mention_name);
                
            IF mentioned_user_id IS NULL THEN
                -- If not found in interpreter profiles, check admin users
                SELECT au.id INTO mentioned_user_id
                FROM auth.users au
                JOIN user_roles ur ON au.id = ur.user_id
                WHERE ur.role = 'admin'
                AND LOWER(CONCAT(
                    COALESCE(au.raw_user_meta_data->>'first_name', ''),
                    ' ',
                    COALESCE(au.raw_user_meta_data->>'last_name', '')
                )) = LOWER(mention_name);
            END IF;

            IF mentioned_user_id IS NOT NULL THEN
                INSERT INTO message_mentions (message_id, channel_id, mentioned_user_id, status, created_at)
                VALUES (NEW.id, NEW.channel_id, mentioned_user_id, 'unread', NOW())
                ON CONFLICT (message_id, mentioned_user_id) 
                DO NOTHING;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Error processing user mention %: %', mention_name, SQLERRM;
        END;
    END LOOP;

    -- Process language mentions (@Language) - improved pattern to match single word language names
    FOR language_name IN 
        SELECT trim((regexp_matches(NEW.content, '@([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)*)', 'g'))[1])
    LOOP
        BEGIN
            -- Skip if this is a user mention (has space in the name)
            -- Language mentions are typically single words like @French, @English, etc.
            IF position(' ' IN language_name) > 0 THEN
                CONTINUE; -- Skip to next iteration for user mentions
            END IF;
            
            -- Find all interpreters who work with this target language
            FOR interpreter_record IN
                SELECT DISTINCT ip.id
                FROM interpreter_profiles ip
                JOIN channel_members cm ON cm.user_id = ip.id
                WHERE cm.channel_id = NEW.channel_id
                AND EXISTS (
                    SELECT 1
                    FROM unnest(ip.languages) as lang
                    WHERE 
                        -- Match language name in source or target of language pair
                        LOWER(TRIM(split_part(lang, '→', 2))) = LOWER(TRIM(language_name))
                        OR LOWER(TRIM(split_part(lang, '→', 1))) = LOWER(TRIM(language_name))
                )
            LOOP
                -- Only insert mention if interpreter is not the sender
                IF interpreter_record != NEW.sender_id THEN
                    INSERT INTO message_mentions (message_id, channel_id, mentioned_user_id, status, created_at)
                    VALUES (NEW.id, NEW.channel_id, interpreter_record, 'unread', NOW())
                    ON CONFLICT (message_id, mentioned_user_id) 
                    DO NOTHING;
                END IF;
            END LOOP;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Error processing language mention %: %', language_name, SQLERRM;
        END;
    END LOOP;

    RETURN NEW;
END;
$$;

-- Make sure there is a unique constraint on message_mentions to prevent duplicates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'message_mentions_message_mentioned_user_unique'
    ) THEN
        ALTER TABLE public.message_mentions 
        ADD CONSTRAINT message_mentions_message_mentioned_user_unique 
        UNIQUE (message_id, mentioned_user_id);
    END IF;
END
$$;

