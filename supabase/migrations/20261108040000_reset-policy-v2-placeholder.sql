-- Turn policy v2 back into an empty placeholder so it can be uploaded again from the app
-- (the "fill policy placeholder" policy allows filling an empty row exactly once).
-- Only v2 is touched; v1 and any other version keep their text.
UPDATE public.policies SET content = '', file_name = NULL WHERE version = 'v2';
