# API Contract

Base: `/api/*`

- `GET /api/health`
- `GET /api/search?q=&tag=&from=&to=&source=&type=doc|person|event&pageSize=`
- `GET /api/docs?page=&pageSize=&tag=&from=&to=&source=`
- `GET /api/docs/:id`
- `GET /api/render/:id`
- `GET /api/entities/:type`
- `GET /api/entities/:type/:id`
- `GET /api/relations?entityId=`
- `POST /api/tags/attach`
- `GET /api/jobs`
- `POST /api/jobs/reindex`

All responses are JSON except `/api/render/:id` (Markdown).
