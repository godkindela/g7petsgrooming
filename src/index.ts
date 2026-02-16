import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';

interface Env {
  DB: D1Database;
  GALLERY_BUCKET: R2Bucket;
  ADMIN_TOKEN?: string;
  PUBLIC_BASE_URL?: string;
}

type AppBindings = { Bindings: Env };

type GalleryImage = {
  id: number;
  r2Key: string;
  thumbKey: string;
  title: string;
  alt: string;
  tagsJSON: string;
  petType: string;
  beforeAfter: number;
  pairedId: number | null;
  featured: number;
  createdAt: string;
};

const app = new Hono<AppBindings>();

const site = {
  name: 'G7 Pets Grooming',
  brandLine: 'Best place for pet grooming and daycare',
  address: '81 Harp Rd, Kew East VIC 3102',
  telephone: '0488668837',
  telephone2: '0490685668',
  openingHoursText: 'Thursday-Sunday: 9:00am-5:00pm',
  openingHoursSchema: ['Th 09:00-17:00', 'Fr 09:00-17:00', 'Sa 09:00-17:00', 'Su 09:00-17:00'],
  instagram: 'https://instagram.com/g7petsgrooming?r=nametag'
};

const routes = ['/', '/services', '/gallery', '/pricing', '/faq', '/contact'];

function baseUrl(c: any): string {
  return (c.env.PUBLIC_BASE_URL || 'https://www.g7pets.com.au').replace(/\/$/, '');
}

function canonical(c: any, path: string): string {
  return `${baseUrl(c)}${path}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderJsonLd(c: any, path: string): string {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: site.name,
    url: canonical(c, path),
    telephone: site.telephone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: '81 Harp Rd',
      addressLocality: 'Kew East',
      addressRegion: 'VIC',
      postalCode: '3102',
      addressCountry: 'AU'
    },
    openingHours: site.openingHoursSchema,
    sameAs: [site.instagram]
  };
  return `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
}

