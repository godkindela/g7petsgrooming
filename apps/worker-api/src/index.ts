import { Hono } from 'hono';
import {
  applyFilters,
  paginate,
  quoteLike,
  rankRows,
  snippetOffsets,
  toFtsQuery,
  type RankedSearchRow,
  type SearchFilters,
  type SearchRow
} from './lib/search';
import { sanitizeMarkdown } from './lib/sanitize';

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

type ChatBody = {
  query?: string;
  topK?: number;
  filters?: SearchFilters;
};

type SearchParams = SearchFilters & {
  q: string;
  page: number;
  pageSize: number;
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

type RenderDoc = {
  slug: string;
  title: string;
  intro: string;
  bodyMarkdown: string;
  canonicalPath: string;
};

type AdminRole = 'staff' | 'editor' | 'admin';

type PublicBookingBody = {
  service_id?: number;
  slot_id?: number;
  client_name?: string;
  client_phone?: string;
  pet_name?: string;
  pet_breed?: string;
  notes?: string;
};

type SlotGenerateBody = {
  start_date?: string;
  end_date?: string;
  open_time?: string;
  close_time?: string;
  interval_min?: number;
  capacity?: number;
};

type SlotPatchBody = {
  is_open?: number;
  capacity?: number;
  start_at?: string;
  end_at?: string;
};

const app = new Hono<App>();
const RATE_BUCKET = new Map<string, { count: number; resetAt: number }>();

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
  c.header('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Role, X-User-Role');
  c.header('Access-Control-Max-Age', '86400');
  c.header('Vary', 'Origin');
}

function clientIp(c: any): string {
  return fallback(c.req.header('cf-connecting-ip'), fallback(c.req.header('x-forwarded-for'), 'anon'));
}

