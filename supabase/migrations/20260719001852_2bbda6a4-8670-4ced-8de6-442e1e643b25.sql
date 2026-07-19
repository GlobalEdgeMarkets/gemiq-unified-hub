
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Stable production URL for this hub (project-scoped, immutable across renames)
-- project--{project-id}.lovable.app
DO $$
DECLARE existing_id BIGINT;
BEGIN
  SELECT jobid INTO existing_id FROM cron.job WHERE jobname = 'gemiq_hubspot_retry_worker';
  IF existing_id IS NOT NULL THEN PERFORM cron.unschedule(existing_id); END IF;
END $$;

SELECT cron.schedule(
  'gemiq_hubspot_retry_worker',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--d4b3f62b-5101-4b21-a476-4e0635e07df6.lovable.app/api/public/jobs/retry-hubspot',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-job-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'JOB_SECRET' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
