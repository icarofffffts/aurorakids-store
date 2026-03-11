# Documentação de Requisitos do Produto (PRD)
## DeLu Kids

**Versão:** 1.0
**Data:** 31/01/2026
**Status:** Em Desenvolvimento

---

## 1. Visão Geral do Produto
O projeto **DeLu Kids** é uma plataforma de e-commerce moderna voltada para o nicho de moda infantil. O sistema é composto por uma loja virtual performática para os clientes finais e um painel administrativo robusto para gestão do negócio. A arquitetura utiliza tecnologias de ponta como React/Vite para o frontend, Supabase como Backend-as-a-Service (BaaS) e n8n para automação de processos de negócio.

## 2. Objetivos
*   **Vendas Online:** Oferecer uma experiência de compra fluida e segura para roupas infantis.
*   **Gestão Eficiente:** Facilitar o gerenciamento de produtos, pedidos e clientes através de um painel administrativo intuitivo.
*   **Automação:** Automatizar notificações de pedidos e processos de marketing (newsletter) para reduzir trabalho manual.
*   **Performance:** Garantir carregamento rápido e otimização para dispositivos móveis.

## 3. Público Alvo
*   **Clientes Finais:** Pais, mães e familiares buscando roupas infantis de qualidade com facilidade de compra online.
*   **Administradores:** Gerentes da loja que precisam cadastrar produtos, acompanhar vendas e configurar a loja.

## 4. Arquitetura Técnica

### Stack Tecnológica
*   **Frontend Check-out & Loja:**
    *   **Framework:** React 18 + Vite
    *   **Linguagem:** TypeScript
    *   **Estilização:** TailwindCSS (com Shadcn/UI para componentes)
    *   **Gerenciamento de Estado/Cache:** TanStack Query
    *   **Formulários:** React Hook Form + Zod
    *   **Roteamento:** React Router DOM
*   **Backend & Dados:**
    *   **Banco de Dados:** PostgreSQL (via Supabase)
    *   **Autenticação:** Supabase Auth
    *   **Storage:** Supabase Storage (para imagens de produtos)
*   **Infraestrutura & Integração:**
    *   **API Gateway:** Kong
    *   **Automação:** n8n (Gerenciamento de fluxos de trabalho)
    *   **Containerização:** Docker & Docker Compose

### Estrutura de Pastas (Resumo)
*   `/src/pages`: Páginas da loja (Home, Produtos, Detalhes) e Área Admin.
*   `/src/components`: Componentes reutilizáveis (UI Kit baseado em Shadcn).
*   `/supabase_schema.sql`: Definições do banco de dados e políticas de segurança (RLS).
*   `*.json`: Fluxos do n8n (Newsletter, Pedidos).

## 5. Funcionalidades

### 5.1. Loja (Frente de Loja)
*   **Home Page (`Index.tsx`):** Vitrine principal com destaques.
*   **Catálogo de Produtos (`Products.tsx`):** Listagem com filtros por categoria.
*   **Detalhes do Produto (`ProductDetails.tsx`):**
    *   Visualização de imagens.
    *   Seleção de tamanhos e cores.
    *   Avaliações e Reviews de clientes.
*   **Carrinho e Checkout (`Checkout.tsx`):** Fluxo de finalização de compra.
*   **Pagamento (`Payment.tsx`):** Processamento de pagamentos.
*   **Conta do Usuário (`Account.tsx`):** Histórico de pedidos e dados cadastrais.
*   **Autenticação:** Login (`Login.tsx`) e Cadastro (`Register.tsx`) de clientes.

### 5.2. Admin (`/src/pages/admin`)
*   **Dashboard (`Dashboard.tsx`):** Visão geral de métricas (Vendas, Novos Clientes).
*   **Gestão de Produtos (`Products.tsx`):** Adicionar, editar e remover produtos; gerenciar estoque e imagens.
*   **Gestão de Pedidos (`Orders.tsx`):** Visualizar e atualizar status de pedidos.
*   **Gestão de Clientes (`Customers.tsx`):** Lista de clientes cadastrados.
*   **Configurações (`Settings.tsx`):** Configurações gerais da loja (ex: valor para frete grátis).

## 6. Modelo de Dados (Supabase)

O banco de dados utiliza PostgreSQL com as seguintes tabelas principais:

### `products`
*   `id`: Identificador único.
*   `name`: Nome do produto.
*   `price`: Preço de venda.
*   `image`: URL da imagem principal.
*   `category`: Categoria (ex: Meninas, Meninos, Bebês).
*   `sizes`: Array de tamanhos disponíveis.
*   `colors`: Array de cores disponíveis.
*   `rating` / `reviews`: Nota média e contagem de avaliações.
*   `is_new`: Flag de "Novidade".

### `store_settings`
*   `store_name`: Nome da loja.
*   `free_shipping_threshold`: Valor mínimo para frete grátis.
*   `contact_email` / `contact_phone`: Dados de contato.

> **Segurança:** Row Level Security (RLS) habilitado para proteger dados sensíveis e permitir operações conforme perfil (Cliente vs Admin).

## 7. Automação e Integrações (n8n)

### Fluxo de Novos Pedidos (`n8n_order_workflow.json`)
*   **Gatilho:** Webhook (`POST /new-order`).
*   **Ação:** Envia notificação para Telegram/Slack.
*   **Dados:** Valor do pedido e Nome do cliente.

### Fluxo de Newsletter (`n8n_newsletter_workflow.json`)
*   **Objetivo:** Gerenciar inscrições e disparos de e-mail marketing (detalhes a confirmar na implementação).

## 8. Requisitos Não-Funcionais
*   **Responsividade:** O layout deve se adaptar perfeitamente a Desktops, Tablets e Smartphones.
*   **Design System:** Uso consistente de componentes Shadcn/UI e tokens do TailwindCSS.
*   **Segurança:** Todas as rotas administrativas devem ser protegidas. O checkout deve garantir segurança dos dados de pagamento.
