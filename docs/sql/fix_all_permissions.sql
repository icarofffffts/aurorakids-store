-- ==============================================================================
-- FIX TOTAL DE PERMISSÕES (RLS) - DELU KIDS STORE
-- Execute este script no SQL Editor do Supabase para garantir que tudo funcione correctly.
-- ==============================================================================

-- 1. PRODUTOS (Publico pode ver, Admin pode editar)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public View Products" ON products;
CREATE POLICY "Public View Products" ON products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin Manage Products" ON products;
CREATE POLICY "Admin Manage Products" ON products FOR ALL USING (auth.role() = 'authenticated'); 
-- (Nota: Para facilitar, qualquer usuário logado pode gerenciar produtos neste demo. 
-- Em produção, checaríamos emails especificos ou claims de admin)

-- 2. LOJA (Configurações)
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public View Settings" ON store_settings;
CREATE POLICY "Public View Settings" ON store_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin Manage Settings" ON store_settings;
CREATE POLICY "Admin Manage Settings" ON store_settings FOR ALL USING (auth.role() = 'authenticated');

-- 3. PERFIS (Usuários) - Cada um cuida do seu
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users View Own Profile" ON profiles;
CREATE POLICY "Users View Own Profile" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users Update Own Profile" ON profiles;
CREATE POLICY "Users Update Own Profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users Insert Own Profile" ON profiles;
CREATE POLICY "Users Insert Own Profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. PEDIDOS (Orders) - Criar e Ver os seus
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth Users Create Orders" ON orders;
CREATE POLICY "Auth Users Create Orders" ON orders FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users View Own Orders" ON orders;
CREATE POLICY "Users View Own Orders" ON orders FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL); 
-- (Nota: OR user_id IS NULL permite ver pedidos feitos sem login se o front vincular por cookie, mas o foco aqui é o Auth)

-- Permite Admin ver todos os pedidos
DROP POLICY IF EXISTS "Admin View All Orders" ON orders;
CREATE POLICY "Admin View All Orders" ON orders FOR SELECT USING (auth.role() = 'authenticated');
-- (Simplificado: Authenticated vê tudo. Refine se quiser privacidade estrita entre clientes)

DROP POLICY IF EXISTS "Admin Update Orders" ON orders;
CREATE POLICY "Admin Update Orders" ON orders FOR UPDATE USING (auth.role() = 'authenticated');

-- 5. ITENS DO PEDIDO
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Create Order Items" ON order_items;
CREATE POLICY "Public Create Order Items" ON order_items FOR INSERT WITH CHECK (true);
-- (Itens podem ser inseridos livremente se tiverem vinculados a uma Order válida)

DROP POLICY IF EXISTS "View Order Items" ON order_items;
CREATE POLICY "View Order Items" ON order_items FOR SELECT USING (true);


-- 6. CUPONS (Marketing)
CREATE TABLE IF NOT EXISTS coupons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC NOT NULL,
    active BOOLEAN DEFAULT true,
    used_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin Manage Coupons" ON coupons;
CREATE POLICY "Admin Manage Coupons" ON coupons FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public View Coupons" ON coupons;
CREATE POLICY "Public View Coupons" ON coupons FOR SELECT USING (true);


-- 7. STORAGE (Imagens)
-- Garante que o bucket 'products' é publico
INSERT INTO storage.buckets (id, name, public) 
VALUES ('products', 'products', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Access Product Images" ON storage.objects;
CREATE POLICY "Public Access Product Images" ON storage.objects FOR SELECT USING (bucket_id = 'products');

DROP POLICY IF EXISTS "Admin Upload Images" ON storage.objects;
CREATE POLICY "Admin Upload Images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');

-- FIM DO SCRIPT
