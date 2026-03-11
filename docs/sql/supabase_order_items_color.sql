-- Order items: add color field (run in Supabase SQL Editor)

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS color text;
