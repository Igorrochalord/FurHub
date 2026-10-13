# FurCon Hub

> Your fandom. Your convention. One place.

SaaS para organização de convenções da furry fandom: painel dos organizadores + portal dos participantes, com módulo **Fursuit Care**.

**Stack:** React + Vite + Tailwind + Lucide + Recharts + Framer Motion · FastAPI + SQLAlchemy 2 · PostgreSQL (Docker) · nginx · GitHub Actions.

## Rodar com Docker (recomendado)

```bash
cp .env.example .env          # ajuste se quiser
docker compose up -d --build
```

Abra <http://localhost:8080>. O banco (Postgres 16) roda no container `db`, com volume `pgdata` (os dados persistem). Para zerar tudo: `docker compose down -v`.

Com `SEED_DEMO=true` (padrão no `.env.example`) são criados dados **claramente marcados como DEMO** (`[DEMO]`, selo amarelo na UI). Senha de todas as contas demo: `Demo@12345`

| Perfil | E-mail |
|---|---|
| Organizadora (admin) | `admin@demo.example.com` |
| Voluntário | `voluntario@demo.example.com` |
| Artista | `artista@demo.example.com` |
| Participante | `participante@demo.example.com` |

A tela de login tem atalhos para essas contas quando `SEED_DEMO=true`. API interativa (só fora de produção): <http://localhost:8080/api/docs>.

## Portal público e mapa (Etapa 1)

Sem login: `/` (home), `/eventos`, `/eventos/:slug`, `/mapa`, `/calendario`, `/artistas`, `/planos`, `/para-organizadores`, `/sobre`, `/ajuda`.
O mapa usa Leaflet + OpenStreetMap. Os tiles padrão (`tile.openstreetmap.org`) servem apenas para desenvolvimento/baixo volume; em produção defina `VITE_TILE_URL` (e `VITE_TILE_ATTRIBUTION`) com um provedor contratado.

API pública: `/api/v1/public/{events,events/map,events/nearby,events/{slug},categories,highlights,calendar,calendar.ics,artists,sitemap.xml}` (docs em `/api/docs`).

- Privacidade: eventos com `location_visibility` = `city_only`/`hidden` não têm marcador nem endereço, e não aparecem em buscas por raio. Link de eventos online nunca é exposto.
- Distâncias são em linha reta (haversine + caixa delimitadora), calculadas sem gravar a localização do visitante. PostGIS fica como evolução (ver `services/geo.py`).
- Migrações com Alembic (`backend/migrations`); bancos criados antes dele são atualizados e marcados automaticamente na subida.
- PostGIS: a imagem do Postgres é `postgis/postgis`; a migração 0002 cria `events.geog` (geography + índice GiST) e a busca por raio usa `ST_DWithin`. Sem PostGIS, cai para caixa delimitadora + haversine.
- Geocodificação (`GET /api/org/geocode`): Nominatim com cache em banco e 1 req/s. Configure `GEOCODER_URL` e `GEOCODER_USER_AGENT` (ver `.env.example`).
- SEO: o nginx encaminha `/eventos/:slug` ao backend, que injeta título, canonical, Open Graph e JSON-LD no HTML inicial (rascunhos e cancelados saem como `noindex`).
- Checkout de convidado: o ingresso fica num link secreto (`/ingresso/:token`, só o hash é guardado). **Ainda não há envio de e-mail**: o link é exibido na tela uma única vez.
- Tema claro/escuro/sistema e pré-visualização privada de rascunhos (botão "Pré-visualizar" no painel do evento).
- Tiles: o padrão (OSM) é só para desenvolvimento; em produção defina `VITE_TILE_URL`.

**Pendências conhecidas:** envio de e-mail (links de ingresso de convidado, contato), pagamentos reais (hoje simulados), revisão jurídica dos Termos, moderação de publicação (Etapa 2).

## URL pública com Cloudflare Tunnel

O nginx do `frontend` já serve o app **e** faz proxy de `/api`, então basta expor uma única porta.

### Opção A — URL temporária, sem conta (Quick Tunnel)

```bash
docker compose --profile tunnel up -d
docker compose logs cloudflared | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1
```

A URL `https://xxxx.trycloudflare.com` muda a cada reinício do container. Sem o Docker: `cloudflared tunnel --url http://localhost:8080` (macOS: `brew install cloudflared`).

### Opção B — URL fixa com seu domínio (Named Tunnel)

