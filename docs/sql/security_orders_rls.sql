-- SECURITY FIX: Lock down orders and order_items updates
-- Run this in Supabase SQL Editor (project: supabase.arxsolutions.cloud)

-- Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Remove the insecure policy that allows anyone to update any order
DROP POLICY IF EXISTS "Enable update for everyone" ON public.orders;

-- Allow admins to view all orders
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Allow admins to update orders (status, tracking, etc.)
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Allow customers to cancel ONLY their own pending orders
DROP POLICY IF EXISTS "Users can cancel own pending orders" ON public.orders;
CREATE POLICY "Users can cancel own pending orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'Pendente')
  WITH CHECK (auth.uid() = user_id AND status = 'Cancelado');

-- Order items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Allow admins to view all order items
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
CREATE POLICY "Admins can view all order items"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));
