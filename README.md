# Aurora Kids Store - E-commerce de Moda Infantil

![Status](https://img.shields.io/badge/Status-Em%20Desenvolvimento-yellow)
![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Supabase%20%7C%20n8n-blue)

O **Aurora Kids** é uma plataforma de e-commerce moderna voltada para o nicho de moda infantil. Desenvolvido com foco em performance, escalabilidade e automação de processos.

## 🚀 Tecnologias Utilizadas

- **Frontend:** React 18, Vite, TypeScript, TailwindCSS, Shadcn/UI.
- **Backend-as-a-Service (BaaS):** Supabase (Auth, Database, Storage).
- **Automação:** n8n para fluxos de pedidos, newsletter e notificações.
- **Integrações:** Mercado Pago (Pagamentos).
- **Infraestrutura:** Docker & Kong Gateway.

## 🏗️ Arquitetura do Projeto

O projeto segue uma arquitetura moderna e desacoplada:
- **Painel Administrativo:** Gestão completa de produtos, pedidos e métricas de vendas.
- **Loja Virtual:** Experiência de compra otimizada para dispositivos móveis com filtros avançados e checkout fluído.
- **Camada de Automação:** Workflows n8n que conectam eventos do banco de dados a serviços de mensageria e CRM.

## 📂 Organização de Documentos

Para facilitar a exploração, os documentos técnicos foram organizados em:
- `docs/sql/`: Definições de schema, políticas de RLS e seeds.
- `docs/n8n/`: Arquivos JSON dos workflows utilizados no projeto.

## 🛠️ Como Executar Localmente

1. Clone o repositório.
2. Instale as dependências:
   ```sh
   npm install
   ```
3. Configure o arquivo `.env` (baseado no `.env.example`).
4. Inicie o servidor de desenvolvimento:
   ```sh
   npm run dev
   ```

---
*Este é um projeto pessoal desenvolvido como parte do meu portfólio profissional.*