function rateLimit(c: any, scope: string, limit: number, windowMs: number): Response | null {
  const ip = clientIp(c);
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const record = RATE_BUCKET.get(key);

  if (!record || now > record.resetAt) {
    RATE_BUCKET.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (record.count >= limit) {
    return c.json(
      { error: 'Rate limit exceeded', retryAfterMs: Math.max(0, record.resetAt - now), scope },
      429,
      { 'Retry-After': String(Math.ceil((record.resetAt - now) / 1000)) }
    );
  }

  record.count += 1;

  if (RATE_BUCKET.size > 3000) {
    for (const [k, value] of RATE_BUCKET.entries()) {
      if (value.resetAt <= now) RATE_BUCKET.delete(k);
    }
  }

  return null;
}

function logEvent(event: string, data: Record<string, unknown>): void {
  console.log(JSON.stringify({ event, timestamp: nowISO(), ...data }));
}

function normalizeRole(raw: string | null | undefined): AdminRole | null {
  const role = fallback(raw).toLowerCase();
  if (role === 'admin' || role === 'editor' || role === 'staff') return role;
  return null;
}

function getAdminRole(c: any): AdminRole | null {
  const byHeader = normalizeRole(c.req.header('x-admin-role') || c.req.header('x-user-role'));
  if (byHeader) return byHeader;

  const auth = fallback(c.req.header('authorization'));
  if (auth.toLowerCase().startsWith('bearer ')) {
    return normalizeRole(auth.slice(7));
  }
  return null;
}

function hasRole(role: AdminRole | null, required: AdminRole): boolean {
  if (!role) return false;
  const level = { staff: 1, editor: 2, admin: 3 } as const;
  return level[role] >= level[required];
}

function melbourneDatePart(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const year = parts.find((x) => x.type === 'year')?.value || '1970';
  const month = parts.find((x) => x.type === 'month')?.value || '01';
  const day = parts.find((x) => x.type === 'day')?.value || '01';
  return `${year}-${month}-${day}`;
}

function plusDays(datePart: string, days: number): string {
  const dt = new Date(`${datePart}T00:00:00.000Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function timezoneOffsetMinutesForUtc(utcMs: number, timeZone: string): number {
  const tzName = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset'
  })
    .formatToParts(new Date(utcMs))
    .find((x) => x.type === 'timeZoneName')?.value;

  const match = (tzName || '').match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/i);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number.parseInt(match[2] || '0', 10);
  const mins = Number.parseInt(match[3] || '0', 10);
  return sign * (hours * 60 + mins);
}

function melbourneLocalToUtcIso(datePart: string, timePart: string): string {
  const [year, month, day] = datePart.split('-').map((x) => Number.parseInt(x, 10));
  const [hour, minute] = timePart.split(':').map((x) => Number.parseInt(x, 10));
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

  for (let i = 0; i < 3; i += 1) {
    const offsetMinutes = timezoneOffsetMinutesForUtc(utcMs, 'Australia/Melbourne');
    utcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0) - offsetMinutes * 60_000;
  }

  return new Date(utcMs).toISOString();
}

function melbourneDayRangeUtc(datePart: string): { start: string; end: string } {
  const start = melbourneLocalToUtcIso(datePart, '00:00');
  const end = melbourneLocalToUtcIso(plusDays(datePart, 1), '00:00');
  return { start, end };
}

function formatMelbourne(isoUtc: string): string {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(isoUtc));
}

async function runWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= maxRetries; i += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const message = String((error as Error)?.message || '');
      if (!message.includes('SQLITE_BUSY') || i === maxRetries) break;
      await new Promise((resolve) => setTimeout(resolve, 25 * (i + 1)));
    }
  }
  throw lastError;
}

function canonicalSearchRequest(c: any, params: SearchParams): Request {
  const url = new URL(c.req.url);
  const qp = new URLSearchParams();

  qp.set('q', params.q);
  qp.set('tag', params.tag || '');
  qp.set('source', params.source || '');
  qp.set('type', params.type || '');
  qp.set('from', params.from || '');
  qp.set('to', params.to || '');
  qp.set('page', String(params.page));
  qp.set('pageSize', String(params.pageSize));

  url.pathname = '/api/search';
  url.search = qp.toString();

  return new Request(url.toString(), { method: 'GET' });
}

function canonicalRenderRequest(c: any, id: string): Request {
  const url = new URL(c.req.url);
  url.pathname = `/api/render/${encodeURIComponent(id)}`;
  url.search = '';
  return new Request(url.toString(), { method: 'GET' });
}

async function edgeCache(): Promise<Cache> {
  return caches.open('g7-edge-cache');
}

async function fetchDocTags(env: Env, docIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (docIds.length === 0) return map;

  const placeholders = docIds.map(() => '?').join(',');
  const rows = await env.DB.prepare(
    `SELECT dt.doc_id AS docId, t.name AS tag
     FROM api_doc_tags dt
     JOIN api_tags t ON t.id = dt.tag_id
     WHERE dt.doc_id IN (${placeholders})`
  )
    .bind(...docIds)
    .all<{ docId: string; tag: string }>();

  for (const row of rows.results || []) {
    const current = map.get(row.docId) || [];
    current.push(row.tag);
    map.set(row.docId, current);
  }

  return map;
}

async function querySearchCandidates(env: Env, q: string, filters: SearchFilters): Promise<SearchRow[]> {
  const like = quoteLike(q);
  const fts = toFtsQuery(q);
  const from = fallback(filters.from);
  const to = fallback(filters.to);
  const source = fallback(filters.source).toLowerCase();

  const fallbackQuery = async () => {
    const rows = await env.DB.prepare(
      `SELECT p.slug AS id, 'doc' AS type, p.title, p.intro AS snippet, p.bodyMarkdown AS body,
              p.updatedAt AS occurredAt, p.slug AS source
       FROM pages p
       WHERE (? = '' OR p.updatedAt >= ?)
         AND (? = '' OR p.updatedAt <= ?)
         AND (? = '' OR lower(p.slug) LIKE ?)
         AND (
           ? = '' OR lower(p.slug) = lower(?) OR lower(p.slug) LIKE ? OR lower(p.title) LIKE ? OR
           lower(p.intro) LIKE ? OR lower(p.bodyMarkdown) LIKE ?
         )
       ORDER BY p.updatedAt DESC, p.slug ASC
       LIMIT 500`
    )
      .bind(from, from, to, to, source, quoteLike(source), q, q, like, like, like, like)
      .all<SearchRow>();
    return rows.results || [];
  };

  if (!q) {
    return fallbackQuery();
  }

  if (!fts) {
    return fallbackQuery();
  }

  try {
    const rows = await env.DB.prepare(
      `SELECT p.slug AS id, 'doc' AS type, p.title, p.intro AS snippet, p.bodyMarkdown AS body,
              p.updatedAt AS occurredAt, p.slug AS source
       FROM pages p
       LEFT JOIN pages_fts pf ON pf.slug = p.slug
       WHERE (? = '' OR p.updatedAt >= ?)
         AND (? = '' OR p.updatedAt <= ?)
         AND (? = '' OR lower(p.slug) LIKE ?)
         AND (
           lower(p.slug) = lower(?) OR lower(p.slug) LIKE ? OR lower(p.title) LIKE ? OR
           lower(p.intro) LIKE ? OR lower(p.bodyMarkdown) LIKE ? OR pf.pages_fts MATCH ?
         )
       ORDER BY p.updatedAt DESC, p.slug ASC
       LIMIT 500`
    )
      .bind(from, from, to, to, source, quoteLike(source), q, like, like, like, like, fts)
      .all<SearchRow>();

    return rows.results || [];
  } catch {
    return fallbackQuery();
  }
}

async function runSearch(env: Env, params: SearchParams): Promise<{
  items: RankedSearchRow[];
  total: number;
  filters: SearchFilters;
  query: string;
  page: number;
  pageSize: number;
  latencyMs: number;
}> {
  const started = Date.now();
  const candidates = await querySearchCandidates(env, params.q, params);
  const tagMap = await fetchDocTags(
    env,
    Array.from(new Set(candidates.map((row) => row.id))).filter(Boolean)
  );

  const enriched = candidates.map((row) => ({
    ...row,
    tags: tagMap.get(row.id) || []
  }));

  const filtered = applyFilters(enriched, params);
  const ranked = rankRows(params.q, filtered);
  const matched = params.q ? ranked.filter((row) => row.ranking.total > 0) : ranked;
  const paged = paginate(matched, params.page, params.pageSize);

  return {
    items: paged.items,
    total: paged.total,
    filters: {
      tag: params.tag || '',
      source: params.source || '',
      type: params.type || '',
      from: params.from || '',
      to: params.to || ''
    },
    query: params.q,
    page: params.page,
    pageSize: params.pageSize,
    latencyMs: Date.now() - started
  };
}

async function enqueueReindexJob(env: Env, payload: Record<string, unknown>): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO api_jobs(job_type, status, payload_json, created_at, updated_at) VALUES('content.reindex', 'queued', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
  )
    .bind(JSON.stringify(payload))
    .run();
}

async function rebuildSearchIndex(env: Env): Promise<void> {
  await env.DB.prepare('DELETE FROM pages_fts').run();
  await env.DB.prepare('INSERT INTO pages_fts (slug, title, intro, body) SELECT slug, title, intro, bodyMarkdown FROM pages').run();
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

app.use('/api/search', async (c, next) => {
  const blocked = rateLimit(c, 'search', 60, 60_000);
  if (blocked) return blocked;
  await next();
});

app.use('/api/chat', async (c, next) => {
  const blocked = rateLimit(c, 'chat', 30, 60_000);
  if (blocked) return blocked;
  await next();
});

app.use('/api/admin/*', async (c, next) => {
  const role = getAdminRole(c);
  if (!role) return c.json({ error: 'Unauthorized' }, 401);
  await next();
});

app.use('/api/gallery/upload', async (c, next) => {
  if (!hasRole(getAdminRole(c), 'staff')) return c.json({ error: 'Forbidden' }, 403);
  await next();
});

app.use('/api/gallery/update/*', async (c, next) => {
  if (!hasRole(getAdminRole(c), 'staff')) return c.json({ error: 'Forbidden' }, 403);
  await next();
});

app.use('/api/gallery/delete/*', async (c, next) => {
  if (!hasRole(getAdminRole(c), 'staff')) return c.json({ error: 'Forbidden' }, 403);
  await next();
});

app.get('/api/health', async (c) => {
  const ping = await c.env.DB.prepare('SELECT 1 AS ok').first<{ ok: number }>();
  return c.json({ ok: Boolean(ping?.ok), env: c.env.APP_ENV || 'unknown', timestamp: nowISO() });
});

app.get('/api/public/services', async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT id, name, duration_min, price_cents
     FROM services
     WHERE is_active = 1
     ORDER BY sort_order ASC, id ASC`
  ).all();

  return c.json({ items: rows.results || [] });
});

