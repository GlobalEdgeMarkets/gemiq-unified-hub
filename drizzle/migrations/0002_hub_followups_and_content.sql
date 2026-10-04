CREATE TABLE public.hub_followup_rules (
  scope TEXT PRIMARY KEY,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.hub_followup_rules TO service_role;
ALTER TABLE public.hub_followup_rules ENABLE ROW LEVEL SECURITY;
INSERT INTO public.hub_followup_rules (scope) VALUES ('global') ON CONFLICT DO NOTHING;

CREATE TABLE public.hub_followup_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  assessment_key TEXT NOT NULL,
  step TEXT NOT NULL,
  send_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (submission_id, step)
);
GRANT ALL ON public.hub_followup_queue TO service_role;
ALTER TABLE public.hub_followup_queue ENABLE ROW LEVEL SECURITY;
CREATE INDEX hub_followup_queue_due_idx ON public.hub_followup_queue(status, send_at);
CREATE INDEX hub_followup_queue_email_idx ON public.hub_followup_queue(lower(email));

CREATE TABLE public.email_unsubscribes (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.email_unsubscribes TO service_role;
ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.hub_iq_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_key TEXT NOT NULL,
  version INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  body JSONB NOT NULL,
  note TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  UNIQUE (assessment_key, version)
);
GRANT ALL ON public.hub_iq_content TO service_role;
ALTER TABLE public.hub_iq_content ENABLE ROW LEVEL SECURITY;
CREATE INDEX hub_iq_content_key_idx ON public.hub_iq_content(assessment_key, status);

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS content_version INT,
  ADD COLUMN IF NOT EXISTS score_check JSONB;