function layout(c: any, opts: { title: string; description: string; path: string; content: string }): string {
  const current = opts.path;
  const nav = [
    ['/', 'Home'],
    ['/services', 'Services'],
    ['/gallery', 'Gallery'],
    ['/pricing', 'Pricing'],
    ['/faq', 'FAQ'],
    ['/contact', 'Contact']
  ]
    .map(([href, label]) => {
      const active = href === current ? 'aria-current="page"' : '';
      return `<a ${active} href="${href}">${label}</a>`;
    })
    .join('');

  const ogImage = `${baseUrl(c)}/thumb/default-og.jpg`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${escapeHtml(opts.title)}</title>
  <meta name="description" content="${escapeHtml(opts.description)}" />
  <link rel="canonical" href="${canonical(c, opts.path)}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(opts.title)}" />
  <meta property="og:description" content="${escapeHtml(opts.description)}" />
  <meta property="og:url" content="${canonical(c, opts.path)}" />
  <meta property="og:image" content="${ogImage}" />
  ${renderJsonLd(c, opts.path)}
  <style>
    :root {
      --primary: #6FAF8F;
      --primary-dark: #4E8E6E;
      --primary-light: #EAF5EF;
      --bg-main: #F7F4EE;
      --bg-section: #F1ECE4;
      --card-bg: #FFFFFF;
      --accent: #F4A261;
      --accent-hover: #E38B3C;
      --heading: #2F3A34;
      --text: #4C5550;
      --muted: #7B827D;
      --line: #e4ddd2;
      --container: 1080px;
      --radius: 14px;
      --shadow: 0 8px 20px rgba(0, 0, 0, 0.04);
    }
    * { box-sizing: border-box; }
    html, body {
      width: 100%;
      max-width: 100%;
      overflow-x: clip;
    }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 16px;
      color: var(--text);
      background:
        radial-gradient(circle at 0 0, #f8ddc0 0, transparent 34%),
        radial-gradient(circle at 100% 0, #dcebdc 0, transparent 30%),
        var(--bg-main);
      line-height: 1.6;
      -webkit-text-size-adjust: 100%;
      padding-bottom: env(safe-area-inset-bottom);
    }
    img { max-width: 100%; display: block; }
    a, button { -webkit-tap-highlight-color: transparent; }
    a:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible {
      outline: 2px solid var(--primary-dark);
      outline-offset: 2px;
    }
    header {
      border-bottom: 1px solid var(--line);
      background: color-mix(in srgb, #fff 84%, var(--bg-section));
      position: sticky;
      top: 0;
      z-index: 10;
      padding-top: env(safe-area-inset-top);
    }
    .container { width: 100%; max-width: var(--container); margin: 0 auto; padding: 0 1rem; }
    .topbar { display: flex; gap: .75rem; align-items: center; justify-content: space-between; padding: .75rem 0; }
    .brand {
      font-weight: 800;
      letter-spacing: .2px;
      color: var(--primary-dark);
      text-decoration: none;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      white-space: nowrap;
      flex: 0 0 auto;
    }
    .nav-scroller {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      width: 100%;
      scrollbar-width: none;
    }
    .nav-scroller::-webkit-scrollbar { display: none; }
    nav {
      display: flex;
      flex-wrap: nowrap;
      gap: .5rem;
      min-width: max-content;
      padding-bottom: 2px;
    }
    nav a {
      text-decoration: none;
      color: var(--text);
      border: 1px solid transparent;
      padding: .6rem .8rem;
      border-radius: 999px;
      font-weight: 600;
      font-size: .95rem;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      white-space: nowrap;
    }
    nav a[aria-current="page"] { background: var(--primary-light); border-color: #cde1d5; color: var(--primary-dark); }
    main { padding: 1.2rem 0 6rem; }
    section, article {
      background: var(--bg-section);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 1.1rem;
      margin-bottom: 1rem;
    }
    h1 { margin-top: .1rem; font-size: clamp(2rem, 3vw, 2.2rem); color: var(--heading); line-height: 1.2; }
    h2 { font-size: clamp(1.2rem, 2.7vw, 1.5rem); margin-top: .4rem; color: var(--heading); }
    p { margin: .45rem 0; max-width: 72ch; }
    main a {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
    }
    .grid { display: grid; gap: .9rem; }
    .grid.cards { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
    .card {
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 1rem;
      background: var(--card-bg);
      box-shadow: var(--shadow);
    }
    .muted { color: var(--muted); }
    .pill { display: inline-block; border-radius: 999px; background: #f8f1e7; border: 1px solid #eadfce; padding: .2rem .6rem; font-size: .86rem; }
    a[href^="tel:"], a[href*="maps.app"] {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
    }
    form.inline { display: grid; gap: .75rem; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-bottom: .8rem; }
    input, select, textarea, button {
      width: 100%;
      padding: .75rem .75rem;
      border: 1px solid #d7c7b1;
      border-radius: 10px;
      font: inherit;
      font-size: 16px;
      background: #fff;
      min-height: 44px;
    }
    button { cursor: pointer; background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 700; }
    button:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
    button.secondary { background: #fff; color: #333; }
    .gallery-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .8rem; }
    .gallery-item { border: 1px solid var(--line); border-radius: 14px; overflow: hidden; background: var(--card-bg); box-shadow: var(--shadow); }
    .gallery-thumb {
      width: 100%;
      aspect-ratio: 1 / 1;
      object-fit: cover;
      background: #f6f6f6;
    }
    .gallery-link { display: block; min-height: 44px; }
    .gallery-item .meta { padding: .65rem; }
    .notice { padding: .65rem .8rem; border-radius: 10px; border: 1px solid #ffd9b2; background: #fff4e8; }
    footer {
      border-top: 1px solid var(--line);
      padding: 1rem 0 calc(2.2rem + env(safe-area-inset-bottom));
      font-size: .93rem;
      color: var(--muted);
    }
    .pagination { display: flex; gap: .6rem; align-items: center; flex-wrap: wrap; }
    .pagination a {
      text-decoration: none;
      padding: .55rem .85rem;
      border: 1px solid #d6c7b5;
      border-radius: 8px;
      color: var(--text);
      background: #fff;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
    }
    .mobile-cta {
      display: none;
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 20;
      background: #fff;
      border-top: 1px solid var(--line);
      padding: .55rem 1rem calc(.55rem + env(safe-area-inset-bottom));
      gap: .65rem;
    }
    .mobile-cta a {
      flex: 1;
      text-decoration: none;
      border-radius: 12px;
      min-height: 44px;
      padding: .75rem .7rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      border: 1px solid transparent;
    }
    .mobile-cta .book { background: var(--accent); color: #fff; }
    .mobile-cta .call { background: #fff; color: var(--heading); border-color: #d8cdbf; }
    .lightbox {
      position: fixed;
      inset: 0;
      background: rgba(24, 28, 26, 0.76);
      display: none;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      z-index: 30;
    }
    .lightbox:target { display: flex; }
    .lightbox img {
      max-width: min(95vw, 960px);
      max-height: 85vh;
      width: auto;
      height: auto;
      border-radius: 12px;
      background: #fff;
    }
    .lightbox .close {
      position: absolute;
      top: calc(12px + env(safe-area-inset-top));
      right: 12px;
      background: #fff;
      color: #111;
      min-height: 44px;
      min-width: 44px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      font-weight: 700;
    }
    @media (max-width: 480px) {
      .container { padding: 0 .85rem; }
      .topbar { flex-direction: column; align-items: flex-start; }
      .grid.cards, .gallery-grid, form.inline { grid-template-columns: 1fr; }
      .card, section, article { padding: 16px; margin-bottom: 12px; }
      h1 { font-size: clamp(28px, 9vw, 32px); }
      p { max-width: 100%; }
      .mobile-cta { display: flex; }
    }
    @media (min-width: 481px) and (max-width: 768px) {
      .grid.cards, .gallery-grid, form.inline { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      p { max-width: 620px; }
    }
    @media (min-width: 769px) {
      .mobile-cta { display: none; }
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg-main: #232823;
        --bg-section: #2a312b;
        --card-bg: #2d352e;
        --heading: #e7efe9;
        --text: #d3ddd6;
        --muted: #b0b8b2;
        --line: #465247;
      }
      .mobile-cta { background: #253029; }
      .mobile-cta .call { background: transparent; color: var(--text); border-color: #51604f; }
    }
  </style>
</head>
<body>
  <header>
    <div class="container topbar">
      <a class="brand" href="/">${site.name}</a>
      <div class="nav-scroller"><nav aria-label="Primary">${nav}</nav></div>
    </div>
  </header>
  <main>
    <div class="container">${opts.content}</div>
  </main>
  <div class="mobile-cta" aria-label="Quick actions">
    <a class="book" href="https://g7pet.simplybook.me/v2/#book" target="_blank" rel="noopener">Book</a>
    <a class="call" href="tel:${site.telephone}">Call ${site.telephone}</a>
  </div>
  <footer>
    <div class="container">${site.name} · ${site.address} · ${site.telephone}</div>
  </footer>
</body>
</html>`;
}

function toTags(tagsJSON: string): string[] {
  try {
    const parsed = JSON.parse(tagsJSON);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function parseTagInput(raw: string): string[] {
  return raw
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function toBoolInt(raw: FormDataEntryValue | null): number {
  return raw === 'on' || raw === '1' || raw === 'true' ? 1 : 0;
}

async function ensureAuth(c: any, next: () => Promise<void>) {
  if (c.req.path === '/admin/login' || c.req.path === '/admin/login-submit') {
    await next();
    return;
  }

  const accessEmail = c.req.header('cf-access-authenticated-user-email');
  if (accessEmail) {
    await next();
    return;
  }

  const token = c.env.ADMIN_TOKEN;
  const session = getCookie(c, 'admin_session');
  if (token && session && session === token) {
    await next();
    return;
  }

  if (c.req.header('accept')?.includes('text/html')) {
    return c.redirect('/admin/login', 302);
  }
  return c.text('Unauthorized', 401);
}

app.use('/admin/*', ensureAuth);

function publicPage(c: any, payload: { title: string; description: string; path: string; content: string }) {
  return c.html(layout(c, payload));
}

app.get('/', (c) => {
  const content = `
  <section>
    <h1>${site.brandLine}</h1>
    <p>Professional dog and cat grooming in Kew East, Melbourne. We provide style cuts, wash and dry, coat care, and daycare.</p>
    <p class="pill">Local pet grooming salon in Melbourne VIC</p>
  </section>
  <section class="grid cards">
    <article class="card"><h2>Services</h2><p>Breed-specific cuts, tidy trims, coat de-shedding, paw and nail care, and premium bathing.</p></article>
    <article class="card"><h2>Gallery</h2><p>Browse recent grooming results, before/after transformations, and featured pets.</p></article>
    <article class="card"><h2>Book & Contact</h2><p>Call us directly or visit our contact page for address, opening hours, and booking links.</p></article>
  </section>
  <section>
    <h2>NAP & Opening Hours</h2>
    <p><strong>Name:</strong> ${site.name}</p>
    <p><strong>Address:</strong> <a href="https://maps.app.goo.gl/wxkLwVRh7Q5D12Th9" target="_blank" rel="noopener">${site.address}</a></p>
    <p><strong>Phone:</strong> <a href="tel:${site.telephone}">${site.telephone}</a> / <a href="tel:${site.telephone2}">${site.telephone2}</a></p>
    <p><strong>Opening Hours:</strong> ${site.openingHoursText}</p>
  </section>`;

  return publicPage(c, {
    title: 'Pet Grooming in Kew East Melbourne | G7 Pets Grooming',
    description: 'G7 Pets Grooming offers professional dog and cat grooming, style cuts, wash and dry, and daycare in Kew East VIC.',
    path: '/',
    content
  });
});

app.get('/services', (c) => {
  const content = `
  <section>
    <h1>Pet Grooming Services</h1>
    <p>Our team provides grooming plans based on coat condition, breed style, and comfort level.</p>
  </section>
  <section class="grid cards">
    <article class="card"><h2>Full Groom</h2><p>Wash, dry, style cut, nail trim, ear and hygiene area clean-up.</p></article>
    <article class="card"><h2>Wash & Blow Dry</h2><p>Coat cleansing, de-shedding support, and blow-dry finish for regular maintenance.</p></article>
    <article class="card"><h2>Cat Grooming</h2><p>Gentle coat handling, lion cut options, mat removal, and hygiene trims.</p></article>
    <article class="card"><h2>Daycare Add-on</h2><p>Daycare option for busy owners who need safe supervision before pickup.</p></article>
  </section>`;

  return publicPage(c, {
    title: 'Dog & Cat Grooming Services | G7 Pets Grooming',
    description: 'Explore full grooming, wash and dry, cat grooming, and daycare options at G7 Pets Grooming in Melbourne.',
    path: '/services',
    content
  });
});

app.get('/pricing', (c) => {
  const content = `
  <section>
    <h1>Pricing Guide</h1>
    <p>Final price depends on pet size, coat condition, behavior support, and style complexity. Please confirm exact pricing during booking.</p>
  </section>
  <section class="grid cards">
    <article class="card"><h2>Small Pets</h2><p>From AUD 75 for wash, dry, and tidy.</p></article>
    <article class="card"><h2>Medium Pets</h2><p>From AUD 95 for complete grooming service.</p></article>
    <article class="card"><h2>Large Pets</h2><p>From AUD 120 depending on coat and trim requirements.</p></article>
    <article class="card"><h2>Cat Grooming</h2><p>From AUD 100 for specialty grooming and lion cut style options.</p></article>
  </section>`;

  return publicPage(c, {
    title: 'Pet Grooming Pricing | G7 Pets Grooming',
    description: 'See starting prices for small, medium, and large pet grooming plus cat grooming at G7 Pets Grooming.',
    path: '/pricing',
    content
  });
});

app.get('/faq', (c) => {
  const content = `
  <section>
    <h1>Frequently Asked Questions</h1>
    <p>Common questions for first-time and returning pet owners.</p>
  </section>
  <section>
    <h2>How often should my pet be groomed?</h2>
    <p>Most pets benefit from grooming every 4 to 8 weeks depending on coat type and activity level.</p>
    <h2>Do you handle matted coats?</h2>
    <p>Yes. We assess matting severity and recommend a safe grooming path for your pet.</p>
    <h2>Can I request a specific cut style?</h2>
    <p>Yes. Bring a photo reference or discuss your preferred style during check-in.</p>
    <h2>Do you accept cats?</h2>
    <p>Yes. Cat grooming appointments are available and must be booked in advance.</p>
  </section>`;

  return publicPage(c, {
    title: 'Pet Grooming FAQ | G7 Pets Grooming',
    description: 'Read FAQs about grooming frequency, matted coats, style requests, and cat grooming at G7 Pets Grooming.',
    path: '/faq',
    content
  });
});

app.get('/contact', (c) => {
  const content = `
  <section>
    <h1>Contact G7 Pets Grooming</h1>
    <p>For bookings and service questions, call us directly or message via Instagram.</p>
  </section>
  <section>
    <h2>NAP & Opening Hours</h2>
    <p><strong>Name:</strong> ${site.name}</p>
    <p><strong>Address:</strong> <a href="https://maps.app.goo.gl/wxkLwVRh7Q5D12Th9" target="_blank" rel="noopener">${site.address}</a></p>
    <p><strong>Phone:</strong> <a href="tel:${site.telephone}">${site.telephone}</a> / <a href="tel:${site.telephone2}">${site.telephone2}</a></p>
    <p><strong>Opening Hours:</strong> ${site.openingHoursText}</p>
    <p><strong>Instagram:</strong> <a href="${site.instagram}" target="_blank" rel="noopener">@g7petsgrooming</a></p>
  </section>`;

  return publicPage(c, {
    title: 'Contact Pet Groomer in Kew East | G7 Pets Grooming',
    description: 'Contact G7 Pets Grooming at 81 Harp Rd, Kew East VIC. Call for booking and check opening hours.',
    path: '/contact',
    content
  });
});

app.get('/gallery', async (c) => {
  const petType = (c.req.query('petType') || '').trim();
  const beforeAfter = (c.req.query('beforeAfter') || '').trim();
  const tag = (c.req.query('tag') || '').trim();
  const page = Math.max(1, Number.parseInt(c.req.query('page') || '1', 10) || 1);
  const perPage = 12;
  const offset = (page - 1) * perPage;

  const where: string[] = [];
  const params: string[] = [];

  if (petType) {
    where.push('petType = ?');
    params.push(petType);
  }
  if (beforeAfter === 'true' || beforeAfter === 'false') {
    where.push('beforeAfter = ?');
    params.push(beforeAfter === 'true' ? '1' : '0');
  }
  if (tag) {
    where.push('tagsJSON LIKE ?');
    params.push(`%"${tag.replaceAll('"', '')}"%`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  let images: GalleryImage[] = [];
  let total = 0;
  if ((c.env as { DB?: D1Database }).DB) {
    try {
      const listStmt = c.env.DB.prepare(
        `SELECT * FROM gallery_images ${whereSql} ORDER BY featured DESC, createdAt DESC LIMIT ? OFFSET ?`
      ).bind(...params, String(perPage), String(offset));

      const countStmt = c.env.DB.prepare(`SELECT COUNT(*) as total FROM gallery_images ${whereSql}`).bind(...params);

      const [listRes, countRes] = await Promise.all([listStmt.all<GalleryImage>(), countStmt.first<{ total: number }>()]);
      images = listRes.results || [];
      total = Number(countRes?.total || 0);
    } catch {
      images = [];
      total = 0;
    }
  }
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const items = images
    .map((img, idx) => {
      const imageId = `img-${img.id}`;
      const tags = toTags(img.tagsJSON).map((t) => `<span class="pill">${escapeHtml(t)}</span>`).join(' ');
      const priority = idx < 3 && page === 1 ? ' fetchpriority="high"' : '';
      const key = encodeURIComponent(img.thumbKey);
      const r2Key = encodeURIComponent(img.r2Key);
      return `<article class="gallery-item">
        <a class="gallery-link" href="#${imageId}" aria-label="Open ${escapeHtml(img.title || 'gallery image')}">
          <img
            class="gallery-thumb"
            src="/thumb/${key}?w=320"
            srcset="/thumb/${key}?w=320 320w, /thumb/${key}?w=640 640w, /thumb/${key}?w=960 960w"
            sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 33vw"
            width="560"
            height="560"
            alt="${escapeHtml(img.alt)}"
            loading="lazy"
            decoding="async"${priority}
          />
        </a>
        <div class="meta">
          <h2>${escapeHtml(img.title || 'Untitled')}</h2>
          <p class="muted">${escapeHtml(img.petType || 'unknown')} · ${img.beforeAfter ? 'Before/After' : 'Standard'}</p>
          <div>${tags}</div>
        </div>
        <aside id="${imageId}" class="lightbox" aria-label="Image preview">
          <a class="close" href="#gallery-top" aria-label="Close">×</a>
          <img src="/media/${r2Key}" alt="${escapeHtml(img.alt)}" loading="lazy" decoding="async" />
        </aside>
      </article>`;
    })
    .join('');

  const prevLink = page > 1 ? `<a href="${galleryQuery({ petType, beforeAfter, tag, page: page - 1 })}">Previous</a>` : '';
  const nextLink = page < totalPages ? `<a href="${galleryQuery({ petType, beforeAfter, tag, page: page + 1 })}">Next</a>` : '';

  const content = `
  <section id="gallery-top">
    <h1>Pet Grooming Gallery</h1>
    <p>Filter by pet type, before/after, and tags. Images are lazy-loaded for better first-screen performance.</p>
  </section>
  <section>
    <h2>Filter Gallery</h2>
    <form class="inline" method="get" action="/gallery">
      <label>Pet Type
        <input name="petType" value="${escapeHtml(petType)}" placeholder="dog / cat" />
      </label>
      <label>Before / After
        <select name="beforeAfter">
          <option value="" ${beforeAfter === '' ? 'selected' : ''}>All</option>
          <option value="true" ${beforeAfter === 'true' ? 'selected' : ''}>Before/After</option>
          <option value="false" ${beforeAfter === 'false' ? 'selected' : ''}>Standard</option>
        </select>
      </label>
      <label>Tag
        <input name="tag" value="${escapeHtml(tag)}" placeholder="style cut" />
      </label>
      <div style="display:flex;align-items:flex-end"><button type="submit">Apply</button></div>
    </form>
    <p class="muted">${total} image(s) found.</p>
    <div class="gallery-grid">${items || '<p>No images yet.</p>'}</div>
    <div class="pagination"><span>Page ${page} / ${totalPages}</span>${prevLink}${nextLink}</div>
  </section>`;

  return publicPage(c, {
    title: 'Pet Grooming Gallery | G7 Pets Grooming',
    description: 'View dog and cat grooming photos, before and after transformations, and style examples from G7 Pets Grooming.',
    path: '/gallery',
    content
  });
});

function galleryQuery(q: { petType: string; beforeAfter: string; tag: string; page: number }): string {
  const query = new URLSearchParams();
  if (q.petType) query.set('petType', q.petType);
  if (q.beforeAfter) query.set('beforeAfter', q.beforeAfter);
  if (q.tag) query.set('tag', q.tag);
  if (q.page > 1) query.set('page', String(q.page));
  const s = query.toString();
  return s ? `/gallery?${s}` : '/gallery';
}

app.get('/robots.txt', (c) => {
  return c.text(`User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${baseUrl(c)}/sitemap.xml\n`, 200, {
    'Content-Type': 'text/plain; charset=utf-8'
  });
});

app.get('/sitemap.xml', (c) => {
  const entries = routes
    .map((path) => `  <url><loc>${canonical(c, path)}</loc><changefreq>weekly</changefreq></url>`)
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
  return c.text(xml, 200, { 'Content-Type': 'application/xml; charset=utf-8' });
});

app.get('/admin/login', (c) => {
  const content = `
  <section>
    <h1>Admin Login</h1>
    <p>Preferred auth is Cloudflare Access. For MVP fallback, login using ADMIN_TOKEN.</p>
    <form method="post" action="/admin/login-submit" class="grid" style="max-width:420px">
      <label>Token
        <input name="token" type="password" required />
      </label>
      <button type="submit">Login</button>
    </form>
  </section>`;

  return publicPage(c, {
    title: 'Admin Login | G7 Pets Grooming',
    description: 'Admin login for gallery content management.',
    path: '/admin/login',
    content
  });
});

app.post('/admin/login-submit', async (c) => {
  const form = await c.req.formData();
  const token = (form.get('token') || '').toString();
  if (!c.env.ADMIN_TOKEN || token !== c.env.ADMIN_TOKEN) {
    return c.text('Invalid token', 401);
  }
  setCookie(c, 'admin_session', token, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/admin' });
  return c.redirect('/admin/gallery', 302);
});

app.post('/admin/logout', (c) => {
  deleteCookie(c, 'admin_session', { path: '/admin' });
  return c.redirect('/admin/login', 302);
});

app.get('/admin/gallery', async (c) => {
  const imagesRes = await c.env.DB.prepare('SELECT * FROM gallery_images ORDER BY createdAt DESC LIMIT 200').all<GalleryImage>();
  const images = imagesRes.results || [];

  const rows = images
    .map((img) => {
      const tags = toTags(img.tagsJSON).join(', ');
      return `<article class="card">
        <h2>#${img.id} ${escapeHtml(img.title || 'Untitled')}</h2>
        <img src="/thumb/${encodeURIComponent(img.thumbKey)}" alt="${escapeHtml(img.alt)}" loading="lazy" style="max-width:240px;height:160px;object-fit:cover;border-radius:10px;border:1px solid #ddd" />
        <p><strong>Alt:</strong> ${escapeHtml(img.alt)}</p>
        <p><strong>Tags:</strong> ${escapeHtml(tags)}</p>
        <p><strong>Pet Type:</strong> ${escapeHtml(img.petType || '')} | <strong>BeforeAfter:</strong> ${img.beforeAfter ? 'Yes' : 'No'} | <strong>Featured:</strong> ${img.featured ? 'Yes' : 'No'}</p>
        <form method="post" action="/admin/gallery/update/${img.id}" class="grid">
          <input name="title" value="${escapeHtml(img.title || '')}" placeholder="Title" required />
          <input name="alt" value="${escapeHtml(img.alt || '')}" placeholder="Alt text (required)" required />
          <input name="petType" value="${escapeHtml(img.petType || '')}" placeholder="Pet type" />
          <input name="tags" value="${escapeHtml(tags)}" placeholder="tag1, tag2" />
          <label><input type="checkbox" name="beforeAfter" ${img.beforeAfter ? 'checked' : ''} /> before/after</label>
          <label><input type="checkbox" name="featured" ${img.featured ? 'checked' : ''} /> featured</label>
          <input name="pairedId" value="${img.pairedId || ''}" placeholder="Paired ID (optional)" />
          <label>Optional new image file<input type="file" name="image" accept="image/*" /></label>
          <button type="submit">Update</button>
        </form>
        <form method="post" action="/admin/gallery/delete/${img.id}"><button class="secondary" type="submit">Delete</button></form>
      </article>`;
    })
    .join('');

  const content = `
  <section>
    <h1>Admin Gallery Manager</h1>
    <p class="notice">Cannot publish/update without alt text. Upload stores original and generated thumbnail in R2.</p>
    <form method="post" action="/admin/gallery/upload" enctype="multipart/form-data" class="grid">
      <h2>Upload New Image</h2>
      <label>Image file<input type="file" name="image" accept="image/*" required /></label>
      <label>Title<input name="title" required /></label>
      <label>Alt text (required)<input name="alt" required /></label>
      <label>Tags (comma separated)<input name="tags" placeholder="cute, style cut" /></label>
      <label>Pet type<input name="petType" placeholder="dog / cat" /></label>
      <label>Paired image ID (optional)<input name="pairedId" /></label>
      <label><input type="checkbox" name="beforeAfter" /> before/after image</label>
      <label><input type="checkbox" name="featured" /> featured on top</label>
      <button type="submit">Upload</button>
    </form>
    <form method="post" action="/admin/logout" style="margin-top:.7rem"><button class="secondary" type="submit">Logout</button></form>
  </section>
  <section>
    <h2>Existing Images</h2>
    <div class="grid">${rows || '<p>No images yet.</p>'}</div>
  </section>`;

  return publicPage(c, {
    title: 'Admin Gallery | G7 Pets Grooming',
    description: 'Admin gallery content management.',
    path: '/admin/gallery',
    content
  });
});

app.post('/admin/gallery/upload', async (c) => {
  const form = await c.req.formData();
  const image = form.get('image');
  const title = (form.get('title') || '').toString().trim();
  const alt = (form.get('alt') || '').toString().trim();
  const tags = parseTagInput((form.get('tags') || '').toString());
  const petType = (form.get('petType') || '').toString().trim();
  const pairedIdRaw = (form.get('pairedId') || '').toString().trim();
  const beforeAfter = toBoolInt(form.get('beforeAfter'));
  const featured = toBoolInt(form.get('featured'));

  if (!alt) {
    return c.text('Alt text is required before publish.', 400);
  }
  if (!(image instanceof File)) {
    return c.text('Image file is required.', 400);
  }

  const ext = extensionFromFile(image);
  const uid = crypto.randomUUID();
  const r2Key = `g-${uid}.${ext}`;
  const thumbKey = `t-${uid}.webp`;

  await c.env.GALLERY_BUCKET.put(r2Key, await image.arrayBuffer(), {
    httpMetadata: { contentType: image.type || mimeByExt(ext) }
  });

  await createThumbFromOriginal(c, r2Key, thumbKey);

  await c.env.DB.prepare(
    `INSERT INTO gallery_images (r2Key, thumbKey, title, alt, tagsJSON, petType, beforeAfter, pairedId, featured)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      r2Key,
      thumbKey,
      title,
      alt,
      JSON.stringify(tags),
      petType,
      String(beforeAfter),
      pairedIdRaw ? pairedIdRaw : null,
      String(featured)
    )
    .run();

  return c.redirect('/admin/gallery', 302);
});

app.post('/admin/gallery/update/:id', async (c) => {
  const id = c.req.param('id');
  const form = await c.req.formData();
  const title = (form.get('title') || '').toString().trim();
  const alt = (form.get('alt') || '').toString().trim();
  const tags = parseTagInput((form.get('tags') || '').toString());
  const petType = (form.get('petType') || '').toString().trim();
  const pairedIdRaw = (form.get('pairedId') || '').toString().trim();
  const beforeAfter = toBoolInt(form.get('beforeAfter'));
  const featured = toBoolInt(form.get('featured'));
  const newImage = form.get('image');

  if (!alt) {
    return c.text('Alt text is required before publish.', 400);
  }

  const existing = await c.env.DB.prepare('SELECT * FROM gallery_images WHERE id = ?').bind(id).first<GalleryImage>();
  if (!existing) {
    return c.text('Image not found.', 404);
  }

  let r2Key = existing.r2Key;
  let thumbKey = existing.thumbKey;

  if (newImage instanceof File && newImage.size > 0) {
    await c.env.GALLERY_BUCKET.delete(existing.r2Key);
    await c.env.GALLERY_BUCKET.delete(existing.thumbKey);

    const ext = extensionFromFile(newImage);
    const uid = crypto.randomUUID();
    r2Key = `g-${uid}.${ext}`;
    thumbKey = `t-${uid}.webp`;

    await c.env.GALLERY_BUCKET.put(r2Key, await newImage.arrayBuffer(), {
      httpMetadata: { contentType: newImage.type || mimeByExt(ext) }
    });
    await createThumbFromOriginal(c, r2Key, thumbKey);
  }

  await c.env.DB.prepare(
    `UPDATE gallery_images
      SET r2Key = ?, thumbKey = ?, title = ?, alt = ?, tagsJSON = ?, petType = ?, beforeAfter = ?, pairedId = ?, featured = ?
      WHERE id = ?`
  )
    .bind(
      r2Key,
      thumbKey,
      title,
      alt,
      JSON.stringify(tags),
      petType,
      String(beforeAfter),
      pairedIdRaw ? pairedIdRaw : null,
      String(featured),
      id
    )
    .run();

  return c.redirect('/admin/gallery', 302);
});

app.post('/admin/gallery/delete/:id', async (c) => {
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT r2Key, thumbKey FROM gallery_images WHERE id = ?').bind(id).first<{
    r2Key: string;
    thumbKey: string;
  }>();

  if (existing) {
    await Promise.all([c.env.GALLERY_BUCKET.delete(existing.r2Key), c.env.GALLERY_BUCKET.delete(existing.thumbKey)]);
  }

  await c.env.DB.prepare('DELETE FROM gallery_images WHERE id = ?').bind(id).run();
  return c.redirect('/admin/gallery', 302);
});

app.get('/media/:key', async (c) => {
  const key = decodeURIComponent(c.req.param('key'));
  const object = await c.env.GALLERY_BUCKET.get(key);
  if (!object) return c.text('Not found', 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');

  return new Response(object.body, { headers });
});

app.get('/thumb/:key', async (c) => {
  const key = decodeURIComponent(c.req.param('key'));
  const widthRaw = Number.parseInt(c.req.query('w') || '', 10);
  const width = Number.isFinite(widthRaw) ? Math.max(120, Math.min(1200, widthRaw)) : null;

  if (width) {
    const sourceUrl = new URL(`/media/${encodeURIComponent(key)}`, c.req.url).toString();
    const transformed = await fetch(sourceUrl, {
      cf: {
        image: {
          width,
          fit: 'cover',
          quality: 82,
          format: 'webp'
        }
      }
    });
    if (transformed.ok) {
      const headers = new Headers(transformed.headers);
      headers.set('cache-control', 'public, max-age=604800');
      return new Response(transformed.body, {
        status: transformed.status,
        headers
      });
    }
  }

  const object = await c.env.GALLERY_BUCKET.get(key);
  if (!object) {
    return c.redirect('/media/default-fallback.jpg', 302);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');

  return new Response(object.body, { headers });
});

app.get('/media/default-fallback.jpg', (c) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420"><rect width="100%" height="100%" fill="#f5efe4"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="28" fill="#6f6f6f">Gallery Image</text></svg>`;
  return c.body(svg, 200, { 'Content-Type': 'image/svg+xml; charset=utf-8' });
});

async function createThumbFromOriginal(c: any, originalKey: string, thumbKey: string): Promise<void> {
  const originalUrl = new URL(`/media/${encodeURIComponent(originalKey)}`, c.req.url).toString();

  try {
    const resized = await fetch(originalUrl, {
      cf: {
        image: {
          width: 560,
          height: 560,
          fit: 'cover',
          quality: 82,
          format: 'webp'
        }
      }
    });

    if (resized.ok) {
      await c.env.GALLERY_BUCKET.put(thumbKey, await resized.arrayBuffer(), {
        httpMetadata: { contentType: 'image/webp' }
      });
      return;
    }
  } catch {
    // fallback below
  }

  const original = await c.env.GALLERY_BUCKET.get(originalKey);
  if (original) {
    await c.env.GALLERY_BUCKET.put(thumbKey, await original.arrayBuffer(), {
      httpMetadata: { contentType: original.httpMetadata?.contentType || 'application/octet-stream' }
    });
  }
}

function extensionFromFile(file: File): string {
  const fromType = file.type?.split('/')[1]?.toLowerCase();
  if (fromType && /^[a-z0-9+.-]+$/.test(fromType)) {
    if (fromType === 'jpeg') return 'jpg';
    return fromType;
  }
  const fromName = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  return fromName.replace(/[^a-z0-9]/g, '') || 'jpg';
}

function mimeByExt(ext: string): string {
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'avif') return 'image/avif';
  return 'image/jpeg';
}

app.notFound((c) => {
  return publicPage(c, {
    title: 'Page Not Found | G7 Pets Grooming',
    description: 'The page you requested could not be found.',
    path: c.req.path,
    content: `<section><h1>Page Not Found</h1><p>Try one of the main pages from the menu.</p></section>`
  });
});

export default app;
