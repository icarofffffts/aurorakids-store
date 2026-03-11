-- =====================================================
-- SISTEMA DE AVALIACOES - DeLu Kids
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- 1. Tabela de avaliacoes
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    
    -- Dados do cliente (cached para exibicao mesmo se perfil for deletado)
    customer_name TEXT NOT NULL,
    customer_avatar_url TEXT,
    
    -- Avaliacao
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    comment TEXT NOT NULL,
    
    -- Produto comprado (cached)
    product_name TEXT,
    product_image TEXT,
    
    -- Moderacao
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    is_featured BOOLEAN DEFAULT FALSE,
    admin_notes TEXT,
    
    -- Resposta da loja
    store_reply TEXT,
    store_reply_at TIMESTAMPTZ,
    
    -- Token para avaliacao via link (sem login)
    review_token UUID UNIQUE DEFAULT gen_random_uuid(),
    token_used_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indices para performance
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_featured ON reviews(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_reviews_token ON reviews(review_token);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- 3. Funcao para atualizar updated_at
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reviews_updated_at ON reviews;
CREATE TRIGGER trigger_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_reviews_updated_at();

-- 4. View para estatisticas agregadas por produto
CREATE OR REPLACE VIEW product_review_stats AS
SELECT 
    product_id,
    COUNT(*) as total_reviews,
    ROUND(AVG(rating)::numeric, 1) as avg_rating,
    COUNT(*) FILTER (WHERE rating = 5) as five_star,
    COUNT(*) FILTER (WHERE rating = 4) as four_star,
    COUNT(*) FILTER (WHERE rating = 3) as three_star,
    COUNT(*) FILTER (WHERE rating = 2) as two_star,
    COUNT(*) FILTER (WHERE rating = 1) as one_star
FROM reviews
WHERE status = 'approved'
GROUP BY product_id;

-- 5. View para estatisticas gerais da loja
CREATE OR REPLACE VIEW store_review_stats AS
SELECT 
    COUNT(*) as total_reviews,
    ROUND(AVG(rating)::numeric, 2) as avg_rating,
    COUNT(*) FILTER (WHERE rating >= 4) as positive_reviews,
    COUNT(*) FILTER (WHERE rating <= 2) as negative_reviews
FROM reviews
WHERE status = 'approved';

-- 6. RLS Policies
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Todos podem ver avaliacoes aprovadas
DROP POLICY IF EXISTS "reviews_select_approved" ON reviews;
CREATE POLICY "reviews_select_approved" ON reviews
    FOR SELECT USING (status = 'approved');

-- Usuarios podem ver suas proprias avaliacoes (qualquer status)
DROP POLICY IF EXISTS "reviews_select_own" ON reviews;
CREATE POLICY "reviews_select_own" ON reviews
    FOR SELECT USING (auth.uid() = user_id);

-- Usuarios podem criar avaliacoes para seus proprios pedidos
DROP POLICY IF EXISTS "reviews_insert_own" ON reviews;
CREATE POLICY "reviews_insert_own" ON reviews
    FOR INSERT WITH CHECK (
        auth.uid() = user_id 
        AND EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_id 
            AND orders.user_id = auth.uid()
            AND orders.status = 'Entregue'
        )
    );

-- Usuarios podem atualizar suas proprias avaliacoes pendentes
DROP POLICY IF EXISTS "reviews_update_own" ON reviews;
CREATE POLICY "reviews_update_own" ON reviews
    FOR UPDATE USING (
        auth.uid() = user_id 
        AND status = 'pending'
    );

-- 7. Grants para acesso anonimo (leitura de aprovados)
GRANT SELECT ON reviews TO anon;
GRANT SELECT ON product_review_stats TO anon;
GRANT SELECT ON store_review_stats TO anon;

-- Grants para usuarios autenticados
GRANT SELECT, INSERT, UPDATE ON reviews TO authenticated;
GRANT SELECT ON product_review_stats TO authenticated;
GRANT SELECT ON store_review_stats TO authenticated;

-- 8. Tabela para tokens de avaliacao (pedidos entregues)
-- Permite avaliacao sem login via link unico
CREATE TABLE IF NOT EXISTS review_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    token UUID UNIQUE DEFAULT gen_random_uuid(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_tokens_token ON review_tokens(token);
CREATE INDEX IF NOT EXISTS idx_review_tokens_order_id ON review_tokens(order_id);

-- RLS para review_tokens
ALTER TABLE review_tokens ENABLE ROW LEVEL SECURITY;

-- Apenas leitura via token (sem autenticacao)
DROP POLICY IF EXISTS "review_tokens_select_by_token" ON review_tokens;
CREATE POLICY "review_tokens_select_by_token" ON review_tokens
    FOR SELECT USING (TRUE);

GRANT SELECT ON review_tokens TO anon;
GRANT SELECT, INSERT, UPDATE ON review_tokens TO authenticated;

-- 9. Adicionar coluna review_requested em orders (se nao existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'review_requested_at'
    ) THEN
        ALTER TABLE orders ADD COLUMN review_requested_at TIMESTAMPTZ;
    END IF;
END $$;

-- 10. Funcao para gerar token de avaliacao quando pedido for entregue
CREATE OR REPLACE FUNCTION generate_review_token_on_delivery()
RETURNS TRIGGER AS $$
BEGIN
    -- Apenas quando status muda para 'Entregue'
    IF NEW.status = 'Entregue' AND (OLD.status IS NULL OR OLD.status != 'Entregue') THEN
        INSERT INTO review_tokens (order_id)
        VALUES (NEW.id)
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_generate_review_token ON orders;
CREATE TRIGGER trigger_generate_review_token
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION generate_review_token_on_delivery();

COMMIT;
