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
curl -sS "http://127.0.0.1:8787/api/entities/pages?limit=5"
curl -sS "http://127.0.0.1:8787/api/relations?entityId=home"
curl -sS http://127.0.0.1:8787/api/jobs
curl -sS -X POST http://127.0.0.1:8787/api/tags/attach -H 'content-type: application/json' -d '{"docId":"home","tags":["landing","seo"]}'
curl -sS -X POST http://127.0.0.1:8787/api/jobs/reindex -H 'content-type: application/json' -d '{"source":"smoke"}'
```
