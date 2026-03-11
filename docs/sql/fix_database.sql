-- FIX SCRIPT --
-- Run this ENTIRE script in the Supabase SQL Editor

-- 1. Ensure 'user_id' exists in 'orders' table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='user_id') THEN
        ALTER TABLE public.orders ADD COLUMN user_id uuid references auth.users(id);
    END IF;
END $$;

-- 2. Ensure Payment Columns exist in 'store_settings'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='pix_key') THEN
        ALTER TABLE public.store_settings ADD COLUMN pix_key text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='pix_owner_name') THEN
        ALTER TABLE public.store_settings ADD COLUMN pix_owner_name text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='pix_owner_city') THEN
        ALTER TABLE public.store_settings ADD COLUMN pix_owner_city text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='fixed_shipping_price') THEN
        ALTER TABLE public.store_settings ADD COLUMN fixed_shipping_price numeric default 15.00;
    END IF;
END $$;

-- 3. Fix RLS Policies (Correcting Syntax errors)

-- Enable RLS just in case
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Orders Policies
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
CREATE POLICY "Users can insert own orders"
  ON orders FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Enable update for everyone" ON orders;
CREATE POLICY "Enable update for everyone"
  ON orders FOR UPDATE
  USING ( true );

-- Order Items Policies
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  USING ( EXISTS ( SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid() ) );

DROP POLICY IF EXISTS "Users can insert own order items" ON order_items;
CREATE POLICY "Users can insert own order items"
  ON order_items FOR INSERT
  WITH CHECK ( EXISTS ( SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid() ) );
