<p align="center">
  <img src="assets/furhub-banner.png" alt="Banner FurHub — Eventos, Comunidade e Experiências" width="100%" />
</p>

<h1 align="center">🐾 FurCon Hub</h1>

<p align="center">
  <strong>Your fandom. Your convention. One place.</strong><br />
  A plataforma que conecta eventos, organizadores, artistas, voluntários e participantes da comunidade furry.
</p>

<p align="center">
  <img alt="Status: em desenvolvimento" src="https://img.shields.io/badge/status-em%20desenvolvimento-8B5CF6?style=for-the-badge" />
  <img alt="Frontend: React" src="https://img.shields.io/badge/frontend-React%20%2B%20Vite-38BDF8?style=for-the-badge" />
  <img alt="Backend: FastAPI" src="https://img.shields.io/badge/backend-FastAPI-009688?style=for-the-badge" />
  <img alt="Banco: PostgreSQL" src="https://img.shields.io/badge/database-PostgreSQL-336791?style=for-the-badge" />
  <img alt="Infraestrutura: Docker" src="https://img.shields.io/badge/infra-Docker-2496ED?style=for-the-badge" />
</p>

<p align="center">
  <a href="#-sobre-o-projeto">Sobre</a> ·
  <a href="#-funcionalidades">Funcionalidades</a> ·
  <a href="#-comece-em-poucos-minutos">Instalação</a> ·
  <a href="#-portal-público-e-mapa">Mapa</a> ·
  <a href="#-desenvolvimento-local">Desenvolvimento</a> ·
  <a href="#-limitações-e-próximos-passos">Roadmap</a>
</p>

---

## 💜 Sobre o projeto

O **FurCon Hub**, apresentado visualmente como **FurHub**, é uma plataforma SaaS para descobrir, divulgar e organizar convenções, encontros e experiências da *furry fandom*.

A proposta vai além de vender ingressos: **reduzir o trabalho manual dos organizadores**, apoiar artistas e voluntários, facilitar a participação do público e oferecer recursos dedicados ao bem-estar de **fursuiters**.

### Uma plataforma, diferentes experiências

| Público | O que encontra no FurHub |
| --- | --- |
| 🧭 **Visitantes** | Eventos, busca por cidade, mapa, calendário, localização e páginas públicas — **sem login**. |
| 🎟️ **Participantes** | Ingressos, QR Code, agenda pessoal, fursona, favoritos, notificações e passaporte digital. |
| 🎨 **Artistas e expositores** | Perfil, inscrições, Artist Alley, Dealers Den, mesas e contato com organizadores. |
| 🤝 **Voluntários** | Turnos, atribuições, comunicados e organização das equipes. |
| 🐾 **Fursuiters** | Recursos do **Fursuit Care**: áreas de descanso, orientação, desfiles e pedidos de ajuda. |
| 🗂️ **Organizadores** | Eventos, bilheteria, check-in, programação, operações, finanças e relatórios. |

> **Princípio do produto:** informações públicas devem ser acessíveis sem exigir uma conta. O login é reservado às ações pessoais e aos painéis protegidos.

---

## ✨ Funcionalidades

### 🌍 Descoberta de eventos

- Página inicial pública com eventos em destaque e próximos eventos.
- Busca por nome, cidade, estado, data e categoria.
- **Mapa interativo** com Leaflet + OpenStreetMap, marcadores e filtros.
- Busca por proximidade com cálculo de distância geográfica.
- Página de cada evento com endereço público, datas, programação e orientações.
- Calendário público e exportação `.ics`.
- Metadados para SEO, compartilhamento e visualização de eventos.

### 🏢 Organização de convenções

- Múltiplas organizações com isolamento de dados.
- Criação de eventos, rascunhos e publicação.
- Lotes e categorias de ingressos, quantidade e valores.
- Pedidos e fluxo de checkout com **pagamento demonstrativo**.
- Check-in por QR Code, por câmera ou por código.
- Programação, vagas e notificações de alterações.
- Inscrições de artistas e vendedores, mesas e taxas.
- Gestão de turnos de voluntários e equipe.
- Comunicados, relatórios, acompanhamento financeiro e mapa do evento.

### 🐾 Experiência dos participantes

