-- Orders: shipping details (carrier, service, link, timestamp)
-- Run in Supabase SQL Editor

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS carrier_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS carrier_service text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_url text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipped_at timestamptz;

CREATE INDEX IF NOT EXISTS orders_tracking_code_idx ON public.orders(tracking_code);
CREATE INDEX IF NOT EXISTS orders_shipped_at_idx ON public.orders(shipped_at);
