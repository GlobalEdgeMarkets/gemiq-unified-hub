CREATE TABLE public.hub_iq_apps (
  key text PRIMARY KEY CHECK (key ~ '^[a-z0-9]{2,32}$'),
  name text NOT NULL,
  site_url text NOT NULL,
  track text NOT NULL DEFAULT 'capability' CHECK (track IN ('capability','specialist')),
  description text,
  purge_url text,
  status_url text,
  lifecycle text NOT NULL DEFAULT 'onboarding' CHECK (lifecycle IN ('onboarding','live','retired')),
  paused boolean NOT NULL DEFAULT false,
  notice text,
  notice_level text NOT NULL DEFAULT 'info' CHECK (notice_level IN ('info','warning','critical')),
  onboarding_checks jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_status jsonb,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);
GRANT ALL ON public.hub_iq_apps TO service_role;
ALTER TABLE public.hub_iq_apps ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.hub_global_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  notice text,
  notice_level text NOT NULL DEFAULT 'info' CHECK (notice_level IN ('info','warning','critical')),
  checkout_cta text,
  guarantee_line text,
  trial_line text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);
GRANT ALL ON public.hub_global_settings TO service_role;
ALTER TABLE public.hub_global_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.hub_global_settings (id) VALUES (true);

INSERT INTO public.hub_iq_apps (key, name, site_url, track, purge_url, status_url, lifecycle) VALUES
 ('gtmiq','GTMIQ','https://gtmiq.globaledgemarkets.com','capability','https://gtmiq.globaledgemarkets.com/api/public/purge-user','https://gtmiq.globaledgemarkets.com/api/public/hub-status','live'),
 ('salesiq','SalesIQ','https://salesiq.globaledgemarkets.com','capability','https://salesiq.globaledgemarkets.com/api/public/purge-user','https://salesiq.globaledgemarkets.com/api/public/hub-status','live'),
 ('productiq','ProductIQ','https://productiq.globaledgemarkets.com','capability','https://productiq.globaledgemarkets.com/api/public/purge-user','https://productiq.globaledgemarkets.com/api/public/hub-status','live'),
 ('aitransformiq','AITransformIQ','https://aitransformiq.globaledgemarkets.com','capability','https://aitransformiq.globaledgemarkets.com/api/public/purge-user','https://aitransformiq.globaledgemarkets.com/api/public/hub-status','live'),
 ('uxiq','UXIQ','https://uxreadiness.globaledgemarkets.com','capability','https://dbekvgmuufqbzdahkplw.supabase.co/functions/v1/purge-user','https://dbekvgmuufqbzdahkplw.supabase.co/functions/v1/hub-status','live'),
 ('tariffiq','TariffIQ','https://tariffiq.globaledgemarkets.com','specialist','https://pltvcqnknmukgpsipmec.supabase.co/functions/v1/purge-user','https://pltvcqnknmukgpsipmec.supabase.co/functions/v1/hub-status','live');