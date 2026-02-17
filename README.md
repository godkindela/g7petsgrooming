# g7petsgrooming

Cloudflare default SOP structure (Public + Admin + Worker API):

- `apps/public-ui` (Cloudflare Pages)
- `apps/admin-ui` (Cloudflare Pages)
- `apps/worker-api` (Cloudflare Worker, only `/api/*`)
- `packages/shared` (types + API client)
- `Docs/SOP.md`
- `Docs/API_CONTRACT.md`

## API Contract

Implemented endpoints:

- `GET /api/health`
- `GET /api/search?q=&tag=&from=&to=&source=&type=doc|person|event&pageSize=`
- `GET /api/docs?page=&pageSize=&tag=&from=&to=&source=`
- `GET /api/docs/:id`
- `GET /api/render/:id`
- `POST /api/chat`
- `GET /api/public/services`
- `GET /api/public/slots?date=YYYY-MM-DD&service_id=ID`
- `POST /api/public/bookings`
- `GET /api/admin/bookings?date=YYYY-MM-DD&status=&q=`
- `GET /api/admin/bookings/:id`
- `POST /api/admin/bookings/:id/confirm`
- `POST /api/admin/bookings/:id/cancel`
- `POST /api/admin/bookings/:id/complete`
- `GET /api/admin/slots?date=YYYY-MM-DD`
- `POST /api/admin/slots/generate`
- `PUT /api/admin/slots/:id`
- `GET /api/entities/:type`
- `GET /api/entities/:type/:id`
- `GET /api/relations?entityId=`
- `POST /api/tags/attach` (supports bulk tags)
- `GET /api/jobs`
- `POST /api/jobs/reindex`

## Local Dev

```bash
npm install

# terminal 1: worker api
npm run db:migrate:local
npm run dev:api

# terminal 2: admin ui (http://localhost:5173)
npm run dev:admin

# terminal 3: public ui (http://localhost:5174)
npm run dev:public
```

## Build

```bash
npm run build
```

## Search/AI Optimization (Rule 7)

- Deterministic ranking: exact match > title match > body match, with stable tie-break by recency then `docId`.
- Filters: `q`, `tag`, `source`, `from`, `to`, `type`, plus `page` + `pageSize`.
- Stable identifiers: all search results return `id` for `/results/:docId` style routing.
- D1 FTS5: `pages_fts` virtual table + triggers (migration `0005_search_fts.sql`).
- Caching:
  - `/api/search` uses Worker Cache API (hot query cache, `X-Cache: HIT|MISS`).
  - `/api/render/:id` uses Cache API + R2 render cache (`render-cache/<docId>.md`).
- Safety:
  - `/api/render/:id` sanitizes markdown/HTML payload to prevent script injection.
  - Basic rate limit for `/api/search` and `/api/chat`.
- Observability:
  - Structured logs for `/api/search`, `/api/render`, `/api/chat` including latency and cache hit/miss.
- AI bot defaults:
  - `/api/chat` is retrieval-first (runs search before answering).
  - Returns `citations` (`docId`, snippet offsets) and `trace` metadata (`query`, filters, `topK`, latency).

## Simple Booking (Public + Admin)

- Public page: `/book` (Service -> Time -> Client -> Confirm).
- Default booking window: future 14 days (Australia/Melbourne in UI).
- Admin pages:
  - `/bookings`
  - `/bookings/:id`
  - `/slots`
- Admin RBAC role header: `X-Admin-Role: staff|editor|admin`
  - `staff`: list/detail bookings + slots manage + gallery manage
  - `editor/admin`: includes confirm/cancel/complete booking actions

### Generate slots

```bash
curl -sS -X POST http://127.0.0.1:8787/api/admin/slots/generate \
  -H 'X-Admin-Role: admin' \
  -H 'content-type: application/json' \
  -d '{}'
```

Defaults: today to today+13, 09:00-17:00, 30 minutes, capacity 1.

## Deploy

### Worker

```bash
cd apps/worker-api
npm run deploy
```

This project uses one D1 database for all deploys.

### Pages

Create two Pages projects:

1. `apps/admin-ui`
- build command: `npm run build`
- output: `dist`
- env vars:
  - `VITE_API_BASE=<worker-url>`
  - `ENV=dev|staging|prod`

2. `apps/public-ui`
- build command: `npm run build`
- output: `dist`
- env vars:
  - `VITE_API_BASE=<worker-url>`
  - `ENV=dev|staging|prod`

Worker CORS vars in `apps/worker-api/wrangler.toml`:

- `PUBLIC_UI_ORIGIN`
- `ADMIN_UI_ORIGIN`

### GitHub Actions (CI/CD)

Workflows:

- `.github/workflows/ci.yml`
- `.github/workflows/deploy-cloudflare.yml`

`deploy-cloudflare.yml` is `workflow_dispatch` and deploys:

1. Worker (`apps/worker-api`)
2. Public Pages (`apps/public-ui`)
3. Admin Pages (`apps/admin-ui`)

Required GitHub repository secrets:

- `CLOUDFLARE_API_TOKEN`

## Smoke Tests

```bash
curl -sS http://127.0.0.1:8787/api/health
curl -sS "http://127.0.0.1:8787/api/search?q=groom&type=doc"
curl -sS "http://127.0.0.1:8787/api/docs?page=1&pageSize=5"
curl -sS http://127.0.0.1:8787/api/docs/home
curl -sS http://127.0.0.1:8787/api/render/home
curl -sS -X POST http://127.0.0.1:8787/api/chat -H 'content-type: application/json' -d '{"query":"grooming","topK":3}'
curl -sS "http://127.0.0.1:8787/api/entities/pages?limit=5"
curl -sS "http://127.0.0.1:8787/api/relations?entityId=home"
curl -sS http://127.0.0.1:8787/api/jobs
curl -sS -X POST http://127.0.0.1:8787/api/tags/attach -H 'content-type: application/json' -d '{"docId":"home","tags":["landing","seo"]}'
curl -sS -X POST http://127.0.0.1:8787/api/jobs/reindex -H 'content-type: application/json' -d '{"source":"smoke"}'
curl -sS -X POST http://127.0.0.1:8787/api/admin/slots/generate -H 'X-Admin-Role: admin' -H 'content-type: application/json' -d '{}'
curl -sS http://127.0.0.1:8787/api/public/services
curl -sS "http://127.0.0.1:8787/api/public/slots?date=2026-02-17&service_id=1"
curl -sS -X POST http://127.0.0.1:8787/api/public/bookings -H 'content-type: application/json' -d '{"service_id":1,"slot_id":1,"client_name":"Alice","client_phone":"0400000001"}'
curl -sS "http://127.0.0.1:8787/api/admin/bookings?date=2026-02-17" -H 'X-Admin-Role: admin'
```

## Non-regression Tests (Rule 7.6)

```bash
# unit: ranking + filters + pagination + citation offsets
npm run test:api:unit

# integration: ingest -> index -> search -> render (/results/:docId equivalent)
# requires local worker running on 127.0.0.1:8787
# run once first if local D1 is empty: npm run db:migrate:local
npm run test:api:integration

# load sanity: 50 search queries, validates p95 budget (default 800ms)
# requires local worker running on 127.0.0.1:8787
npm run test:api:load
```
