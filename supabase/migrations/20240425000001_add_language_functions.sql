
-- Function to get all unique source languages from interpreter profiles
CREATE OR REPLACE FUNCTION public.get_all_source_languages()
RETURNS TABLE(source_language text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH language_pairs AS (
        -- Get all languages from interpreter profiles
        SELECT DISTINCT unnest(languages) as lang_pair
        FROM interpreter_profiles
    )
    SELECT DISTINCT trim(split_part(lang_pair, '→', 1)) as source_language
    FROM language_pairs
    WHERE lang_pair LIKE '%→%'
    ORDER BY source_language;
END;
$$;

-- Function to get all unique target languages from interpreter profiles
CREATE OR REPLACE FUNCTION public.get_all_target_languages()
RETURNS TABLE(target_language text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH language_pairs AS (
        -- Get all languages from interpreter profiles
        SELECT DISTINCT unnest(languages) as lang_pair
        FROM interpreter_profiles
    )
    SELECT DISTINCT trim(split_part(lang_pair, '→', 2)) as target_language
    FROM language_pairs
    WHERE lang_pair LIKE '%→%'
    ORDER BY target_language;
END;
$$;
