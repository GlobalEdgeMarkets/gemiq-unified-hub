DROP POLICY IF EXISTS "Composite settings are public to read" ON public.hub_composite_settings;
REVOKE SELECT ON public.hub_composite_settings FROM anon, authenticated;