app.get('/api/public/slots', async (c) => {
  const date = fallback(c.req.query('date'));
  const serviceId = toInt(c.req.query('service_id'), 0, 0, 9999999);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return c.json({ error: 'date must be YYYY-MM-DD' }, 400);
  if (!serviceId) return c.json({ error: 'service_id is required' }, 400);

  const day = melbourneDayRangeUtc(date);
  const rows = await c.env.DB.prepare(
    `SELECT id, start_at, end_at, capacity, booked_count, is_open, service_id
     FROM slots
     WHERE start_at >= ?
       AND start_at < ?
       AND is_open = 1
       AND booked_count < capacity
       AND (service_id IS NULL OR service_id = ?)
     ORDER BY start_at ASC`
  )
    .bind(day.start, day.end, serviceId)
    .all();

  return c.json({ items: rows.results || [] });
});

app.post('/api/public/bookings', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as PublicBookingBody;
  const serviceId = Number(body.service_id || 0);
  const slotId = Number(body.slot_id || 0);
  const clientName = fallback(body.client_name);
  const clientPhone = fallback(body.client_phone);
  const petName = fallback(body.pet_name);
  const petBreed = fallback(body.pet_breed);
  const notes = fallback(body.notes);

  if (!serviceId || !slotId || !clientName || !clientPhone) {
    return c.json({ error: 'service_id, slot_id, client_name, client_phone are required' }, 400);
  }

  const service = await c.env.DB.prepare(
    'SELECT id, name FROM services WHERE id = ? AND is_active = 1'
  ).bind(serviceId).first<{ id: number; name: string }>();
  if (!service) return c.json({ error: 'Service unavailable' }, 400);

  const slot = await c.env.DB.prepare(
    'SELECT id, start_at, end_at, service_id FROM slots WHERE id = ?'
  ).bind(slotId).first<{ id: number; start_at: string; end_at: string; service_id: number | null }>();
  if (!slot) return c.json({ error: 'Slot not found' }, 404);
  if (slot.service_id !== null && slot.service_id !== serviceId) return c.json({ error: 'Slot not valid for this service' }, 400);

  const updated = await c.env.DB.prepare(
    `UPDATE slots
     SET booked_count = booked_count + 1
     WHERE id = ? AND is_open = 1 AND booked_count < capacity`
  ).bind(slotId).run();

  if ((updated.meta.changes || 0) === 0) {
    return c.json({ error: 'Slot full or closed' }, 409);
  }

  try {
    const createdAt = nowISO();
    const inserted = await c.env.DB.prepare(
      `INSERT INTO bookings(slot_id, service_id, status, client_name, client_phone, pet_name, pet_breed, notes, created_at)
       VALUES(?, ?, 'pending', ?, ?, ?, ?, ?, ?)`
    )
      .bind(slotId, serviceId, clientName, clientPhone, petName || null, petBreed || null, notes || null, createdAt)
      .run();

    const bookingId = Number(inserted.meta.last_row_id || 0);
    await c.env.DB.prepare(
      `INSERT INTO booking_events(booking_id, event, at, meta_json)
       VALUES(?, 'created', ?, ?)`
    )
      .bind(bookingId, createdAt, JSON.stringify({ service_id: serviceId, slot_id: slotId }))
      .run();

    return c.json({
      id: bookingId,
      status: 'pending',
      start_at: slot.start_at,
      end_at: slot.end_at,
      service_name: service.name
    }, 201);
  } catch (error) {
    await c.env.DB.prepare('UPDATE slots SET booked_count = MAX(booked_count - 1, 0) WHERE id = ?').bind(slotId).run();
    throw error;
  }
});

