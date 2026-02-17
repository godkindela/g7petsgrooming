import { Hono } from 'hono';

type Env = {
  DB: D1Database;
  GALLERY_BUCKET: R2Bucket;
  APP_ENV?: string;
  PUBLIC_UI_ORIGIN?: string;
  ADMIN_UI_ORIGIN?: string;
};

type App = { Bindings: Env };

type EntityConfig = { table: string; idField: string };

type TagAttachBody = {
  docId?: string;
  tag?: string;
  tags?: string[];
};

const app = new Hono<App>();

const ENTITY_MAP: Record<string, EntityConfig> = {
  pages: { table: 'pages', idField: 'slug' },
  services: { table: 'services', idField: 'id' },
  faq: { table: 'faq', idField: 'id' },
  gallery_images: { table: 'gallery_images', idField: 'id' },
  jobs: { table: 'api_jobs', idField: 'id' },
  tags: { table: 'api_tags', idField: 'id' }
};

function nowISO(): string {
  return new Date().toISOString();
}

function toInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(raw || '', 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function like(raw: string): string {
  return `%${raw.trim()}%`;
}

function allowedOrigins(c: { env: Env }): string[] {
  return [c.env.PUBLIC_UI_ORIGIN || '', c.env.ADMIN_UI_ORIGIN || ''].map((x) => x.trim()).filter(Boolean);
}

function requestOrigin(c: any): string {
  return (c.req.header('origin') || '').trim();
}

function isOriginAllowed(c: any): boolean {
  const origin = requestOrigin(c);
  if (!origin) return true;
  return allowedOrigins(c).includes(origin);
}

function applyCors(c: any): void {
  const origin = requestOrigin(c);
  if (!origin) return;
  if (!allowedOrigins(c).includes(origin)) return;

  c.header('Access-Control-Allow-Origin', origin);
  c.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  c.header('Access-Control-Max-Age', '86400');
  c.header('Vary', 'Origin');
}

app.use('/api/*', async (c, next) => {
  if (c.req.method === 'OPTIONS') {
    if (!isOriginAllowed(c)) return c.json({ error: 'Origin not allowed' }, 403);
    applyCors(c);
    return c.body(null, 204);
  }

  if (!isOriginAllowed(c)) return c.json({ error: 'Origin not allowed' }, 403);

  await next();
  applyCors(c);
});

app.get('/api/health', async (c) => {
  const ping = await c.env.DB.prepare('SELECT 1 AS ok').first<{ ok: number }>();
  return c.json({ ok: Boolean(ping?.ok), env: c.env.APP_ENV || 'unknown', timestamp: nowISO() });
});

app.get('/api/search', async (c) => {
  const q = (c.req.query('q') || '').trim();
  const tag = (c.req.query('tag') || '').trim();
  const source = (c.req.query('source') || '').trim();
  const type = (c.req.query('type') || '').trim();
  const from = (c.req.query('from') || '').trim();
  const to = (c.req.query('to') || '').trim();
  const pageSize = toInt(c.req.query('pageSize'), 20, 1, 100);

  if (!q) {
    return c.json({ items: [], query: { q, tag, source, type, from, to }, pageSize });
  }

  const rows = await c.env.DB.prepare(
    `SELECT p.slug AS id, 'doc' AS type, p.title, p.intro AS snippet, p.updatedAt AS occurredAt
     FROM pages p
     WHERE (p.slug LIKE ? OR p.title LIKE ? OR p.intro LIKE ?)
       AND (? = '' OR p.slug IN (
         SELECT dt.doc_id
         FROM api_doc_tags dt
         JOIN api_tags t ON t.id = dt.tag_id
         WHERE t.name = ?
       ))
       AND (? = '' OR p.slug LIKE ?)
       AND (? = '' OR p.updatedAt >= ?)
       AND (? = '' OR p.updatedAt <= ?)
       AND (? = '' OR ? = 'doc')
     ORDER BY p.updatedAt DESC, p.slug ASC
     LIMIT ?`
  )
    .bind(like(q), like(q), like(q), tag, tag, source, like(source), from, from, to, to, type, type, pageSize)
    .all();

  return c.json({
    items: rows.results || [],
    query: { q, tag, source, type, from, to },
    pageSize
  });
});

app.get('/api/docs', async (c) => {
  const page = toInt(c.req.query('page'), 1, 1, 9999);
  const pageSize = toInt(c.req.query('pageSize'), 20, 1, 100);
  const offset = (page - 1) * pageSize;
  const tag = (c.req.query('tag') || '').trim();
  const source = (c.req.query('source') || '').trim();
  const from = (c.req.query('from') || '').trim();
  const to = (c.req.query('to') || '').trim();

  const items = await c.env.DB.prepare(
    `SELECT p.slug AS id, p.slug, p.title, p.intro, p.canonicalPath, p.updatedAt
     FROM pages p
     WHERE (? = '' OR p.slug IN (
       SELECT dt.doc_id
       FROM api_doc_tags dt
       JOIN api_tags t ON t.id = dt.tag_id
       WHERE t.name = ?
     ))
       AND (? = '' OR p.slug LIKE ?)
       AND (? = '' OR p.updatedAt >= ?)
       AND (? = '' OR p.updatedAt <= ?)
     ORDER BY p.updatedAt DESC, p.slug ASC
     LIMIT ? OFFSET ?`
  )
    .bind(tag, tag, source, like(source), from, from, to, to, pageSize, offset)
    .all();

  const count = await c.env.DB.prepare(
    `SELECT COUNT(*) AS total
     FROM pages p
     WHERE (? = '' OR p.slug IN (
       SELECT dt.doc_id
       FROM api_doc_tags dt
       JOIN api_tags t ON t.id = dt.tag_id
       WHERE t.name = ?
     ))
       AND (? = '' OR p.slug LIKE ?)
       AND (? = '' OR p.updatedAt >= ?)
       AND (? = '' OR p.updatedAt <= ?)`
  )
    .bind(tag, tag, source, like(source), from, from, to, to)
    .first<{ total: number }>();

  return c.json({
    items: items.results || [],
    pagination: {
      page,
      pageSize,
      total: Number(count?.total || 0)
    },
    filters: { tag, source, from, to }
  });
});

app.get('/api/docs/:id', async (c) => {
  const id = c.req.param('id');
  const doc = await c.env.DB.prepare('SELECT * FROM pages WHERE slug = ?').bind(id).first();
  if (!doc) return c.json({ error: 'Document not found' }, 404);

  const tags = await c.env.DB.prepare(
    `SELECT t.id, t.name
     FROM api_doc_tags dt
     JOIN api_tags t ON t.id = dt.tag_id
     WHERE dt.doc_id = ?
     ORDER BY t.name ASC`
  )
    .bind(id)
    .all();

  return c.json({ item: doc, tags: tags.results || [] });
});

app.get('/api/render/:id', async (c) => {
  const id = c.req.param('id');
  const doc = await c.env.DB.prepare('SELECT slug, title, intro, bodyMarkdown, canonicalPath FROM pages WHERE slug = ?')
    .bind(id)
    .first<any>();

  if (!doc) return c.json({ error: 'Document not found' }, 404);

  const markdown = [
    `# ${doc.title || doc.slug}`,
    '',
    doc.intro || '',
    '',
    doc.bodyMarkdown || '',
    '',
    `Canonical Path: ${doc.canonicalPath || '/'}`
  ]
    .join('\n')
    .trim();

  return new Response(markdown, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=120'
    }
  });
});

