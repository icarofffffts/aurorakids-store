-- Campaign events (views/clicks) for marketing dashboard (run in Supabase SQL Editor)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.campaign_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('view', 'click')),
  user_id uuid REFERENCES auth.users(id),
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_events_campaign_id_idx ON public.campaign_events(campaign_id);
CREATE INDEX IF NOT EXISTS campaign_events_created_at_idx ON public.campaign_events(created_at);
CREATE INDEX IF NOT EXISTS campaign_events_event_type_idx ON public.campaign_events(event_type);

ALTER TABLE public.campaign_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manage campaign events" ON public.campaign_events;
CREATE POLICY "Service role manage campaign events"
  ON public.campaign_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
