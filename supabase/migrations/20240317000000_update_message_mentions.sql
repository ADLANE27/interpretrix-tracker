
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
            -- Find mentioned interpreter
            SELECT id INTO mentioned_user_id
            FROM interpreter_profiles
            WHERE CONCAT(first_name, ' ', last_name) = mention_name;
            
            -- If found an interpreter, insert the mention
            IF mentioned_user_id IS NOT NULL THEN
                INSERT INTO message_mentions (
                    message_id,
                    mentioned_user_id,
                    channel_id,
                    status
                )
                VALUES (
                    NEW.id,
                    mentioned_user_id,
                    NEW.channel_id,
                    'unread'
                );
            ELSE
                -- If not found in interpreter profiles, check admin users
                FOR admin_record IN
                    SELECT 
                        id, 
                        CONCAT(
                            COALESCE(raw_user_meta_data->>'first_name', ''), 
                            ' ', 
                            COALESCE(raw_user_meta_data->>'last_name', '')
                        ) as full_name
                    FROM auth.users u
                    JOIN user_roles ur ON u.id = ur.user_id
                    WHERE ur.role = 'admin'
                    AND CONCAT(
                        COALESCE(raw_user_meta_data->>'first_name', ''), 
                        ' ', 
                        COALESCE(raw_user_meta_data->>'last_name', '')
                    ) = mention_name
                LOOP
                    INSERT INTO message_mentions (
                        message_id,
                        mentioned_user_id,
                        channel_id,
                        status
                    )
                    VALUES (
                        NEW.id,
                        admin_record.id,
                        NEW.channel_id,
                        'unread'
                    );
                END LOOP;
            END IF;
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
                            -- Improved matching for complex language names
                            LOWER(TRIM(split_part(lang, '→', 2))) = LOWER(TRIM(language_name))
                            OR LOWER(TRIM(split_part(lang, '→', 1))) = LOWER(TRIM(language_name))
                    )
                )
                SELECT * FROM language_matches
            LOOP
                -- Only create mention if the interpreter isn't the sender
                IF interpreter_record.id != NEW.sender_id THEN
                    INSERT INTO message_mentions (
                        message_id,
                        mentioned_user_id,
                        channel_id,
                        status
                    )
                    VALUES (
                        NEW.id,
                        interpreter_record.id,
                        NEW.channel_id,
                        'unread'
                    );
                END IF;
            END LOOP;
        END;
    END LOOP;

    RETURN NEW;
END;
$$;