app.get('/api/admin/bookings', async (c) => {
  const role = getAdminRole(c);
  if (!hasRole(role, 'staff')) return c.json({ error: 'Forbidden' }, 403);

  const date = fallback(c.req.query('date'), melbourneDatePart(new Date()));
  const status = fallback(c.req.query('status'));
  const q = fallback(c.req.query('q')).toLowerCase();
  const day = melbourneDayRangeUtc(date);

  const rows = await c.env.DB.prepare(
    `SELECT b.id AS booking_id, b.status, b.client_name, b.client_phone, b.created_at,
            s.start_at, s.end_at, svc.name AS service_name
     FROM bookings b
     JOIN slots s ON s.id = b.slot_id
     JOIN services svc ON svc.id = b.service_id
     WHERE s.start_at >= ? AND s.start_at < ?
       AND (? = '' OR b.status = ?)
       AND (? = '' OR lower(b.client_name) LIKE ? OR lower(b.client_phone) LIKE ?)
     ORDER BY s.start_at ASC, b.id DESC`
  )
    .bind(day.start, day.end, status, status, q, `%${q}%`, `%${q}%`)
    .all();

  return c.json({ items: rows.results || [], filters: { date, status, q } });
});

app.get('/api/admin/bookings/:id', async (c) => {
  const role = getAdminRole(c);
  if (!hasRole(role, 'staff')) return c.json({ error: 'Forbidden' }, 403);
  const id = Number(c.req.param('id'));

  const booking = await c.env.DB.prepare(
    `SELECT b.*, s.start_at, s.end_at, s.capacity, s.booked_count, svc.name AS service_name, svc.duration_min
     FROM bookings b
     JOIN slots s ON s.id = b.slot_id
     JOIN services svc ON svc.id = b.service_id
     WHERE b.id = ?`
  ).bind(id).first();
  if (!booking) return c.json({ error: 'Booking not found' }, 404);

  const events = await c.env.DB.prepare(
    'SELECT id, event, at, meta_json FROM booking_events WHERE booking_id = ? ORDER BY at ASC, id ASC'
  ).bind(id).all();

  return c.json({ item: booking, events: events.results || [] });
});

