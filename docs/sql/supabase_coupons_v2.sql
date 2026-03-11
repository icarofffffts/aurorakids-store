-- Coupons v2: rules + redemptions (run in Supabase SQL Editor)

-- Needed for gen_random_uuid() on some installs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Base table (if missing)
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric NOT NULL,
  active boolean NOT NULL DEFAULT true,
  used_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Rules / metadata
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS starts_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS ends_at timestamptz;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS min_subtotal numeric NOT NULL DEFAULT 0;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS max_uses integer;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS max_uses_per_user integer;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS eligible_categories text[];
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS eligible_product_ids bigint[];
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Public can only read active coupons (needed for validation by code)
DROP POLICY IF EXISTS "Public can read active coupons" ON public.coupons;
CREATE POLICY "Public can read active coupons"
  ON public.coupons
  FOR SELECT
  USING (
    active = true
    AND starts_at <= now()
    AND (ends_at IS NULL OR ends_at >= now())
  );

-- Server-side API (service_role) can manage coupons.
DROP POLICY IF EXISTS "Service role manage coupons" ON public.coupons;
CREATE POLICY "Service role manage coupons"
  ON public.coupons
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Redemptions (counts paid uses; supports per-user limits)
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid REFERENCES public.coupons(id) ON DELETE CASCADE,
  coupon_code text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS coupon_redemptions_order_id_uniq ON public.coupon_redemptions(order_id);
CREATE INDEX IF NOT EXISTS coupon_redemptions_coupon_id_idx ON public.coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS coupon_redemptions_user_id_idx ON public.coupon_redemptions(user_id);
CREATE INDEX IF NOT EXISTS coupon_redemptions_created_at_idx ON public.coupon_redemptions(created_at);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manage coupon redemptions" ON public.coupon_redemptions;
CREATE POLICY "Service role manage coupon redemptions"
  ON public.coupon_redemptions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
