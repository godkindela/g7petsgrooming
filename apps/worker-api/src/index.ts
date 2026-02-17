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

type GalleryRow = {
  id: number;
  r2Key?: string;
  r2_key?: string;
  thumbKey?: string;
  thumb_key?: string;
  title_en?: string;
  title_zh?: string;
  alt_en?: string;
  alt_zh?: string;
  title?: string;
  alt?: string;
  tags_json?: string;
  tagsJSON?: string;
  pet_type?: string;
  petType?: string;
  before_after?: number;
  beforeAfter?: number;
  featured?: number;
  is_published?: number;
  created_at?: string;
  createdAt?: string;
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

function fallback(value: string | undefined | null, fallbackValue = ''): string {
  const v = (value || '').trim();
  return v || fallbackValue;
}

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function safeTagsJSON(raw: string | undefined | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === 'string');
  } catch {
    return [];
  }
  return [];
}

function boolNumFromForm(value: FormDataEntryValue | null): number {
  return value === '1' || value === 'true' || value === 'on' ? 1 : 0;
}

function extFromFile(file: File): string {
  const byType = (file.type || '').split('/')[1]?.toLowerCase();
  if (byType && /^[a-z0-9]+$/.test(byType)) return byType === 'jpeg' ? 'jpg' : byType;
  const byName = file.name.split('.').pop()?.toLowerCase();
  if (byName && /^[a-z0-9]+$/.test(byName)) return byName;
  return 'jpg';
}

function mediaKey(row: GalleryRow): string {
  return fallback(row.r2Key, fallback(row.r2_key));
}

