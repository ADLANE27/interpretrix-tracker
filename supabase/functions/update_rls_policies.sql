ALTER POLICY "Enable read access for language queries" ON "public"."interpreter_profiles"
USING (
  (auth.role() = 'authenticated'::text) AND 
  (
    id = auth.uid() OR 
    has_role(auth.uid(), 'admin'::user_role) OR
    EXISTS (
      SELECT 1 
      FROM message_mentions mm 
      WHERE mm.mentioned_user_id = interpreter_profiles.id
    )
  )
);