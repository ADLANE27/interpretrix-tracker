
-- Create an improved process_message_mentions function that handles all mention formats
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
    admin_mention text;
    debug_msg text;
BEGIN
    -- Log the message content for debugging
    RAISE NOTICE 'Processing mentions for message: %', NEW.content;

    -- First handle the explicit admin mentions format (@admin:Name LastName)
    FOR admin_mention IN 
        SELECT trim((regexp_matches(NEW.content, '@admin:([A-Za-zÀ-ÿ]+\s+[A-Za-zÀ-ÿ]+)', 'g'))[1])
    LOOP
        BEGIN
            RAISE NOTICE 'Found admin mention with prefix: %', admin_mention;
            
            -- Search for admin with matching name
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
                )) = LOWER(admin_mention)
            LOOP
                RAISE NOTICE 'Creating mention for admin (explicit format): % with ID: %', admin_record.full_name, admin_record.id;
                
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
                
                RAISE NOTICE 'Successfully inserted mention for admin (explicit format): %', admin_record.id;
            END LOOP;
        EXCEPTION WHEN others THEN
            GET STACKED DIAGNOSTICS debug_msg = PG_EXCEPTION_DETAIL;
            RAISE WARNING 'Error processing admin mention % : % (Detail: %)', admin_mention, SQLERRM, debug_msg;
        END;
    END LOOP;

    -- Then handle the standard mention format (@Name LastName)
    FOR mention_name IN 
        SELECT trim((regexp_matches(NEW.content, '@([A-Za-zÀ-ÿ]+\s+[A-Za-zÀ-ÿ]+)(?!:)', 'g'))[1])
    LOOP
        BEGIN
            RAISE NOTICE 'Processing standard mention format: %', mention_name;
            
            -- First check for an interpreter with this name
            SELECT id INTO mentioned_user_id
            FROM interpreter_profiles
            WHERE LOWER(CONCAT(first_name, ' ', last_name)) = LOWER(mention_name);
            
            -- If found an interpreter, insert the mention
            IF mentioned_user_id IS NOT NULL THEN
                RAISE NOTICE 'Found interpreter for standard mention: % with ID: %', mention_name, mentioned_user_id;
                
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
                
                RAISE NOTICE 'Successfully inserted mention for interpreter: %', mentioned_user_id;
            ELSE
                -- If not found in interpreter profiles, check admin users
                -- This is for backward compatibility with the old format
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
                    RAISE NOTICE 'Found admin for standard mention: % with ID: %', admin_record.full_name, admin_record.id;
                    
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
                    
                    RAISE NOTICE 'Successfully inserted mention for admin (standard format): %', admin_record.id;
                END LOOP;
            END IF;
        EXCEPTION WHEN others THEN
            GET STACKED DIAGNOSTICS debug_msg = PG_EXCEPTION_DETAIL;
            RAISE WARNING 'Error processing standard mention % : % (Detail: %)', mention_name, SQLERRM, debug_msg;
        END;
    END LOOP;

    -- Process language mentions
    FOR language_name IN
        SELECT trim((regexp_matches(NEW.content, '@([A-Za-zÀ-ÿ\s]+(?:\s*\([^)]*\))?)', 'g'))[1])
    LOOP
        BEGIN
            RAISE NOTICE 'Processing language mention: %', language_name;
            
            -- Skip if this matches a name pattern or is an admin mention
            IF language_name ~ '^[A-Za-zÀ-ÿ]+\s+[A-Za-zÀ-ÿ]+$' OR language_name ~ '^admin:.*' THEN
                RAISE NOTICE 'Skipping language processing for potential name or admin mention: %', language_name;
                CONTINUE;
            END IF;
            
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
                    RAISE NOTICE 'Creating language mention for interpreter: % for language: %', interpreter_record.id, language_name;
                    
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
                    
                    RAISE NOTICE 'Successfully inserted language mention for interpreter: %', interpreter_record.id;
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
