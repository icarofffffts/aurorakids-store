-- =====================================================
-- SISTEMA DE BANNERS DE CAMPANHA - DeLu Kids
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- Needed for gen_random_uuid() on some installs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Tabela de banners de campanha
CREATE TABLE IF NOT EXISTS campaign_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Conteudo do banner
    title TEXT NOT NULL,
    subtitle TEXT,
    button_label TEXT,
    button_url TEXT,
    image_url TEXT,
    
    -- Cores personalizaveis (hex)
    bg_color TEXT DEFAULT '#1e293b',
    text_color TEXT DEFAULT '#ffffff',
    button_color TEXT DEFAULT '#ffffff',
    button_text_color TEXT DEFAULT '#1e293b',
    
    -- Posicao do banner
    position TEXT NOT NULL DEFAULT 'hero' CHECK (position IN ('hero', 'bar', 'popup')),
    
    -- Ordenacao e status
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Agendamento
    start_at TIMESTAMPTZ DEFAULT NOW(),
    end_at TIMESTAMPTZ,
    
    -- Metricas simples
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indices para performance
CREATE INDEX IF NOT EXISTS idx_campaign_banners_position ON campaign_banners(position);
CREATE INDEX IF NOT EXISTS idx_campaign_banners_active ON campaign_banners(is_active);
CREATE INDEX IF NOT EXISTS idx_campaign_banners_priority ON campaign_banners(priority DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_banners_dates ON campaign_banners(start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_campaign_banners_position_active ON campaign_banners(position, is_active) WHERE is_active = true;

-- 3. Funcao para atualizar updated_at
CREATE OR REPLACE FUNCTION update_campaign_banners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_campaign_banners_updated_at ON campaign_banners;
CREATE TRIGGER trigger_campaign_banners_updated_at
    BEFORE UPDATE ON campaign_banners
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_banners_updated_at();

-- 4. RLS Policies
ALTER TABLE campaign_banners ENABLE ROW LEVEL SECURITY;

-- Allow server-side admin API (service_role key) to manage banners.
-- This keeps public storefront read-only while enabling writes via backend.
DROP POLICY IF EXISTS "Service role manage campaign banners" ON campaign_banners;
CREATE POLICY "Service role manage campaign banners"
    ON campaign_banners
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Todos podem ver banners ativos dentro do periodo
DROP POLICY IF EXISTS "campaign_banners_select_active" ON campaign_banners;
CREATE POLICY "campaign_banners_select_active" ON campaign_banners
    FOR SELECT USING (
        is_active = true 
        AND start_at <= NOW() 
        AND (end_at IS NULL OR end_at >= NOW())
    );

-- 5. Grants para acesso anonimo (leitura de ativos)
GRANT SELECT ON campaign_banners TO anon;
GRANT SELECT ON campaign_banners TO authenticated;

-- 6. View para banners ativos por posicao (facilita queries)
CREATE OR REPLACE VIEW active_campaign_banners AS
SELECT 
    id,
    title,
    subtitle,
    button_label,
    button_url,
    image_url,
    bg_color,
    text_color,
    button_color,
    button_text_color,
    position,
    priority,
    start_at,
    end_at,
    impressions,
    clicks,
    created_at
FROM campaign_banners
WHERE is_active = true 
    AND start_at <= NOW() 
    AND (end_at IS NULL OR end_at >= NOW())
ORDER BY priority DESC, created_at DESC;

GRANT SELECT ON active_campaign_banners TO anon;
GRANT SELECT ON active_campaign_banners TO authenticated;

-- 7. Funcao para incrementar impressoes (chamada via RPC)
CREATE OR REPLACE FUNCTION increment_banner_impressions(banner_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE campaign_banners 
    SET impressions = impressions + 1 
    WHERE id = banner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Funcao para incrementar cliques (chamada via RPC)
CREATE OR REPLACE FUNCTION increment_banner_clicks(banner_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE campaign_banners 
    SET clicks = clicks + 1 
    WHERE id = banner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Inserir banners de exemplo
INSERT INTO campaign_banners (id, title, subtitle, button_label, button_url, position, priority, bg_color, text_color)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Nova Colecao DeLu', 'Estilo e conforto para os pequenos', 'Ver Novidades', '/products', 'hero', 10, '#1e40af', '#ffffff'),
    ('22222222-2222-2222-2222-222222222222', 'Frete Gratis acima de R$ 100', 'Aproveite!', 'Comprar Agora', '/products', 'bar', 5, '#059669', '#ffffff'),
    ('33333333-3333-3333-3333-333333333333', '10% OFF na primeira compra', 'Use o cupom BEMVINDO10', 'Ver Produtos', '/products', 'popup', 1, '#7c3aed', '#ffffff')
ON CONFLICT (id) DO NOTHING;

COMMIT;
