# g7pets.com.au Cloudflare Worker (HTML + Bilingual Markdown)

## Overview

This Worker serves:

- Browser users: SSR HTML
- AI/bot/markdown clients: bilingual Markdown (EN + 中文)

Supported routes:

- HTML: `/`, `/services`, `/gallery`, `/pricing`, `/faq`, `/contact`, `/ai`
- Markdown: `/index.md`, `/services.md`, `/gallery.md`, `/pricing.md`, `/faq.md`, `/contact.md`, `/ai.md`

## Output Negotiation

`detectPreferMarkdown()` returns Markdown when any condition matches:

1. URL ends with `.md`
2. query has `?format=md` or `?md=1`
3. `Accept` includes `text/markdown`
4. User-Agent matches configured bot list and `MD_FOR_BOTS=1`

Bot list (case-insensitive):

- Googlebot, Bingbot, DuckDuckBot, Applebot, YandexBot, Baiduspider
- GPTBot, ChatGPT-User, OpenAI, ClaudeBot, anthropic, PerplexityBot
- CCBot, Bytespider, Amazonbot, facebookexternalhit, twitterbot

## Required Headers

HTML responses:

- `Content-Type: text/html; charset=utf-8`
- `Cache-Control: public, max-age=300`
- `Vary: Accept, User-Agent`

Markdown responses:

- `Content-Type: text/markdown; charset=utf-8`
- `Cache-Control: public, max-age=600`
- `Vary: Accept, User-Agent`

## Data Source (D1)

All content reads from D1 tables:

- `pages`
- `services`
- `faq`
- `gallery_images`

The Worker supports bilingual columns and falls back to English when Chinese is missing.

## Setup

```bash
npm install
cp wrangler.toml.example wrangler.toml
```

Create D1 and apply migrations:

```bash
npx wrangler d1 create g7petsgrooming-db
npx wrangler d1 migrations apply g7petsgrooming-db --local
npx wrangler d1 migrations apply g7petsgrooming-db --remote
```

Create R2 bucket:

```bash
npx wrangler r2 bucket create g7petsgrooming-gallery
npx wrangler r2 bucket create g7petsgrooming-gallery-preview
```

Run local:

```bash
npm run dev
```

Deploy:

```bash
wrangler publish
```

## robots.txt

Generated from Worker route `/robots.txt`:

```txt
User-agent: *
Allow: /
Allow: /*.md
Disallow: /admin/
Sitemap: https://www.g7pets.com.au/sitemap.xml
```

## sitemap.xml

Generated from Worker route `/sitemap.xml` and includes:

- `/`
- `/services` `/services.md`
- `/gallery` `/gallery.md`
- `/pricing` `/pricing.md`
- `/faq` `/faq.md`
- `/contact` `/contact.md`
- `/ai` `/ai.md`

## Self-test Commands (curl)

```bash
# HTML
curl -I https://yourdomain/services

# Markdown by suffix
curl -I https://yourdomain/services.md

# Markdown by bot UA
curl -I -A "GPTBot" https://yourdomain/services

# Markdown by Accept
curl -I -H "Accept: text/markdown" https://yourdomain/services

# Markdown by query
curl -I "https://yourdomain/services?format=md"

# Vary header
curl -I https://yourdomain/services | rg -i '^vary:'

# robots
curl -s https://yourdomain/robots.txt

# sitemap
curl -s https://yourdomain/sitemap.xml

# ai aggregate markdown
curl -s https://yourdomain/ai.md | head -n 80
```

## Code Modules

Implemented as required:

- `detectPreferMarkdown()`
- `renderHTML()`
- `renderMarkdown()`
- `renderAiAggregate()`

## Files Delivered

- Worker source: `src/index.ts`
- D1 schema/migrations: `migrations/*.sql`
- Worker config: `wrangler.toml.example`
- robots/sitemap: runtime routes
- This README
