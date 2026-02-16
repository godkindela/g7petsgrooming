# G7 Pets Grooming (Cloudflare Workers SSR)

A Cloudflare Workers SSR website for `g7pets.com.au` with SEO-ready pages, dynamic sitemap/robots, D1-backed gallery metadata, and R2-backed image storage.

## Stack

- Cloudflare Workers + Wrangler
- Hono (SSR HTML routing)
- D1 (gallery metadata)
- R2 (original and thumbnail images)

## Delivered Features

- SSR pages: `/`, `/services`, `/gallery`, `/pricing`, `/faq`, `/contact`
- SEO on each page: `title`, `meta description`, `canonical`, OpenGraph tags
- JSON-LD on each page (`ProfessionalService`)
- NAP + opening hours on homepage and contact page
- `GET /robots.txt` and `GET /sitemap.xml`
- Admin gallery CMS: upload/edit/delete with alt required
- Gallery filtering: `petType`, `beforeAfter`, `tag`; pagination and lazy-loading
- `/admin/*` protected by Cloudflare Access header, with token fallback login

## Project Structure

- `src/index.ts`: all Worker routes and SSR rendering
- `migrations/0001_init.sql`: D1 schema migration
- `wrangler.toml.example`: Cloudflare binding example

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create Wrangler config:

```bash
cp wrangler.toml.example wrangler.toml
```

3. Create D1 database and update `database_id` in `wrangler.toml`:

```bash
npx wrangler d1 create g7petsgrooming-db
```

4. Apply migration:

```bash
npx wrangler d1 migrations apply g7petsgrooming-db --local
npx wrangler d1 migrations apply g7petsgrooming-db --remote
```

5. Create R2 bucket(s):

```bash
npx wrangler r2 bucket create g7petsgrooming-gallery
npx wrangler r2 bucket create g7petsgrooming-gallery-preview
```

6. Set optional admin token fallback:

```bash
npx wrangler secret put ADMIN_TOKEN
```

7. Run locally:

```bash
npm run dev
```

## Deploy

```bash
npm run deploy
```

## Admin Access Setup

### Preferred: Cloudflare Access

1. In Cloudflare Zero Trust, create an Access Application for path `/admin/*`.
2. Allow only your admin identities (email/group).
3. Keep app auth middleware as-is; it trusts `cf-access-authenticated-user-email`.

### MVP fallback: token login

- Set `ADMIN_TOKEN` secret.
- Visit `/admin/login`, enter token.
- Session cookie allows access to `/admin/gallery`.

## Acceptance Verification

### SSR check

```bash
curl -s https://<your-domain>/ | head -n 60
curl -s https://<your-domain>/contact | head -n 80
```

Expected: complete text content visible in HTML source (not JS-only rendering).

### SEO endpoints

```bash
curl -s https://<your-domain>/robots.txt
curl -s https://<your-domain>/sitemap.xml
```

### Admin protection

```bash
curl -I https://<your-domain>/admin/gallery
```

Expected: `302` to `/admin/login` (or Access challenge), not public content.

### JSON-LD presence

```bash
curl -s https://<your-domain>/ | rg "application/ld\+json"
```

### Gallery filtering

```bash
curl -s "https://<your-domain>/gallery?petType=dog&beforeAfter=true&tag=style" | head -n 120
```

Expected: filtered gallery HTML with image cards.