app.post('/api/admin/bookings/:id/confirm', async (c) => {
  const role = getAdminRole(c);
  if (!hasRole(role, 'editor')) return c.json({ error: 'Forbidden' }, 403);
  const id = Number(c.req.param('id'));
  const at = nowISO();

  const updated = await c.env.DB.prepare(
    "UPDATE bookings SET status = 'confirmed' WHERE id = ? AND status = 'pending'"
  ).bind(id).run();
  if ((updated.meta.changes || 0) === 0) return c.json({ error: 'Booking not in pending state' }, 409);

  await c.env.DB.prepare(
    "INSERT INTO booking_events(booking_id, event, at, meta_json) VALUES(?, 'confirmed', ?, ?)"
  ).bind(id, at, JSON.stringify({ byRole: role })).run();

  return c.json({ ok: true, id, status: 'confirmed' });
});

app.post('/api/admin/bookings/:id/cancel', async (c) => {
  const role = getAdminRole(c);
  if (!hasRole(role, 'editor')) return c.json({ error: 'Forbidden' }, 403);
  const id = Number(c.req.param('id'));
  const at = nowISO();

  const row = await c.env.DB.prepare('SELECT slot_id, status FROM bookings WHERE id = ?')
    .bind(id)
    .first<{ slot_id: number; status: string }>();
  if (!row) return c.json({ error: 'Booking not found' }, 404);
  if (row.status === 'cancelled') return c.json({ ok: true, id, status: 'cancelled' });
  if (row.status === 'completed') return c.json({ error: 'Completed booking cannot be cancelled' }, 409);

  const updated = await c.env.DB.prepare(
    "UPDATE bookings SET status = 'cancelled' WHERE id = ? AND status IN ('pending','confirmed')"
  ).bind(id).run();
  if ((updated.meta.changes || 0) === 0) return c.json({ error: 'Booking cannot be cancelled' }, 409);

  await c.env.DB.prepare('UPDATE slots SET booked_count = MAX(booked_count - 1, 0) WHERE id = ?').bind(row.slot_id).run();
  await c.env.DB.prepare(
    "INSERT INTO booking_events(booking_id, event, at, meta_json) VALUES(?, 'cancelled', ?, ?)"
  ).bind(id, at, JSON.stringify({ byRole: role })).run();

  return c.json({ ok: true, id, status: 'cancelled' });
});

