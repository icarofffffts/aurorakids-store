-- Orders: coupon + totals breakdown fields (run in Supabase SQL Editor)

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal numeric;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_id uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_redeemed_at timestamptz;

-- Best-effort backfill for existing rows
UPDATE public.orders
SET subtotal = total
WHERE subtotal IS NULL;

-- Indexes for lookups
CREATE INDEX IF NOT EXISTS orders_coupon_code_idx ON public.orders(coupon_code);
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS orders_coupon_redeemed_at_idx ON public.orders(coupon_redeemed_at);