app.get('/api/entities/:type', async (c) => {
  const type = c.req.param('type');
  const config = ENTITY_MAP[type];
  if (!config) return c.json({ error: 'Unsupported entity type' }, 400);

  const limit = toInt(c.req.query('limit'), 20, 1, 100);
  const offset = toInt(c.req.query('offset'), 0, 0, 5000);

  const rows = await c.env.DB.prepare(`SELECT * FROM ${config.table} ORDER BY ${config.idField} DESC LIMIT ? OFFSET ?`)
    .bind(limit, offset)
    .all();

  return c.json({ type, items: rows.results || [], limit, offset });
});

app.get('/api/entities/:type/:id', async (c) => {
  const type = c.req.param('type');
  const id = c.req.param('id');
  const config = ENTITY_MAP[type];
  if (!config) return c.json({ error: 'Unsupported entity type' }, 400);

  const row = await c.env.DB.prepare(`SELECT * FROM ${config.table} WHERE ${config.idField} = ?`).bind(id).first();
  if (!row) return c.json({ error: 'Entity not found' }, 404);

  return c.json({ type, item: row });
});

app.get('/api/relations', async (c) => {
  const entityId = (c.req.query('entityId') || '').trim();
  const rows = await c.env.DB.prepare(
    `SELECT dt.doc_id AS entityId, t.id AS tagId, t.name AS tag
     FROM api_doc_tags dt
     JOIN api_tags t ON t.id = dt.tag_id
     WHERE (? = '' OR dt.doc_id = ?)
     ORDER BY dt.doc_id ASC, t.name ASC`
  )
    .bind(entityId, entityId)
    .all();

  return c.json({ relations: rows.results || [], entityId: entityId || null });
});

app.get('/api/jobs', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT id, job_type, status, payload_json, created_at, updated_at FROM api_jobs ORDER BY id DESC LIMIT 200'
  ).all();

  return c.json({ items: rows.results || [] });
});

app.post('/api/jobs/reindex', async (c) => {
  const payload = await c.req.json().catch(() => ({}));
  const raw = typeof payload === 'object' && payload ? payload : {};
  const payloadJson = JSON.stringify(raw);

  const inserted = await c.env.DB.prepare(
    "INSERT INTO api_jobs(job_type, status, payload_json, created_at, updated_at) VALUES('content.reindex', 'queued', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
  )
    .bind(payloadJson)
    .run();

  return c.json({ ok: true, jobId: inserted.meta.last_row_id, status: 'queued' }, 201);
});

app.post('/api/tags/attach', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as TagAttachBody;
  const docId = (body.docId || '').trim();
  const tags = Array.from(new Set([...(body.tags || []), body.tag || ''].map((x) => x.trim()).filter(Boolean)));

  if (!docId || tags.length === 0) return c.json({ error: 'docId and tags are required' }, 400);

  const doc = await c.env.DB.prepare('SELECT slug FROM pages WHERE slug = ?').bind(docId).first();
  if (!doc) return c.json({ error: 'Document not found' }, 404);

  const attached: Array<{ tag: string; tagId: number }> = [];
  for (const tag of tags) {
    await c.env.DB.prepare('INSERT OR IGNORE INTO api_tags(name) VALUES(?)').bind(tag).run();
    const tagRow = await c.env.DB.prepare('SELECT id FROM api_tags WHERE name = ?').bind(tag).first<{ id: number }>();
    if (!tagRow) continue;

    await c.env.DB.prepare('INSERT OR IGNORE INTO api_doc_tags(doc_id, tag_id) VALUES(?, ?)').bind(docId, tagRow.id).run();
    attached.push({ tag, tagId: tagRow.id });
  }

  return c.json({ ok: true, docId, attached });
});

app.notFound((c) => {
  return c.json({ error: 'Not found', message: 'This Worker only serves /api/* endpoints.' }, 404);
});

export default app;