app.post('/api/admin/bookings/:id/complete', async (c) => {
  const role = getAdminRole(c);
  if (!hasRole(role, 'editor')) return c.json({ error: 'Forbidden' }, 403);
  const id = Number(c.req.param('id'));
  const at = nowISO();

  const updated = await c.env.DB.prepare(
    "UPDATE bookings SET status = 'completed' WHERE id = ? AND status = 'confirmed'"
  ).bind(id).run();
  if ((updated.meta.changes || 0) === 0) return c.json({ error: 'Booking must be confirmed first' }, 409);

  await c.env.DB.prepare(
    "INSERT INTO booking_events(booking_id, event, at, meta_json) VALUES(?, 'completed', ?, ?)"
  ).bind(id, at, JSON.stringify({ byRole: role })).run();

  return c.json({ ok: true, id, status: 'completed' });
});

app.post('/api/admin/slots/generate', async (c) => {
  const role = getAdminRole(c);
  if (!hasRole(role, 'staff')) return c.json({ error: 'Forbidden' }, 403);
  const body = (await c.req.json().catch(() => ({}))) as SlotGenerateBody;

  const today = melbourneDatePart(new Date());
  const startDate = fallback(body.start_date, today);
  const endDate = fallback(body.end_date, plusDays(startDate, 13));
  const openTime = fallback(body.open_time, '09:00');
  const closeTime = fallback(body.close_time, '17:00');
  const intervalMin = Math.max(5, Number(body.interval_min || 30));
  const capacity = Math.max(1, Number(body.capacity || 1));

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return c.json({ error: 'start_date and end_date must be YYYY-MM-DD' }, 400);
  }
  if (!/^\d{2}:\d{2}$/.test(openTime) || !/^\d{2}:\d{2}$/.test(closeTime)) {
    return c.json({ error: 'open_time and close_time must be HH:MM' }, 400);
  }

  const [openHour, openMinute] = openTime.split(':').map((x) => Number.parseInt(x, 10));
  const [closeHour, closeMinute] = closeTime.split(':').map((x) => Number.parseInt(x, 10));
  const closeTotal = closeHour * 60 + closeMinute;
  let inserted = 0;

  for (let date = startDate; date <= endDate; date = plusDays(date, 1)) {
    for (let cursor = openHour * 60 + openMinute; cursor + intervalMin <= closeTotal; cursor += intervalMin) {
      const startH = String(Math.floor(cursor / 60)).padStart(2, '0');
      const startM = String(cursor % 60).padStart(2, '0');
      const endCursor = cursor + intervalMin;
      const endH = String(Math.floor(endCursor / 60)).padStart(2, '0');
      const endM = String(endCursor % 60).padStart(2, '0');

      const startAt = melbourneLocalToUtcIso(date, `${startH}:${startM}`);
      const endAt = melbourneLocalToUtcIso(date, `${endH}:${endM}`);
      const result = await runWithRetry(() =>
        c.env.DB.prepare(
          `INSERT OR IGNORE INTO slots(start_at, end_at, capacity, booked_count, is_open, service_id)
           VALUES(?, ?, ?, 0, 1, NULL)`
        )
          .bind(startAt, endAt, capacity)
          .run()
      );
      inserted += Number(result.meta.changes || 0);
    }
  }

  return c.json({ ok: true, inserted, range: { start_date: startDate, end_date: endDate } });
});

