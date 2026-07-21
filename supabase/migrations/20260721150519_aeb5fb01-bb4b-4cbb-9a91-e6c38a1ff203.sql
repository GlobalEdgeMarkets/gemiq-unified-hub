UPDATE public.retry_queue
SET payload = jsonb_set(
      jsonb_set(payload, '{properties,gem_score_tier}', to_jsonb(lower(payload->'properties'->>'gem_score_tier'))),
      '{properties,gem_tariff_tier}', to_jsonb(lower(payload->'properties'->>'gem_tariff_tier'))
    ),
    next_attempt_at = now(),
    attempts = 0
WHERE job_type='hubspot_upsert'
  AND status='pending'
  AND payload->'properties' ? 'gem_score_tier';