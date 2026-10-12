CREATE TABLE public.hub_messaging_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version integer NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  body jsonb NOT NULL,
  note text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
CREATE UNIQUE INDEX hub_messaging_one_draft ON public.hub_messaging_versions ((status)) WHERE status = 'draft';
CREATE UNIQUE INDEX hub_messaging_one_published ON public.hub_messaging_versions ((status)) WHERE status = 'published';
GRANT ALL ON public.hub_messaging_versions TO service_role;
ALTER TABLE public.hub_messaging_versions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.hub_messaging_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  publish_hooks jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_hook_results jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);
GRANT ALL ON public.hub_messaging_settings TO service_role;
ALTER TABLE public.hub_messaging_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.hub_messaging_settings (id) VALUES (true) ON CONFLICT DO NOTHING;