app.put('/api/admin/slots/:id', async (c) => {
  const role = getAdminRole(c);
  if (!hasRole(role, 'staff')) return c.json({ error: 'Forbidden' }, 403);
  const id = Number(c.req.param('id'));
  const body = (await c.req.json().catch(() => ({}))) as SlotPatchBody;

  const existing = await c.env.DB.prepare('SELECT * FROM slots WHERE id = ?').bind(id).first<any>();
  if (!existing) return c.json({ error: 'Slot not found' }, 404);

  const isOpen = typeof body.is_open === 'number' ? (body.is_open ? 1 : 0) : Number(existing.is_open || 1);
  const capacity = typeof body.capacity === 'number' ? Math.max(1, Number(body.capacity)) : Number(existing.capacity || 1);
  const startAt = fallback(body.start_at, String(existing.start_at));
  const endAt = fallback(body.end_at, String(existing.end_at));

  await c.env.DB.prepare(
    'UPDATE slots SET is_open = ?, capacity = ?, start_at = ?, end_at = ? WHERE id = ?'
  ).bind(isOpen, capacity, startAt, endAt, id).run();

  return c.json({ ok: true, id, is_open: isOpen, capacity, start_at: startAt, end_at: endAt });
});

app.get('/api/admin/slots', async (c) => {
  const role = getAdminRole(c);
  if (!hasRole(role, 'staff')) return c.json({ error: 'Forbidden' }, 403);
  const date = fallback(c.req.query('date'), melbourneDatePart(new Date()));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return c.json({ error: 'date must be YYYY-MM-DD' }, 400);

  const day = melbourneDayRangeUtc(date);
  const rows = await c.env.DB.prepare(
    `SELECT id, start_at, end_at, capacity, booked_count, is_open, service_id
     FROM slots
     WHERE start_at >= ? AND start_at < ?
     ORDER BY start_at ASC`
  )
    .bind(day.start, day.end)
    .all();

  return c.json({ items: rows.results || [], date });
});

app.get('/api/search', async (c) => {
  const params: SearchParams = {
    q: fallback(c.req.query('q')),
    tag: fallback(c.req.query('tag')),
    source: fallback(c.req.query('source')),
    type: fallback(c.req.query('type')),
    from: fallback(c.req.query('from')),
    to: fallback(c.req.query('to')),
    page: toInt(c.req.query('page'), 1, 1, 9999),
    pageSize: toInt(c.req.query('pageSize'), 20, 1, 100)
  };

  const started = Date.now();
  const cacheRequest = canonicalSearchRequest(c, params);
  const cache = await edgeCache();
  const cached = await cache.match(cacheRequest);

  if (cached) {
    logEvent('api.search', {
      cache: 'hit',
      q: params.q,
      filters: params,
      latencyMs: Date.now() - started
    });

    const headers = new Headers(cached.headers);
    headers.set('X-Cache', 'HIT');
    return new Response(cached.body, { status: cached.status, headers });
  }

  const result = await runSearch(c.env, params);
  const body = {
    items: result.items,
    query: {
      q: result.query,
      ...result.filters
    },
    pagination: {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total
    },
    trace: {
      latencyMs: result.latencyMs,
      cache: 'miss'
    }
  };

  const response = new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      'X-Cache': 'MISS'
    }
  });

  c.executionCtx.waitUntil(cache.put(cacheRequest, response.clone()));

  logEvent('api.search', {
    cache: 'miss',
    q: params.q,
    filters: params,
    latencyMs: Date.now() - started,
    resultCount: result.total
  });

  return response;
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
    .bind(tag, tag, source, `%${source}%`, from, from, to, to, pageSize, offset)
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
    .bind(tag, tag, source, `%${source}%`, from, from, to, to)
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
  const started = Date.now();
  const cacheRequest = canonicalRenderRequest(c, id);
  const cache = await edgeCache();
  const edgeCached = await cache.match(cacheRequest);

  if (edgeCached) {
    logEvent('api.render', { id, cache: 'edge-hit', latencyMs: Date.now() - started });
    const headers = new Headers(edgeCached.headers);
    headers.set('X-Cache', 'EDGE-HIT');
    return new Response(edgeCached.body, { status: edgeCached.status, headers });
  }

  const renderCacheKey = `render-cache/${id}.md`;
  const bucketCached = await c.env.GALLERY_BUCKET.get(renderCacheKey);
  if (bucketCached) {
    const text = await bucketCached.text();
    const response = new Response(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'X-Cache': 'R2-HIT'
      }
    });

    c.executionCtx.waitUntil(cache.put(cacheRequest, response.clone()));
    logEvent('api.render', { id, cache: 'r2-hit', latencyMs: Date.now() - started });
    return response;
  }

  const doc = await c.env.DB.prepare('SELECT slug, title, intro, bodyMarkdown, canonicalPath FROM pages WHERE slug = ?')
    .bind(id)
    .first<RenderDoc>();

  if (!doc) return c.json({ error: 'Document not found' }, 404);

  const markdown = sanitizeMarkdown(
    [
      `# ${doc.title || doc.slug}`,
      '',
      doc.intro || '',
      '',
      doc.bodyMarkdown || '',
      '',
      `Canonical Path: ${doc.canonicalPath || '/'}`
    ]
      .join('\n')
      .trim()
  );

  const response = new Response(markdown, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'X-Cache': 'MISS'
    }
  });

  c.executionCtx.waitUntil(
    Promise.all([
      cache.put(cacheRequest, response.clone()),
      c.env.GALLERY_BUCKET.put(renderCacheKey, markdown, {
        httpMetadata: { contentType: 'text/markdown; charset=utf-8' }
      })
    ])
  );

  logEvent('api.render', { id, cache: 'miss', latencyMs: Date.now() - started });
  return response;
});

