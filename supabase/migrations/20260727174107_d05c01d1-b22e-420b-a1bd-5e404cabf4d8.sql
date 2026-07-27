UPDATE public.submissions SET tier = 'advanced' WHERE tier = 'proficient';
UPDATE public.submissions SET tier = lower(tier) WHERE tier IS NOT NULL AND tier <> lower(tier);