function thumbKey(row: GalleryRow): string {
  return fallback(row.thumbKey, fallback(row.thumb_key));
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

app.get('/api/gallery/images', async (c) => {
  const published = c.req.query('published');
  const limit = toInt(c.req.query('limit'), 60, 1, 300);
  const offset = toInt(c.req.query('offset'), 0, 0, 5000);

  const sql =
    published === '1'
      ? `SELECT * FROM gallery_images WHERE COALESCE(is_published,1)=1 ORDER BY COALESCE(featured,0) DESC, COALESCE(created_at,createdAt) DESC, id DESC LIMIT ? OFFSET ?`
      : `SELECT * FROM gallery_images ORDER BY COALESCE(featured,0) DESC, COALESCE(created_at,createdAt) DESC, id DESC LIMIT ? OFFSET ?`;

  const rows = await c.env.DB.prepare(sql).bind(limit, offset).all<GalleryRow>();
  const origin = new URL(c.req.url).origin;
  const items = (rows.results || []).map((row) => {
    const tKey = thumbKey(row);
    const mKey = mediaKey(row);
    return {
      id: Number(row.id),
      title_en: fallback(row.title_en, fallback(row.title, 'Untitled')),
      title_zh: fallback(row.title_zh, fallback(row.title_en, fallback(row.title, 'Untitled'))),
      alt_en: fallback(row.alt_en, fallback(row.alt, '')),
      alt_zh: fallback(row.alt_zh, fallback(row.alt_en, fallback(row.alt, ''))),
      tags: safeTagsJSON(row.tags_json || row.tagsJSON),
      pet_type: fallback(row.pet_type, fallback(row.petType, 'pet')),
      before_after: Number(row.before_after ?? row.beforeAfter ?? 0),
      featured: Number(row.featured ?? 0),
      is_published: Number(row.is_published ?? 1),
      created_at: fallback(row.created_at, fallback(row.createdAt)),
      media_url: mKey ? `${origin}/api/media/${encodeURIComponent(mKey)}` : null,
      thumb_url: tKey ? `${origin}/api/thumb/${encodeURIComponent(tKey)}` : null,
      r2_key: mKey,
      thumb_key: tKey
    };
  });

  return c.json({ items, limit, offset });
});

app.post('/api/gallery/upload', async (c) => {
  const form = await c.req.formData();
  const image = form.get('image');
  if (!(image instanceof File) || image.size === 0) return c.json({ error: 'image is required' }, 400);

  const titleEn = fallback(form.get('title_en')?.toString(), 'Untitled');
  const titleZh = fallback(form.get('title_zh')?.toString(), titleEn);
  const altEn = fallback(form.get('alt_en')?.toString(), titleEn);
  const altZh = fallback(form.get('alt_zh')?.toString(), altEn);
  const tags = parseTags(fallback(form.get('tags')?.toString()));
  const petType = fallback(form.get('pet_type')?.toString(), 'pet');
  const beforeAfter = boolNumFromForm(form.get('before_after'));
  const featured = boolNumFromForm(form.get('featured'));
  const isPublished = boolNumFromForm(form.get('is_published'));

  const uid = crypto.randomUUID();
  const ext = extFromFile(image);
  const sourceKey = `gallery/original/${uid}.${ext}`;
  const thumbKeyValue = `gallery/thumb/${uid}.${ext}`;
  const bytes = await image.arrayBuffer();

  await c.env.GALLERY_BUCKET.put(sourceKey, bytes, { httpMetadata: { contentType: image.type || 'application/octet-stream' } });
  await c.env.GALLERY_BUCKET.put(thumbKeyValue, bytes, {
    httpMetadata: { contentType: image.type || 'application/octet-stream' }
  });

  const inserted = await c.env.DB.prepare(
    `INSERT INTO gallery_images
      (r2Key, thumbKey, title, alt, tagsJSON, petType, beforeAfter, featured, createdAt,
       title_en, title_zh, alt_en, alt_zh, tags_json, pet_type, before_after, is_published, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
  )
    .bind(
      sourceKey,
      thumbKeyValue,
      titleEn,
      altEn,
      JSON.stringify(tags),
      petType,
      String(beforeAfter),
      String(featured),
      titleEn,
      titleZh,
      altEn,
      altZh,
      JSON.stringify(tags),
      petType,
      String(beforeAfter),
      String(isPublished)
    )
    .run();

  return c.json({ ok: true, id: inserted.meta.last_row_id });
});

app.post('/api/gallery/update/:id', async (c) => {
  const id = c.req.param('id');
  const form = await c.req.formData();

  const titleEn = fallback(form.get('title_en')?.toString(), 'Untitled');
  const titleZh = fallback(form.get('title_zh')?.toString(), titleEn);
  const altEn = fallback(form.get('alt_en')?.toString(), titleEn);
  const altZh = fallback(form.get('alt_zh')?.toString(), altEn);
  const tags = parseTags(fallback(form.get('tags')?.toString()));
  const petType = fallback(form.get('pet_type')?.toString(), 'pet');
  const beforeAfter = boolNumFromForm(form.get('before_after'));
  const featured = boolNumFromForm(form.get('featured'));
  const isPublished = boolNumFromForm(form.get('is_published'));

  await c.env.DB.prepare(
    `UPDATE gallery_images
     SET title = ?, alt = ?, tagsJSON = ?, petType = ?, beforeAfter = ?, featured = ?,
         title_en = ?, title_zh = ?, alt_en = ?, alt_zh = ?, tags_json = ?, pet_type = ?, before_after = ?, is_published = ?
     WHERE id = ?`
  )
    .bind(
      titleEn,
      altEn,
      JSON.stringify(tags),
      petType,
      String(beforeAfter),
      String(featured),
      titleEn,
      titleZh,
      altEn,
      altZh,
      JSON.stringify(tags),
      petType,
      String(beforeAfter),
      String(isPublished),
      id
    )
    .run();

  return c.json({ ok: true, id: Number(id) });
});

app.post('/api/gallery/delete/:id', async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare('SELECT * FROM gallery_images WHERE id = ?').bind(id).first<GalleryRow>();
  if (row) {
    const mKey = mediaKey(row);
    const tKey = thumbKey(row);
    if (mKey) await c.env.GALLERY_BUCKET.delete(mKey);
    if (tKey) await c.env.GALLERY_BUCKET.delete(tKey);
  }
  await c.env.DB.prepare('DELETE FROM gallery_images WHERE id = ?').bind(id).run();
  return c.json({ ok: true, id: Number(id) });
});

app.get('/api/media/:key', async (c) => {
  const key = decodeURIComponent(c.req.param('key'));
  const object = await c.env.GALLERY_BUCKET.get(key);
  if (!object) return c.json({ error: 'Not found' }, 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(object.body, { status: 200, headers });
});

app.get('/api/thumb/:key', async (c) => {
  const key = decodeURIComponent(c.req.param('key'));
  const object = await c.env.GALLERY_BUCKET.get(key);
  if (!object) return c.json({ error: 'Not found' }, 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(object.body, { status: 200, headers });
});

app.notFound((c) => {
  return c.json({ error: 'Not found', message: 'This Worker only serves /api/* endpoints.' }, 404);
});

export default app;
