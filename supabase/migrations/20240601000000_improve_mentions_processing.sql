
-- Update the process_message_mentions function to better handle admin mentions
CREATE OR REPLACE FUNCTION public.process_message_mentions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    mention_name text;
    mentioned_user_id uuid;
    language_name text;
    interpreter_record RECORD;
    admin_record RECORD;
    debug_msg text;
BEGIN
    -- Log that the function is processing mentions for debugging
    RAISE NOTICE 'Processing mentions for message: % in channel: %', NEW.id, NEW.channel_id;

    -- Process direct user mentions (@Name LastName)
    FOR mention_name IN 
        SELECT trim((regexp_matches(NEW.content, '@([A-Za-zÀ-ÿ]+\s+[A-Za-zÀ-ÿ]+)', 'g'))[1])
    LOOP
        BEGIN
            RAISE NOTICE 'Processing mention for user: %', mention_name;
            
            -- Find mentioned interpreter with case-insensitive matching
            SELECT id INTO mentioned_user_id
            FROM interpreter_profiles
            WHERE LOWER(CONCAT(first_name, ' ', last_name)) = LOWER(mention_name);
            
            -- If found an interpreter, insert the mention
            IF mentioned_user_id IS NOT NULL THEN
                RAISE NOTICE 'Found interpreter to mention: %', mentioned_user_id;
                
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
                
                RAISE NOTICE 'Created mention for interpreter: %', mentioned_user_id;
            ELSE
                -- If not found in interpreter profiles, check admin users with case-insensitive matching
                RAISE NOTICE 'No interpreter found, checking admins for: %', mention_name;
                
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
                    AND LOWER(CONCAT(
                        COALESCE(raw_user_meta_data->>'first_name', ''), 
                        ' ', 
                        COALESCE(raw_user_meta_data->>'last_name', '')
                    )) = LOWER(mention_name)
                LOOP
                    RAISE NOTICE 'Found admin to mention: % (Name: %)', admin_record.id, admin_record.full_name;
                    
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
                    
                    RAISE NOTICE 'Created mention for admin: %', admin_record.id;
                END LOOP;
            END IF;
        EXCEPTION WHEN others THEN
            GET STACKED DIAGNOSTICS debug_msg = PG_EXCEPTION_DETAIL;
            RAISE WARNING 'Error processing mention % : % (Detail: %)', mention_name, SQLERRM, debug_msg;
        END;
    END LOOP;

    -- Process language mentions with updated pattern to handle complex language names
    FOR language_name IN
        SELECT trim((regexp_matches(NEW.content, '@([A-Za-zÀ-ÿ\s]+(?:\s*\([^)]*\))?)', 'g'))[1])
    LOOP
        BEGIN
            RAISE NOTICE 'Processing language mention: %', language_name;
            
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
                    RAISE NOTICE 'Creating language mention for interpreter: %', interpreter_record.id;
                    
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
        EXCEPTION WHEN others THEN
            GET STACKED DIAGNOSTICS debug_msg = PG_EXCEPTION_DETAIL;
            RAISE WARNING 'Error processing language mention % : % (Detail: %)', language_name, SQLERRM, debug_msg;
        END;
    END LOOP;

    RETURN NEW;
END;
$$;
