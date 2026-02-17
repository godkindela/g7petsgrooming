# SOP

## Architecture
- `apps/public-ui`: Pages public site
- `apps/admin-ui`: Pages admin dashboard
- `apps/worker-api`: Worker API only (`/api/*`)
- `packages/shared`: shared types + API client

## UI Rules
- Admin uses only one shared implementation of `AppShell`, `PageHeader`, `FilterBar`, `DataTable`, `EntityDrawer`.
- Spacing follows 8px rhythm.
- One primary button per page.

## Deployment
- Worker has `dev/staging/prod` in `apps/worker-api/wrangler.toml`.
- CORS only allows configured Pages origins.
- Pages env vars: `VITE_API_BASE`, `ENV`.
