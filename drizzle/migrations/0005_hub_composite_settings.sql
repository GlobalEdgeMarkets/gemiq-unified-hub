CREATE TABLE public.hub_composite_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  methodology jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);
GRANT SELECT ON public.hub_composite_settings TO anon, authenticated;
GRANT ALL ON public.hub_composite_settings TO service_role;
ALTER TABLE public.hub_composite_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Composite settings are public to read" ON public.hub_composite_settings FOR SELECT TO anon, authenticated USING (true);
INSERT INTO public.hub_composite_settings (id) VALUES (true) ON CONFLICT DO NOTHING;