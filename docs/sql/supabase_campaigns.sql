-- Campaign popups for homepage
-- Run in Supabase SQL Editor

-- Needed for gen_random_uuid() on some installs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  image_url text,
  badge text,
  cta_text text,
  cta_url text,
  show_on_home boolean NOT NULL DEFAULT true,
  show_once boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Allow server-side admin API (service_role key) to manage campaigns.
-- This keeps public storefront read-only while enabling writes via backend.
DROP POLICY IF EXISTS "Service role manage campaigns" ON public.campaigns;
CREATE POLICY "Service role manage campaigns"
  ON public.campaigns
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Public can read active campaigns" ON public.campaigns;
CREATE POLICY "Public can read active campaigns"
  ON public.campaigns
  FOR SELECT
  USING (
    active = true
    AND show_on_home = true
    AND starts_at <= now()
    AND (ends_at IS NULL OR ends_at >= now())
  );
