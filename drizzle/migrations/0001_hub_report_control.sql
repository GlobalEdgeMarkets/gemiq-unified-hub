CREATE TABLE public.hub_report_settings (
  scope TEXT PRIMARY KEY,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.hub_report_settings TO service_role;
ALTER TABLE public.hub_report_settings ENABLE ROW LEVEL SECURITY;
-- No client policies: read and written only by Hub server code.
INSERT INTO public.hub_report_settings (scope, settings) VALUES ('global', '{}'::jsonb) ON CONFLICT DO NOTHING;

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS report_unlocked_override BOOLEAN,
  ADD COLUMN IF NOT EXISTS report_hidden BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS report_content JSONB,
  ADD COLUMN IF NOT EXISTS report_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_actions JSONB NOT NULL DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS submissions_submitted_at_idx ON public.submissions(submitted_at DESC);