1. No painel Cloudflare Zero Trust → **Networks → Tunnels → Create a tunnel** (Cloudflared) e copie o token.
2. No mesmo tunnel, adicione um *Public Hostname* (ex.: `furcon.seudominio.com`) apontando para `http://frontend:8080`.
3. Coloque `TUNNEL_TOKEN=...` no `.env` e rode:

```bash
docker compose --profile named-tunnel up -d
```

> Ao expor publicamente: defina `ENVIRONMENT=production`, um `SECRET_KEY` aleatório (`openssl rand -hex 32`), senha forte do Postgres e, de preferência, `SEED_DEMO=false`. Em produção o backend **recusa iniciar** com a chave de desenvolvimento e desativa `/api/docs`. Contas de demonstração têm senha pública — não as deixe ativas em um endereço aberto.

## Desenvolvimento local

```bash
docker compose up -d db                      # só o Postgres

cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
export DATABASE_URL=postgresql+psycopg://furconhub:furconhub_dev@localhost:5432/furconhub SEED_DEMO=true
uvicorn app.main:app --reload                # http://localhost:8000

cd ../frontend
npm install && npm run dev                   # http://localhost:5173 (proxy /api → :8000)
```

Testes: `cd backend && pytest -q` (SQLite por padrão; `TEST_DATABASE_URL=postgresql+psycopg://...` para Postgres). Lint: `ruff check .`

## Pipeline (GitHub Actions)

`.github/workflows/ci.yml`, em push/PR:

1. **backend** — `ruff` + `pytest` contra um Postgres de serviço
2. **frontend** — `npm ci` + `npm run build`
3. **docker** — sobe o `docker-compose` inteiro e faz *smoke test* (health, página, login)
4. **publish** — em `main` ou tags `v*`, publica `backend` e `frontend` no GHCR (`ghcr.io/<owner>/<repo>/{backend,frontend}`)

## O que está implementado

- **Multi-organização** com isolamento: toda rota do painel valida que o evento pertence à organização do usuário (404 caso contrário). Perfis: `admin`, `volunteer`, `artist`, `participant`.
- **Organizadores:** eventos (rascunho/publicado), lotes de ingresso (VIP, estoque, preço), participantes + cancelamento/estorno, **check-in por QR** (câmera ou código), programação (vagas, notificação automática de mudança), artistas/vendedores (avaliação, mesas, taxas), turnos de voluntários (conflitos bloqueados, confirmação), financeiro, comunicados, mapa interativo, fila do Fursuit Care, conquistas, relatórios (JSON/impressão), equipe.
- **Participantes:** compra de ingresso, carteira com QR renovável, fursona (privada por padrão), programação com favoritos e inscrições, mapa, diretório de artistas, notificações, passaporte (resgate por código, sem rastrear localização), Fursuit Care (espaços, orientações, desfiles, pedido de ajuda).
- **Cálculos financeiros no backend** (`app/services/finance.py`): receita, taxa do provedor (`PAYMENT_FEE_*`), taxas de mesa, despesas, líquido, margem, uso de orçamento. O preço do ingresso sempre vem do servidor.
- **Segurança/privacidade:** senhas com bcrypt, JWT, limite de tentativas de login, QR opaco (sem dados pessoais) e renovável, check-in mostra só o nome do crachá, consentimento de privacidade no cadastro, **exportação e exclusão de conta**, ingressos anonimizados, retenção por evento (`python -m app.retention`), CSP/headers no nginx.

## Limitações conhecidas (próximos passos)

- **Pagamento é simulado** (`app/services/payments.py`, `DemoGateway`): nenhuma cobrança real. Para vender de verdade, implemente um gateway (Pix/cartão) com confirmação via webhook.
- Tabelas criadas com `create_all` na subida; para evolução de schema em produção adicione **Alembic**.
- Limite de login é em memória (por processo); use Redis se rodar várias réplicas. Token JWT fica em `localStorage`.
- Sem e-mail transacional/recuperação de senha, sem modo offline/PWA, sem upload de imagens. O texto de privacidade é um modelo que precisa de revisão jurídica (LGPD).
- Eventos guardam horários como "relógio local do evento" (sem fuso).

## Estrutura

```
backend/   FastAPI (app/routers, app/services, app/models.py, tests/)
frontend/  React + Vite (src/pages/{public,org,portal}, src/components)
docker-compose.yml · .env.example · .github/workflows/ci.yml
```
