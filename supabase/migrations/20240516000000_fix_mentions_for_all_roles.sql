
-- Mise à jour du trigger process_message_mentions pour traiter uniformément les mentions
-- sans distinction inutile entre administrateurs et interprètes
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
    channel_member_record RECORD;
    debug_msg text;
BEGIN
    -- Ajouter des logs pour le débogage
    RAISE LOG 'Processing mentions for message: % in channel: %', NEW.id, NEW.channel_id;
    
    -- Process direct user mentions (@Name LastName)
    FOR mention_name IN 
        SELECT trim((regexp_matches(NEW.content, '@([A-Za-zÀ-ÿ]+\s+[A-Za-zÀ-ÿ]+)', 'g'))[1])
    LOOP
        BEGIN
            RAISE LOG 'Processing mention for: %', mention_name;
            
            -- Approche simplifiée: vérifier d'abord si c'est un membre du canal
            -- Cela couvre à la fois les interprètes et les administrateurs
            FOR channel_member_record IN
                SELECT cm.user_id
                FROM channel_members cm
                WHERE cm.channel_id = NEW.channel_id
                AND cm.user_id != NEW.sender_id
                AND (
                    -- Vérifier les interprètes
                    EXISTS (
                        SELECT 1 FROM interpreter_profiles ip
                        WHERE ip.id = cm.user_id
                        AND LOWER(CONCAT(ip.first_name, ' ', ip.last_name)) = LOWER(mention_name)
                    )
                    OR 
                    -- Vérifier les administrateurs
                    EXISTS (
                        SELECT 1 FROM auth.users au
                        JOIN user_roles ur ON au.id = ur.user_id
                        WHERE au.id = cm.user_id
                        AND ur.role = 'admin'
                        AND LOWER(CONCAT(
                            COALESCE(au.raw_user_meta_data->>'first_name', ''), 
                            ' ', 
                            COALESCE(au.raw_user_meta_data->>'last_name', '')
                        )) = LOWER(mention_name)
                    )
                )
            LOOP
                RAISE LOG 'Found channel member match for mention: % (user_id: %)', mention_name, channel_member_record.user_id;
                
                INSERT INTO message_mentions (
                    message_id,
                    mentioned_user_id,
                    channel_id,
                    status
                )
                VALUES (
                    NEW.id,
                    channel_member_record.user_id,
                    NEW.channel_id,
                    'unread'
                );
                
                RAISE LOG 'Created mention for user: % in message: %', channel_member_record.user_id, NEW.id;
            END LOOP;
            
            -- Si aucune correspondance n'a été trouvée via la méthode simplifiée,
            -- utiliser l'approche traditionnelle pour la rétrocompatibilité
            IF NOT FOUND THEN
                RAISE LOG 'No channel member match, trying traditional approach for: %', mention_name;
                
                -- Recherche traditionnelle dans les profils d'interprètes
                SELECT id INTO mentioned_user_id
                FROM interpreter_profiles
                WHERE LOWER(CONCAT(first_name, ' ', last_name)) = LOWER(mention_name);
                
                IF mentioned_user_id IS NOT NULL THEN
                    RAISE LOG 'Found interpreter match: % (user_id: %)', mention_name, mentioned_user_id;
                    
                    -- Vérifier si l'utilisateur est membre du canal
                    IF EXISTS (
                        SELECT 1 FROM channel_members
                        WHERE channel_id = NEW.channel_id
                        AND user_id = mentioned_user_id
                    ) THEN
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
                        
                        RAISE LOG 'Created mention for interpreter: % in message: %', mentioned_user_id, NEW.id;
                    ELSE
                        RAISE LOG 'Interpreter % is not a member of channel %', mentioned_user_id, NEW.channel_id;
                    END IF;
                ELSE
                    -- Recherche traditionnelle pour les administrateurs
                    FOR admin_record IN
                        SELECT 
                            id
                        FROM auth.users u
                        JOIN user_roles ur ON u.id = ur.user_id
                        WHERE ur.role = 'admin'
                        AND LOWER(CONCAT(
                            COALESCE(raw_user_meta_data->>'first_name', ''), 
                            ' ', 
                            COALESCE(raw_user_meta_data->>'last_name', '')
                        )) = LOWER(mention_name)
                    LOOP
                        RAISE LOG 'Found admin match: % (user_id: %)', mention_name, admin_record.id;
                        
                        -- Vérifier si l'administrateur est membre du canal
                        IF EXISTS (
                            SELECT 1 FROM channel_members
                            WHERE channel_id = NEW.channel_id
                            AND user_id = admin_record.id
                        ) THEN
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
                            
                            RAISE LOG 'Created mention for admin: % in message: %', admin_record.id, NEW.id;
                        ELSE
                            RAISE LOG 'Admin % is not a member of channel %', admin_record.id, NEW.channel_id;
                        END IF;
                    END LOOP;
                END IF;
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
            RAISE LOG 'Processing language mention: %', language_name;
            
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
                    RAISE LOG 'Creating language mention for interpreter: % (language: %)', interpreter_record.id, language_name;
                    
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

-- S'assurer que le déclencheur est correctement attaché à la table chat_messages
DROP TRIGGER IF EXISTS process_message_mentions_trigger ON chat_messages;
CREATE TRIGGER process_message_mentions_trigger
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION process_message_mentions();

-- Journaliser pour confirmer l'installation
RAISE NOTICE 'Le trigger process_message_mentions a été mis à jour pour gérer uniformément les mentions d''administrateurs et d''interprètes';
