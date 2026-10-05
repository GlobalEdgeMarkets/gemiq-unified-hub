CREATE TABLE public.hub_e2e_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_key TEXT NOT NULL,
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'quick',
  status TEXT NOT NULL DEFAULT 'started',
  checks JSONB NOT NULL DEFAULT '[]'::jsonb,
  user_id UUID,
  submission_id UUID,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  cleaned_at TIMESTAMPTZ
);
GRANT ALL ON public.hub_e2e_runs TO service_role;
ALTER TABLE public.hub_e2e_runs ENABLE ROW LEVEL SECURITY;
CREATE INDEX hub_e2e_runs_key_idx ON public.hub_e2e_runs(assessment_key, started_at DESC);
CREATE INDEX hub_e2e_runs_email_idx ON public.hub_e2e_runs(lower(email));

CREATE TABLE public.hub_e2e_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  enabled BOOLEAN NOT NULL DEFAULT true,
  base_email TEXT NOT NULL DEFAULT 'alexr@social2b.com',
  keep_days INT NOT NULL DEFAULT 7,
  assessments TEXT[] NOT NULL DEFAULT '{}',
  workflows JSONB NOT NULL DEFAULT '[
    {"name":"GEM.IQ - Set marketing contact","when":"always"},
    {"name":"GEM.IQ - Day 2 tier advice","when":"always"},
    {"name":"GEM.IQ - Day 90 retake","when":"always"},
    {"name":"GEM.IQ - Day 5 trial unlock","when":"trial"}
  ]'::jsonb,
  last_cleanup_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);
GRANT ALL ON public.hub_e2e_settings TO service_role;
ALTER TABLE public.hub_e2e_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.hub_e2e_settings (id) VALUES ('global') ON CONFLICT DO NOTHING;