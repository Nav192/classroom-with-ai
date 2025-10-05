DROP FUNCTION IF EXISTS public.search_general_definitions(vector(1536));
CREATE OR REPLACE FUNCTION public.search_general_definitions(
    query_embedding vector(768)
)
RETURNS TABLE (
    term text,
    definition text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        gd.term,
        gd.definition,
        (gd.embedding <-> query_embedding) AS similarity
    FROM
        public.general_definitions gd
    ORDER BY
        similarity ASC
    LIMIT 5;
END;
$$;