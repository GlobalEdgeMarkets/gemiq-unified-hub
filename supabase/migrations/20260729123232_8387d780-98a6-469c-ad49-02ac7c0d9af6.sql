CREATE TABLE public.assessment_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE SET NULL,
  email text NOT NULL,
  stripe_session_id text UNIQUE,
  stripe_payment_intent_id text,
  amount_total integer,
  currency text,
  lookup_key text,
  consumed_at timestamptz,
  consumed_submission_id uuid,
  consumed_assessment_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX assessment_credits_user_idx ON public.assessment_credits (user_id) WHERE consumed_at IS NULL;
CREATE INDEX assessment_credits_email_idx ON public.assessment_credits (lower(email)) WHERE consumed_at IS NULL;

GRANT SELECT ON public.assessment_credits TO authenticated;
GRANT ALL ON public.assessment_credits TO service_role;

ALTER TABLE public.assessment_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own assessment credits"
  ON public.assessment_credits FOR SELECT TO authenticated
  USING (auth.uid() = user_id);