app.post('/api/chat', async (c) => {
  const started = Date.now();
  const body = (await c.req.json().catch(() => ({}))) as ChatBody;
  const query = fallback(body.query);
  const topK = toInt(String(body.topK || '5'), 5, 1, 10);
  const filters = body.filters || {};

  if (!query) return c.json({ error: 'query is required' }, 400);

  const searchResult = await runSearch(c.env, {
    q: query,
    tag: fallback(filters.tag),
    source: fallback(filters.source),
    type: fallback(filters.type || 'doc'),
    from: fallback(filters.from),
    to: fallback(filters.to),
    page: 1,
    pageSize: topK
  });

  const topItems = searchResult.items.slice(0, topK);
  const citations = topItems.map((item) => {
    const offsets = snippetOffsets(item.snippet || item.body || '', query);
    return {
      docId: item.id,
      start: offsets.start,
      end: offsets.end,
      snippet: (item.snippet || '').slice(0, 240)
    };
  });

  const answer =
    topItems.length === 0
      ? 'No relevant documents were found in the current knowledge base.'
      : topItems
          .map((item, idx) => `${idx + 1}. ${item.title} (${item.id})\n${(item.snippet || '').slice(0, 180)}`)
          .join('\n\n');

  const latencyMs = Date.now() - started;

  logEvent('api.chat', {
    q: query,
    filters,
    topK,
    latencyMs,
    retrievalLatencyMs: searchResult.latencyMs,
    citations: citations.length
  });

  return c.json({
    answer,
    citations,
    trace: {
      query,
      filters,
      topK,
      latencyMs,
      retrievalLatencyMs: searchResult.latencyMs
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
  const runNow = Boolean((raw as { runNow?: boolean }).runNow);
  const payloadJson = JSON.stringify(raw);

  const inserted = await c.env.DB.prepare(
    "INSERT INTO api_jobs(job_type, status, payload_json, created_at, updated_at) VALUES('content.reindex', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
  )
    .bind(runNow ? 'running' : 'queued', payloadJson)
    .run();

  if (runNow) {
    await rebuildSearchIndex(c.env);
    await c.env.DB.prepare("UPDATE api_jobs SET status = 'done', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(inserted.meta.last_row_id)
      .run();
  }

  return c.json({ ok: true, jobId: inserted.meta.last_row_id, status: runNow ? 'done' : 'queued' }, 201);
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

  await enqueueReindexJob(c.env, { source: 'api.tags.attach', docId, tags });

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

  await enqueueReindexJob(c.env, { source: 'api.gallery.upload', imageId: inserted.meta.last_row_id });

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

  await enqueueReindexJob(c.env, { source: 'api.gallery.update', imageId: Number(id) });

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
  await enqueueReindexJob(c.env, { source: 'api.gallery.delete', imageId: Number(id) });
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
