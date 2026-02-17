# API Contract

Base: `/api/*`

- `GET /api/health`
- `GET /api/search?q=&tag=&from=&to=&source=&type=doc|person|event&page=&pageSize=`
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
- `POST /api/tags/attach`
- `GET /api/jobs`
- `POST /api/jobs/reindex`

All responses are JSON except `/api/render/:id` (Markdown).

`POST /api/chat` is retrieval-first and returns:
- `answer`
- `citations[]` with `docId`, `start`, `end`, `snippet`
- `trace` with query/filters/topK/latency

Admin role header:
- `X-Admin-Role: staff|editor|admin`
