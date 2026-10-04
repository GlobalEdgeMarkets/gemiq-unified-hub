DELETE FROM public.hub_followup_queue;
DELETE FROM public.hub_followup_rules;
DELETE FROM public.email_unsubscribes;
COMMENT ON TABLE public.hub_followup_queue IS 'DEPRECATED: follow-up emails moved to HubSpot workflows; drop after publish';
COMMENT ON TABLE public.hub_followup_rules IS 'DEPRECATED: follow-up emails moved to HubSpot workflows; drop after publish';
COMMENT ON TABLE public.email_unsubscribes IS 'DEPRECATED: unsubscribes handled by HubSpot; drop after publish';