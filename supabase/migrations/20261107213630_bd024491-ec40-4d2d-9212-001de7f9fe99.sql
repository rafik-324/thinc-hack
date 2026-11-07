CREATE TABLE public.policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE CHECK (length(trim(version)) BETWEEN 1 AND 40),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 200),
  file_name text,
  content text NOT NULL DEFAULT '' CHECK (length(content) <= 2000000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.policies TO anon, authenticated;
GRANT ALL ON public.policies TO service_role;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read policies" ON public.policies FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "upload policies" ON public.policies FOR INSERT TO anon, authenticated WITH CHECK (true);
INSERT INTO public.policies (version, name, created_at) VALUES
  ('v1', 'Policy v1', now() - interval '1 day'),
  ('v2', 'Policy v2', now());