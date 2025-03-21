
-- Update the process_message_mentions function to handle standardized languages
CREATE OR REPLACE FUNCTION public.process_message_mentions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Process direct user mentions (@Name LastName)
    FOR mention_name IN 
        SELECT trim((regexp_matches(NEW.content, '@([A-Za-zÀ-ÿ]+\s+[A-Za-zÀ-ÿ]+)', 'g'))[1])
    LOOP
        BEGIN
            -- ... keep existing code (user mention processing remains the same)
        END;
    END LOOP;

    -- Process language mentions with updated pattern to handle complex language names
    FOR language_name IN
        SELECT trim((regexp_matches(NEW.content, '@([A-Za-zÀ-ÿ\s]+(?:\s*\([^)]*\))?)', 'g'))[1])
    LOOP
        BEGIN
            -- Find all interpreters who work with this target language
            FOR interpreter_record IN
                WITH language_matches AS (
                    SELECT DISTINCT ip.id
                    FROM interpreter_profiles ip
                    JOIN channel_members cm ON cm.user_id = ip.id
                    WHERE cm.channel_id = NEW.channel_id
                    AND EXISTS (
                        SELECT 1
                        FROM unnest(ip.languages) as lang
                        WHERE 
                            -- Improved case-insensitive matching for complex language names
                            LOWER(TRIM(split_part(lang, '→', 2))) = LOWER(TRIM(language_name))
                            OR LOWER(TRIM(split_part(lang, '→', 1))) = LOWER(TRIM(language_name))
                            -- Add normalized matching for accented characters
                            OR unaccent(LOWER(TRIM(split_part(lang, '→', 2)))) = unaccent(LOWER(TRIM(language_name)))
                            OR unaccent(LOWER(TRIM(split_part(lang, '→', 1)))) = unaccent(LOWER(TRIM(language_name)))
                    )
                )
                SELECT * FROM language_matches
            LOOP
                -- ... keep existing code (mention insertion remains the same)
            END LOOP;
        END;
    END LOOP;

    RETURN NEW;
END;
$$;

-- Make sure unaccent extension is installed if not already
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'unaccent') THEN
        CREATE EXTENSION IF NOT EXISTS unaccent;
    END IF;
END
$$;

-- Update the function to fix the ambiguous id error
CREATE OR REPLACE FUNCTION public.process_message_mentions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Process direct user mentions (@Name LastName)
    FOR mention_name IN 
        SELECT trim((regexp_matches(NEW.content, '@([A-Za-zÀ-ÿ]+\s+[A-Za-zÀ-ÿ]+)', 'g'))[1])
    LOOP
        BEGIN
            -- ... keep existing code (user mention processing remains the same)
        END;
    END LOOP;

    -- Process language mentions with updated pattern to handle complex language names
    FOR language_name IN
        SELECT trim((regexp_matches(NEW.content, '@([A-Za-zÀ-ÿ\s]+(?:\s*\([^)]*\))?)', 'g'))[1])
    LOOP
        BEGIN
            -- Find all interpreters who work with this target language
            FOR interpreter_record IN
                WITH language_matches AS (
                    SELECT DISTINCT ip.id
                    FROM interpreter_profiles ip
                    JOIN channel_members cm ON cm.user_id = ip.id
                    WHERE cm.channel_id = NEW.channel_id
                    AND EXISTS (
                        SELECT 1
                        FROM unnest(ip.languages) as lang
                        WHERE 
                            -- Improved case-insensitive matching for complex language names
                            LOWER(TRIM(split_part(lang, '→', 2))) = LOWER(TRIM(language_name))
                            OR LOWER(TRIM(split_part(lang, '→', 1))) = LOWER(TRIM(language_name))
                            -- Add normalized matching for accented characters
                            OR unaccent(LOWER(TRIM(split_part(lang, '→', 2)))) = unaccent(LOWER(TRIM(language_name)))
                            OR unaccent(LOWER(TRIM(split_part(lang, '→', 1)))) = unaccent(LOWER(TRIM(language_name)))
                    )
                )
                SELECT language_matches.id FROM language_matches  -- Explicitly reference table to avoid ambiguity
            LOOP
                -- Insert mention in message_mentions table
                INSERT INTO message_mentions (message_id, channel_id, mentioned_user_id, status, created_at)
                VALUES (NEW.id, NEW.channel_id, interpreter_record, 'unread', NOW())
                ON CONFLICT DO NOTHING;
            END LOOP;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Error processing mention %: %', language_name, SQLERRM;
        END;
    END LOOP;

    RETURN NEW;
END;
$$;