- Carteira de ingressos com QR Code renovável.
- Perfil de fursona privado por padrão.
- Inscrição em atividades e programação com favoritos.
- Diretório de artistas e notificações.
- Passaporte com conquistas por código, sem rastreamento de localização.
- **Fursuit Care:** espaços, orientações, inscrições em desfiles e pedidos de apoio.

### 📊 Dados e gestão

- Indicadores de ingressos, receita, taxas, despesas e orçamento.
- Cálculos financeiros realizados pelo backend; o navegador não determina o preço final.
- Relatórios em JSON e visualização para impressão.
- API documentada para desenvolvimento e integração.

---

## 🚀 Comece em poucos minutos

### Requisitos

- [Docker](https://www.docker.com/) e Docker Compose.
- Portas necessárias disponíveis (por padrão, `8080` para o site).

### 1. Configure o ambiente

```bash
cp .env.example .env
```

Revise o `.env` antes de usar fora do ambiente local. Para explorar a aplicação no computador, você pode manter as opções de demonstração.

### 2. Inicie a plataforma

```bash
docker compose up -d --build
```

### 3. Acesse

| Serviço | Endereço |
| --- | --- |
| 🌐 **Aplicação** | http://localhost:8080 |
| 📚 **Documentação da API** | http://localhost:8080/api/docs *(somente fora de produção)* |

O frontend é servido pelo **nginx**, que também encaminha chamadas `/api` ao backend. O PostgreSQL utiliza o volume `pgdata` para persistência.

**Comandos úteis:**

```bash
docker compose logs -f        # acompanhar logs
docker compose ps             # serviços em execução
docker compose down           # parar, sem apagar dados
docker compose down -v        # apagar volumes e dados locais (irreversível)
```

### 👥 Contas de demonstração

Com `SEED_DEMO=true`, são criados registros marcados como **DEMO** (`[DEMO]` e identificação visual na interface).

| Perfil | E-mail |
| --- | --- |
| Organizadora | `admin@demo.example.com` |
| Voluntário | `voluntario@demo.example.com` |
| Artista | `artista@demo.example.com` |
| Participante | `participante@demo.example.com` |

**Senha de demonstração:** `Demo@12345`

O login possui atalhos para esses perfis quando o modo de demonstração está ativado.

> ⚠️ **Nunca exponha as contas DEMO em uma implantação pública.** Use `SEED_DEMO=false`, remova contas já criadas e configure segredos e credenciais fortes em produção. Desativar o seed não exclui automaticamente usuários existentes.

---

## 🗺️ Portal público e mapa

O site pode ser explorado **sem cadastro**, nas rotas:

| Rota | Conteúdo |
| --- | --- |
| `/` | Página inicial e destaques. |
| `/eventos` | Catálogo e filtros de eventos. |
| `/eventos/:slug` | Página individual do evento. |
| `/mapa` | Mapa interativo e pesquisa por região. |
| `/calendario` | Calendário público. |
| `/artistas` | Diretório de artistas. |
| `/planos` | Planos da plataforma. |
| `/para-organizadores` | Informações para organizações. |
| `/sobre` e `/ajuda` | Institucional e ajuda. |

**Regras importantes de localização:**

- A busca por raio utiliza geografia e distância, **não tempo de deslocamento**.
- A localização do visitante não é persistida para realizar a busca.
- Eventos com `location_visibility=city_only` ou `hidden` não expõem o endereço preciso e não aparecem como marcadores nem em buscas por raio.
- Eventos online não divulgam automaticamente links privados.
- O mapa utiliza Leaflet e OpenStreetMap; o endpoint público de tiles do OSM é destinado a uso compatível com a política do serviço, não deve ser presumido adequado para tráfego de produção.

### Configuração de tiles

```dotenv
# Defina no ambiente de build do frontend conforme seu provedor:
VITE_TILE_URL=...
VITE_TILE_ATTRIBUTION=...
```

Para uso público em escala, configure um provedor de tiles apropriado e respeite a atribuição e suas condições de uso.

### Geocodificação e consultas espaciais

- Serviço de geocodificação: `GET /api/org/geocode`, com cache e limite de aproximadamente 1 requisição por segundo no fluxo descrito.
- Variáveis: `GEOCODER_URL` e `GEOCODER_USER_AGENT`.
- A migração `0002` habilita a coluna geográfica `events.geog` e índice GiST quando PostGIS está disponível.
- A busca por raio usa `ST_DWithin` com PostGIS; sem a extensão, há fallback de caixa delimitadora + haversine.
- O nginx encaminha a rota pública de detalhe de evento ao backend para incluir título, canonical, Open Graph e JSON-LD no HTML inicial. Rascunhos e cancelados recebem `noindex`.

### API pública

```text
GET /api/v1/public/events
GET /api/v1/public/events/map
GET /api/v1/public/events/nearby
GET /api/v1/public/events/{slug}
GET /api/v1/public/categories
GET /api/v1/public/highlights
GET /api/v1/public/calendar
GET /api/v1/public/calendar.ics
GET /api/v1/public/artists
GET /api/v1/public/sitemap.xml
```

---

## 🛠️ Desenvolvimento local

Para executar frontend e backend separadamente, mantenha apenas o banco no Docker:

```bash
docker compose up -d db
```

**Backend — Python/FastAPI**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt

export DATABASE_URL=postgresql+psycopg://furconhub:furconhub_dev@localhost:5432/furconhub
export SEED_DEMO=true
uvicorn app.main:app --reload
```

API local: http://localhost:8000

**Frontend — React/Vite**

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Aplicação: http://localhost:5173 (proxy de `/api` para a API local).

**Testes e lint**

```bash
cd backend
pytest -q
ruff check .

cd ../frontend
npm run build
```

Os testes podem usar SQLite por padrão ou `TEST_DATABASE_URL=postgresql+psycopg://...` para PostgreSQL, conforme configuração do projeto.

---

## 🧱 Arquitetura

```mermaid
flowchart TB
    V[Visitantes e participantes] --> N[Frontend React + nginx]
    O[Organizadores e voluntários] --> N
    N -->|/api| A[FastAPI]
    A --> P[(PostgreSQL / PostGIS)]
    A --> F[Regras de negócio: eventos, ingressos, check-in]
    F --> P
    A --> G[Geocodificação e serviços externos]
```

| Camada | Tecnologias |
| --- | --- |
| Interface | React, Vite, Tailwind CSS, Lucide, Recharts, Framer Motion |
| Mapas | Leaflet, OpenStreetMap, geocodificação |
| API | FastAPI, SQLAlchemy 2 |
| Banco | PostgreSQL 16, PostGIS quando disponível |
| Infraestrutura | Docker Compose, nginx |
| Automação | GitHub Actions |

### Estrutura resumida

```text
furcon-hub/
├── assets/
│   └── furhub-banner.png     # banner exibido neste README
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   ├── services/
│   │   └── models.py
│   ├── migrations/
│   └── tests/
├── frontend/
│   └── src/
│       ├── components/
│       └── pages/
│           ├── public/
│           ├── org/
│           └── portal/
├── .github/workflows/ci.yml
├── docker-compose.yml
├── .env.example
└── README.md
```

### Banco e migrações

O projeto descreve **migrações Alembic** (incluindo PostGIS). Também há menção a uma rotina de compatibilidade para bancos antigos e `create_all` na inicialização. Antes de uma implantação de produção, consolide o fluxo para que **Alembic seja a fonte oficial de evolução do schema**, evitando alterações implícitas sem revisão.

---

## 🌐 Publicação com Cloudflare Tunnel

O nginx já serve o frontend e encaminha `/api`, permitindo expor uma única porta.

### Opção A — Quick Tunnel (temporário)

```bash
docker compose --profile tunnel up -d
docker compose logs cloudflared | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1
```

Também é possível utilizar `cloudflared tunnel --url http://localhost:8080` fora do Docker.

> A URL temporária pode mudar. **Não publique um ambiente com contas DEMO, senha de desenvolvimento ou dados sensíveis**, mesmo para testes rápidos.

### Opção B — Named Tunnel (domínio fixo)

1. Em Cloudflare Zero Trust, crie um túnel em **Networks → Tunnels**.
2. Configure um *Public Hostname* apontando para `http://frontend:8080`.
3. Defina `TUNNEL_TOKEN` no arquivo `.env`.
4. Execute:

```bash
docker compose --profile named-tunnel up -d
```

### Checklist antes de publicar

- [ ] Definir `ENVIRONMENT=production`.
- [ ] Gerar `SECRET_KEY` forte (`openssl rand -hex 32`).
- [ ] Usar senha robusta para o PostgreSQL.
- [ ] Desativar `SEED_DEMO` e excluir contas de demonstração existentes.
- [ ] Configurar serviço de tiles compatível com uso público.
- [ ] Revisar Termos de Uso, Política de Privacidade e procedimentos LGPD.
- [ ] Implementar pagamentos reais antes de vender ingressos.
- [ ] Verificar backups, HTTPS, logs, autorização e limites de requisições.
- [ ] Revisar o armazenamento de JWT em `localStorage` e a estratégia de sessões.
- [ ] Validar envios de e-mail e recuperação de acesso antes da operação pública.

---

## 🔒 Segurança e privacidade

De acordo com o escopo fornecido, o projeto contempla:

- Senhas com bcrypt e autenticação por JWT.
- Controle de acesso por função e organização.
- Limite de tentativas de login no processo da aplicação.
- QR Codes opacos, sem dados pessoais, com renovação.
- Consulta de check-in mostrando apenas o nome da credencial.
- Consentimento de privacidade no cadastro.
- Exportação e exclusão de conta.
- Anonimização de ingressos e rotinas de retenção por evento (`python -m app.retention`).
- Cabeçalhos de segurança e CSP no nginx.

**Atenção:** proteção completa requer configuração e testes de infraestrutura. O limitador de login em memória deve migrar para armazenamento compartilhado (como Redis) quando houver múltiplas réplicas.

### Ingressos de convidados

O checkout de convidados gera um endereço secreto `/ingresso/:token`; somente o hash do token é persistido. Como **o envio de e-mail transacional ainda não está implementado**, o link é mostrado uma única vez após a operação. Não compartilhe esse endereço publicamente.

---

## 🧪 CI/CD

O workflow `.github/workflows/ci.yml` é descrito com os seguintes jobs:

1. **Backend:** Ruff e Pytest com PostgreSQL de serviço.
2. **Frontend:** `npm ci` e `npm run build`.
3. **Docker:** inicialização da stack e *smoke tests* (health, página e login).
4. **Publish:** em `main` e tags `v*`, publicação das imagens no GitHub Container Registry (GHCR), conforme permissões e configuração do repositório.

---

## 🧭 Limitações e próximos passos

| Tema | Situação descrita | Próxima evolução |
| --- | --- | --- |
| Pagamentos | **Simulados** com `DemoGateway` | Integrar Pix/cartão e webhooks verificados. |
| E-mails | **Não implementados** | Enviar credenciais, recuperação de senha e notificações. |
| Upload de imagens | **Não implementado** | Armazenamento de arquivos com controle de acesso. |
| Offline/PWA | **Não implementado** | Cache de agenda, mapa e check-in offline seguro. |
| Publicação/moderação | Fluxo de moderação ainda pendente | Revisão de eventos e trilha de aprovação. |
| Sessões | JWT atualmente em `localStorage` | Avaliar sessão/cookie seguro e proteção CSRF. |
| Login distribuído | Limite em memória | Rate limiting compartilhado com Redis. |
| Fusos horários | Tratamento local do evento ainda limitado | Persistir fuso IANA e instantes UTC. |
| Schema | Alembic e referência legada a `create_all` | Centralizar migrações versionadas. |
| Jurídico | Texto de privacidade é um modelo | Revisar termos, LGPD e processos operacionais. |

> O projeto está **em desenvolvimento**. Antes de processar pagamentos ou dados reais em produção, valide o comportamento efetivo do código, das integrações e da infraestrutura.

---

## 🤝 Por que o FurHub existe?

Organizar um evento não deveria depender de planilhas dispersas, mensagens perdidas ou equipes sobrecarregadas. Participar de uma convenção também não deveria significar ficar sem acesso às informações, aos espaços de descanso e aos canais de ajuda.

O **FurHub** busca unir organização, comunidade e cuidado em uma experiência mais acessível para todos.

<p align="center"><strong>🐾 Eventos · Comunidade · Experiências</strong></p>

<!-- Licenciamento: adicionar uma seção de licença quando a licença do repositório for definida. -->
