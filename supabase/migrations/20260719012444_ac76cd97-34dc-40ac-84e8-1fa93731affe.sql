
-- Retry queue: add explicit deny policy so authenticated/anon roles cannot access (service_role bypasses RLS)
REVOKE ALL ON public.retry_queue FROM anon, authenticated;

CREATE POLICY "no client access to retry_queue"
ON public.retry_queue
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- Submissions: tighten insert policy to require ownership binding
DROP POLICY IF EXISTS "own submissions insert" ON public.submissions;

CREATE POLICY "own submissions insert"
ON public.submissions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
