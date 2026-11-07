-- Seeded policy rows (v1, v2) start with empty content. The upload may fill such a
-- placeholder exactly once; a row that already has text stays immutable.
GRANT UPDATE (name, file_name, content) ON public.policies TO anon, authenticated;
DROP POLICY IF EXISTS "fill policy placeholder" ON public.policies;
CREATE POLICY "fill policy placeholder" ON public.policies FOR UPDATE TO anon, authenticated
  USING (content = '')
  WITH CHECK (length(trim(content)) > 0);