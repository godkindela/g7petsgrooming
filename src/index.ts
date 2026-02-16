import { Hono } from 'hono';

type Bindings = {
  Bindings: {
    DB: D1Database;
    GALLERY_BUCKET: R2Bucket;
    PUBLIC_BASE_URL?: string;
    MD_FOR_BOTS?: string;
  };
};

type PageContent = {
  slug: string;
  titleEn: string;
  titleZh: string;
  summaryEn: string;
  summaryZh: string;
  descriptionEn: string;
  descriptionZh: string;
  sectionsEn: string[];
  sectionsZh: string[];
  canonicalPath: string;
};

type ServiceContent = {
  titleEn: string;
  titleZh: string;
  bulletsEn: string[];
  bulletsZh: string[];
};

type FaqContent = {
  questionEn: string;
  questionZh: string;
  answerEn: string;
  answerZh: string;
};

type GalleryContent = {
  id: number;
  titleEn: string;
  titleZh: string;
  altEn: string;
  altZh: string;
  tags: string[];
  petType: string;
  beforeAfter: number;
  imageUrl: string;
  thumbUrl: string;
  isPublished: number;
};

type SiteNAP = {
  nameEn: string;
  nameZh: string;
  addressEn: string;
  addressZh: string;
  phone: string;
  phone2: string;
  openingHoursEn: string;
  openingHoursZh: string;
  mapsUrl: string;
  instagramUrl: string;
};

type RenderContext = {
  page: PageContent;
  site: SiteNAP;
  services: ServiceContent[];
  faqs: FaqContent[];
  gallery: GalleryContent[];
};

const app = new Hono<Bindings>();

const PAGE_ORDER = ['home', 'services', 'gallery', 'pricing', 'faq', 'contact', 'ai'] as const;
const SLUG_TO_PATH: Record<(typeof PAGE_ORDER)[number], string> = {
  home: '/',
  services: '/services',
  gallery: '/gallery',
  pricing: '/pricing',
  faq: '/faq',
  contact: '/contact',
  ai: '/ai'
};

const BOT_UA_LIST = [
  'Googlebot',
  'Bingbot',
  'DuckDuckBot',
  'Applebot',
  'YandexBot',
  'Baiduspider',
  'GPTBot',
  'ChatGPT-User',
  'OpenAI',
  'ClaudeBot',
  'anthropic',
  'PerplexityBot',
  'CCBot',
  'Bytespider',
  'Amazonbot',
  'facebookexternalhit',
  'twitterbot'
];

const BOT_UA_REGEX = new RegExp(BOT_UA_LIST.join('|'), 'i');

function boolEnv(value?: string): boolean {
  const normalized = (value || '').trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

function baseUrl(c: any): string {
  return (c.env.PUBLIC_BASE_URL || 'https://www.g7pets.com.au').replace(/\/$/, '');
}

function canonical(c: any, path: string): string {
  return `${baseUrl(c)}${path}`;
}

function varyHeaders(contentType: string, cacheControl: string): Record<string, string> {
  return {
    'Content-Type': contentType,
    'Cache-Control': cacheControl,
    Vary: 'Accept, User-Agent'
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function safeArrayJSON(input: string | null | undefined): string[] {
  if (!input) return [];
  try {
    const parsed = JSON.parse(input);
    if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === 'string');
  } catch {
    return [];
  }
  return [];
}

function fallback(value?: string | null, fallbackValue = ''): string {
  return (value || '').trim() || fallbackValue;
}

function detectPreferMarkdown(c: any): boolean {
  const path = c.req.path.toLowerCase();
  if (path.endsWith('.md')) return true;

  const format = (c.req.query('format') || '').toLowerCase();
  const mdQuery = (c.req.query('md') || '').toLowerCase();
  if (format === 'md' || mdQuery === '1') return true;

  const accept = (c.req.header('accept') || '').toLowerCase();
  if (accept.includes('text/markdown')) return true;

  if (boolEnv(c.env.MD_FOR_BOTS)) {
    const ua = c.req.header('user-agent') || '';
    if (BOT_UA_REGEX.test(ua)) return true;
  }

  return false;
}

async function firstRow<T>(stmt: D1PreparedStatement): Promise<T | null> {
  return (await stmt.first()) as T | null;
}

async function allRows<T>(stmt: D1PreparedStatement): Promise<T[]> {
  const res = (await stmt.all()) as { results?: T[] };
  return res.results || [];
}

async function loadPage(c: any, slug: string): Promise<PageContent | null> {
  const row = await firstRow<any>(c.env.DB.prepare('SELECT * FROM pages WHERE slug = ?').bind(slug));
  if (!row) return null;

  const sectionsEn = safeArrayJSON(row.sections_json_en).length
    ? safeArrayJSON(row.sections_json_en)
    : fallback(row.bodyMarkdown)
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);

  const sectionsZh = safeArrayJSON(row.sections_json_zh).length
    ? safeArrayJSON(row.sections_json_zh)
    : fallback(row.summary_zh || row.summary_en || row.intro)
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);

  return {
    slug,
    titleEn: fallback(row.title_en, fallback(row.title, 'G7 Pets Grooming')),
    titleZh: fallback(row.title_zh, fallback(row.title_en, fallback(row.title, 'G7 宠物美容'))),
    summaryEn: fallback(row.summary_en, fallback(row.intro)),
    summaryZh: fallback(row.summary_zh, fallback(row.summary_en, fallback(row.intro))),
    descriptionEn: fallback(row.description_en, fallback(row.metaDescription)),
    descriptionZh: fallback(row.description_zh, fallback(row.description_en, fallback(row.metaDescription))),
    sectionsEn,
    sectionsZh,
    canonicalPath: fallback(row.canonicalPath, SLUG_TO_PATH[slug as keyof typeof SLUG_TO_PATH] || '/')
  };
}

async function loadSiteNAP(c: any): Promise<SiteNAP> {
  const row = await firstRow<any>(c.env.DB.prepare('SELECT * FROM pages WHERE slug = ?').bind('site'));
  return {
    nameEn: fallback(row?.nap_name_en, fallback(row?.napName, 'G7 Pets Grooming')),
    nameZh: fallback(row?.nap_name_zh, fallback(row?.nap_name_en, 'G7 宠物美容')),
    addressEn: fallback(row?.nap_address_en, fallback(row?.napAddress, '81 Harp Rd, Kew East VIC 3102')),
    addressZh: fallback(row?.nap_address_zh, fallback(row?.nap_address_en, '澳大利亚维州墨尔本 Kew East，Harp 路 81 号')),
    phone: fallback(row?.nap_phone, fallback(row?.napPhone, '0488668837')),
    phone2: fallback(row?.nap_phone2, fallback(row?.napPhone2, '0490685668')),
    openingHoursEn: fallback(row?.opening_hours_en, fallback(row?.openingHours, 'Thursday-Sunday: 9:00am-5:00pm')),
    openingHoursZh: fallback(row?.opening_hours_zh, '周四至周日：上午9:00 - 下午5:00'),
    mapsUrl: fallback(row?.mapsUrl, 'https://maps.app.goo.gl/wxkLwVRh7Q5D12Th9'),
    instagramUrl: fallback(row?.instagramUrl, 'https://instagram.com/g7petsgrooming?r=nametag')
  };
}

async function loadServices(c: any): Promise<ServiceContent[]> {
  const rows = await allRows<any>(
    c.env.DB.prepare('SELECT * FROM services ORDER BY COALESCE(sortOrder, 0) ASC, id ASC')
  );

  return rows.map((row) => {
    const bulletsEn = safeArrayJSON(row.bullets_json_en);
    const bulletsZh = safeArrayJSON(row.bullets_json_zh);
    return {
      titleEn: fallback(row.title_en, fallback(row.title, 'Service')),
      titleZh: fallback(row.title_zh, fallback(row.title_en, fallback(row.title, '服务项目'))),
      bulletsEn: bulletsEn.length ? bulletsEn : [fallback(row.summary), fallback(row.details)].filter(Boolean),
      bulletsZh: bulletsZh.length ? bulletsZh : [fallback(row.summary_zh, fallback(row.summary))].filter(Boolean)
    };
  });
}

async function loadFaqs(c: any): Promise<FaqContent[]> {
  const rows = await allRows<any>(c.env.DB.prepare('SELECT * FROM faq ORDER BY COALESCE(sortOrder, 0) ASC, id ASC'));

  return rows.map((row) => ({
    questionEn: fallback(row.question_en, fallback(row.question, 'Question')),
    questionZh: fallback(row.question_zh, fallback(row.question_en, fallback(row.question, '问题'))),
    answerEn: fallback(row.answer_en, fallback(row.answer, '')),
    answerZh: fallback(row.answer_zh, fallback(row.answer_en, fallback(row.answer, '')))
  }));
}

async function loadGallery(c: any): Promise<GalleryContent[]> {
  const rows = await allRows<any>(
    c.env.DB.prepare('SELECT * FROM gallery_images ORDER BY COALESCE(featured, 0) DESC, createdAt DESC, id DESC LIMIT 36')
  );

  return rows.map((row) => {
    const titleEn = fallback(row.title_en, fallback(row.title, 'Untitled'));
    const altEn = fallback(row.alt_en, fallback(row.alt, titleEn));
    const tags = safeArrayJSON(row.tags_json).length ? safeArrayJSON(row.tags_json) : safeArrayJSON(row.tagsJSON);
    const thumbKey = fallback(row.thumbKey, fallback(row.thumb_key));
    const mediaKey = fallback(row.r2Key, fallback(row.r2_key));

    return {
      id: Number(row.id || 0),
      titleEn,
      titleZh: fallback(row.title_zh, titleEn),
      altEn,
      altZh: fallback(row.alt_zh, altEn),
      tags,
      petType: fallback(row.pet_type, fallback(row.petType, 'pet')),
      beforeAfter: Number(row.before_after ?? row.beforeAfter ?? 0),
      imageUrl: mediaKey ? `/media/${encodeURIComponent(mediaKey)}` : fallback(row.public_url),
      thumbUrl: thumbKey ? `/thumb/${encodeURIComponent(thumbKey)}?w=640` : fallback(row.public_url),
      isPublished: Number(row.is_published ?? 1)
    };
  });
}

function markdownTop(c: any, canonicalPath: string, site: SiteNAP): string[] {
  return [
    `# ${site.nameEn} | ${site.nameZh}`,
    '',
    `Canonical: ${canonical(c, canonicalPath)}`,
    'Language: EN + ZH',
    'Location: Kew East, Melbourne, VIC, Australia',
    ''
  ];
}

function renderMarkdown(c: any, ctx: RenderContext): string {
  const { page, site, services, faqs, gallery } = ctx;
  const lines: string[] = markdownTop(c, page.canonicalPath, site);

  lines.push('## Summary (English)');
  lines.push('');
  lines.push(page.summaryEn || page.descriptionEn || '');
  lines.push('');
  lines.push('## 简介 (中文)');
  lines.push('');
  lines.push(page.summaryZh || page.descriptionZh || page.summaryEn || '');
  lines.push('');

  if (page.slug === 'services' || page.slug === 'home') {
    lines.push('## Services (English)');
    lines.push('');
    for (const s of services) {
      lines.push(`### ${s.titleEn}`);
      for (const b of s.bulletsEn) lines.push(`- ${b}`);
      lines.push('');
    }

    lines.push('## 服务项目 (中文)');
    lines.push('');
    for (const s of services) {
      lines.push(`### ${s.titleZh}`);
      for (const b of s.bulletsZh) lines.push(`- ${b}`);
      lines.push('');
    }
  }

  if (page.slug === 'faq') {
    lines.push('## FAQ (English)');
    lines.push('');
    for (const f of faqs) {
      lines.push(`### ${f.questionEn}`);
      lines.push(f.answerEn);
      lines.push('');
    }

    lines.push('## 常见问题 (中文)');
    lines.push('');
    for (const f of faqs) {
      lines.push(`### ${f.questionZh}`);
      lines.push(f.answerZh);
      lines.push('');
    }
  }

  if (page.slug === 'gallery') {
    lines.push('## Gallery (English)');
    lines.push('');
    lines.push(`- Published images: ${gallery.filter((g) => g.isPublished).length}`);
    lines.push('');

    for (const g of gallery.filter((x) => x.isPublished)) {
      lines.push(`### ${g.titleEn}`);
      lines.push(`- Alt: ${g.altEn}`);
      lines.push(`- Pet Type: ${g.petType}`);
      lines.push(`- Before/After: ${g.beforeAfter ? 'Yes' : 'No'}`);
      lines.push(`- URL: ${baseUrl(c)}${g.imageUrl}`);
      lines.push('');
    }

    lines.push('## 图库 (中文)');
    lines.push('');
    for (const g of gallery.filter((x) => x.isPublished)) {
      lines.push(`### ${g.titleZh}`);
      lines.push(`- 说明：${g.altZh}`);
      lines.push(`- 宠物类型：${g.petType}`);
      lines.push(`- 对比图：${g.beforeAfter ? '是' : '否'}`);
      lines.push(`- 链接：${baseUrl(c)}${g.imageUrl}`);
      lines.push('');
    }
  }

  lines.push('## Business Information');
  lines.push('');
  lines.push(`- Name: ${site.nameEn}`);
  lines.push(`- Address: ${site.addressEn}`);
  lines.push(`- Phone: ${site.phone}`);
  lines.push(`- Opening Hours: ${site.openingHoursEn}`);
  lines.push('');

  lines.push('## 商家信息');
  lines.push('');
  lines.push(`- 店名：${site.nameZh}`);
  lines.push(`- 地址：${site.addressZh}`);
  lines.push(`- 电话：${site.phone} / ${site.phone2}`);
  lines.push(`- 营业时间：${site.openingHoursZh}`);
  lines.push('');

  return `${lines.join('\n')}\n`;
}

function renderAiAggregate(c: any, site: SiteNAP, pages: PageContent[], services: ServiceContent[], faqs: FaqContent[]): string {
  const lines: string[] = markdownTop(c, '/ai', site);

  lines.push('## Site Overview (English)');
  lines.push('');
  lines.push('G7 Pets Grooming is a professional boutique grooming salon in Kew East, Melbourne, with dog and cat grooming plus daycare support.');
  lines.push('');

  lines.push('## 全站概览 (中文)');
  lines.push('');
  lines.push('G7 宠物美容位于墨尔本 Kew East，提供专业狗狗与猫咪美容、洗护和日托服务。');
  lines.push('');

  lines.push('## Page Summaries (English + 中文)');
  lines.push('');
  for (const p of pages.filter((x) => x.slug !== 'site' && x.slug !== 'ai')) {
    const path = SLUG_TO_PATH[p.slug as keyof typeof SLUG_TO_PATH] || '/';
    lines.push(`### ${p.titleEn} / ${p.titleZh}`);
    lines.push(`- URL: ${canonical(c, path)}`);
    lines.push(`- EN: ${p.summaryEn}`);
    lines.push(`- 中文: ${p.summaryZh}`);
    lines.push('');
  }

  lines.push('## Markdown Links');
  lines.push('');
  lines.push(`- ${canonical(c, '/services.md')}`);
  lines.push(`- ${canonical(c, '/gallery.md')}`);
  lines.push(`- ${canonical(c, '/pricing.md')}`);
  lines.push(`- ${canonical(c, '/faq.md')}`);
  lines.push(`- ${canonical(c, '/contact.md')}`);
  lines.push(`- ${canonical(c, '/ai.md')}`);
  lines.push('');

  lines.push('## Services Snapshot (EN + 中文)');
  lines.push('');
  for (const s of services) {
    lines.push(`- ${s.titleEn} / ${s.titleZh}`);
  }
  lines.push('');

  lines.push('## FAQ Highlights (EN + 中文)');
  lines.push('');
  for (const f of faqs.slice(0, 6)) {
    lines.push(`- Q: ${f.questionEn}`);
    lines.push(`  - A: ${f.answerEn}`);
    lines.push(`  - 问: ${f.questionZh}`);
    lines.push(`  - 答: ${f.answerZh}`);
  }
  lines.push('');

  lines.push('## NAP (EN + 中文)');
  lines.push('');
  lines.push(`- Name / 店名: ${site.nameEn} / ${site.nameZh}`);
  lines.push(`- Address / 地址: ${site.addressEn} / ${site.addressZh}`);
  lines.push(`- Phone / 电话: ${site.phone} / ${site.phone2}`);
  lines.push(`- Opening Hours / 营业时间: ${site.openingHoursEn} / ${site.openingHoursZh}`);
  lines.push(`- Maps: ${site.mapsUrl}`);
  lines.push(`- Instagram: ${site.instagramUrl}`);
  lines.push('');

  return `${lines.join('\n')}\n`;
}

function localBusinessJsonLd(c: any, pagePath: string, site: SiteNAP): string {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: site.nameEn,
    url: canonical(c, pagePath),
    telephone: site.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.addressEn,
      addressCountry: 'AU'
    },
    openingHours: site.openingHoursEn,
    sameAs: [site.instagramUrl]
  };
  return JSON.stringify(data);
}

function renderHTML(c: any, ctx: RenderContext, aiAggregateMarkdown?: string): string {
  const { page, site, services, faqs, gallery } = ctx;
  const path = SLUG_TO_PATH[page.slug as keyof typeof SLUG_TO_PATH] || '/';

  const nav = PAGE_ORDER.filter((slug) => slug !== 'home' && slug !== 'ai').map((slug) => {
    const p = SLUG_TO_PATH[slug];
    const label = slug.toUpperCase();
    const active = p === path ? ' aria-current="page"' : '';
    return `<a${active} href="${p}">${label}</a>`;
  });

  let dynamic = `<section><h1>${escapeHtml(page.titleEn)}</h1><p>${escapeHtml(page.summaryEn)}</p><p>${escapeHtml(page.summaryZh)}</p></section>`;

  if (page.slug === 'services' || page.slug === 'home') {
    const cards = services
      .map(
        (s) => `<article><h2>${escapeHtml(s.titleEn)} / ${escapeHtml(s.titleZh)}</h2><ul>${s.bulletsEn
            .map((b) => `<li>${escapeHtml(b)}</li>`)
            .join('')}</ul></article>`
      )
      .join('');
    dynamic += `<section><h2>Services</h2><div class="grid">${cards}</div></section>`;
  }

  if (page.slug === 'faq') {
    dynamic += `<section><h2>FAQ</h2>${faqs
      .map(
        (f) => `<article><h3>${escapeHtml(f.questionEn)}</h3><p>${escapeHtml(f.answerEn)}</p><h3>${escapeHtml(
            f.questionZh
          )}</h3><p>${escapeHtml(f.answerZh)}</p></article>`
      )
      .join('')}</section>`;
  }

  if (page.slug === 'gallery') {
    dynamic += `<section><h2>Gallery</h2><div class="gallery">${gallery
      .filter((g) => g.isPublished)
      .map(
        (g) => `<article><a href="${escapeHtml(g.imageUrl)}" target="_blank" rel="noopener"><img src="${escapeHtml(
            g.thumbUrl
          )}" srcset="${escapeHtml(g.thumbUrl.replace('?w=640', '?w=320'))} 320w, ${escapeHtml(
            g.thumbUrl
          )} 640w, ${escapeHtml(g.thumbUrl.replace('?w=640', '?w=960'))} 960w" sizes="(max-width: 768px) 100vw, 33vw" width="560" height="560" loading="lazy" decoding="async" alt="${escapeHtml(
            g.altEn
          )}" /></a><h3>${escapeHtml(g.titleEn)} / ${escapeHtml(g.titleZh)}</h3></article>`
      )
      .join('')}</div></section>`;
  }

  if (page.slug === 'ai') {
    dynamic += `<section><h2>AI Aggregate (Preview)</h2><pre>${escapeHtml(aiAggregateMarkdown || '')}</pre></section>`;
  }

  dynamic += `<section>
    <h2>Business Information / 商家信息</h2>
    <p><strong>Name / 店名:</strong> ${escapeHtml(site.nameEn)} / ${escapeHtml(site.nameZh)}</p>
    <p><strong>Address / 地址:</strong> <a href="${escapeHtml(site.mapsUrl)}" target="_blank" rel="noopener">${escapeHtml(
      site.addressEn
    )}</a> / ${escapeHtml(site.addressZh)}</p>
    <p><strong>Phone / 电话:</strong> <a href="tel:${escapeHtml(site.phone)}">${escapeHtml(site.phone)}</a> / <a href="tel:${escapeHtml(
      site.phone2
    )}">${escapeHtml(site.phone2)}</a></p>
    <p><strong>Opening Hours / 营业时间:</strong> ${escapeHtml(site.openingHoursEn)} / ${escapeHtml(site.openingHoursZh)}</p>
  </section>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${escapeHtml(page.titleEn)} | ${escapeHtml(page.titleZh)}</title>
  <meta name="description" content="${escapeHtml(page.descriptionEn || page.summaryEn)}" />
  <link rel="canonical" href="${canonical(c, path)}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(page.titleEn)}" />
  <meta property="og:description" content="${escapeHtml(page.descriptionEn || page.summaryEn)}" />
  <meta property="og:url" content="${canonical(c, path)}" />
  <script type="application/ld+json">${localBusinessJsonLd(c, path, site)}</script>
  <style>
    body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;line-height:1.6;background:#f7f4ee;color:#4c5550}
    header{position:sticky;top:0;background:#fff;border-bottom:1px solid #e4ddd2}
    .wrap{max-width:1080px;margin:0 auto;padding:0 16px}
    nav{display:flex;gap:8px;overflow:auto;padding:10px 0}
    nav a{padding:10px 12px;border-radius:999px;text-decoration:none;color:#4c5550;min-height:44px;display:inline-flex;align-items:center}
    nav a[aria-current="page"]{background:#eaf5ef;color:#4e8e6e}
    section,article{background:#f1ece4;border:1px solid #e4ddd2;border-radius:14px;padding:16px;margin:12px 0}
    .grid{display:grid;gap:12px;grid-template-columns:repeat(3,minmax(0,1fr))}
    .gallery{display:grid;gap:12px;grid-template-columns:repeat(3,minmax(0,1fr))}
    img{max-width:100%;display:block;border-radius:12px;aspect-ratio:1/1;object-fit:cover}
    pre{white-space:pre-wrap;word-break:break-word;background:#fff;padding:12px;border-radius:10px;border:1px solid #ddd}
    @media (max-width:768px){.grid,.gallery{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <header><div class="wrap"><nav><a href="/"${path === '/' ? ' aria-current="page"' : ''}>HOME</a>${nav.join('')}</nav></div></header>
  <main><div class="wrap">${dynamic}</div></main>
</body>
</html>`;
}

async function buildRenderContext(c: any, slug: string): Promise<RenderContext | null> {
  const [page, site, services, faqs, gallery] = await Promise.all([
    loadPage(c, slug),
    loadSiteNAP(c),
    loadServices(c),
    loadFaqs(c),
    loadGallery(c)
  ]);

  if (!page) return null;
  return { page, site, services, faqs, gallery };
}

function sendHTML(html: string): Response {
  return new Response(html, {
    status: 200,
    headers: varyHeaders('text/html; charset=utf-8', 'public, max-age=300')
  });
}

function sendMarkdown(markdown: string): Response {
  return new Response(markdown, {
    status: 200,
    headers: varyHeaders('text/markdown; charset=utf-8', 'public, max-age=600')
  });
}

async function renderPage(c: any, slug: string): Promise<Response> {
  const ctx = await buildRenderContext(c, slug);
  if (!ctx) return new Response(`Missing page data for slug: ${slug}`, { status: 500 });

  const preferMd = detectPreferMarkdown(c);

  if (slug === 'ai') {
    const pages = (await Promise.all(PAGE_ORDER.filter((x) => x !== 'ai').map((s) => loadPage(c, s)))).filter(
      (x): x is PageContent => !!x
    );
    const aiMd = renderAiAggregate(c, ctx.site, pages, ctx.services, ctx.faqs);
    if (preferMd) return sendMarkdown(aiMd);
    return sendHTML(renderHTML(c, ctx, aiMd));
  }

  if (preferMd) return sendMarkdown(renderMarkdown(c, ctx));
  return sendHTML(renderHTML(c, ctx));
}

app.get('/', (c) => renderPage(c, 'home'));
app.get('/services', (c) => renderPage(c, 'services'));
app.get('/gallery', (c) => renderPage(c, 'gallery'));
app.get('/pricing', (c) => renderPage(c, 'pricing'));
app.get('/faq', (c) => renderPage(c, 'faq'));
app.get('/contact', (c) => renderPage(c, 'contact'));
app.get('/ai', (c) => renderPage(c, 'ai'));

app.get('/index.md', (c) => renderPage(c, 'home'));
app.get('/services.md', (c) => renderPage(c, 'services'));
app.get('/gallery.md', (c) => renderPage(c, 'gallery'));
app.get('/pricing.md', (c) => renderPage(c, 'pricing'));
app.get('/faq.md', (c) => renderPage(c, 'faq'));
app.get('/contact.md', (c) => renderPage(c, 'contact'));
app.get('/ai.md', (c) => renderPage(c, 'ai'));

app.get('/robots.txt', (c) => {
  const body = `User-agent: *\nAllow: /\nAllow: /*.md\nDisallow: /admin/\nSitemap: ${baseUrl(c)}/sitemap.xml\n`;
  return new Response(body, {
    status: 200,
    headers: varyHeaders('text/plain; charset=utf-8', 'public, max-age=600')
  });
});

app.get('/sitemap.xml', (c) => {
  const paths = ['/', '/services', '/services.md', '/gallery', '/gallery.md', '/pricing', '/pricing.md', '/faq', '/faq.md', '/contact', '/contact.md', '/ai', '/ai.md'];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
    .map((p) => `  <url><loc>${canonical(c, p)}</loc></url>`)
    .join('\n')}\n</urlset>`;
  return new Response(xml, {
    status: 200,
    headers: varyHeaders('application/xml; charset=utf-8', 'public, max-age=600')
  });
});

app.get('/thumb/:key', async (c) => {
  const key = decodeURIComponent(c.req.param('key'));
  const object = await c.env.GALLERY_BUCKET.get(key);
  if (!object) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(object.body, { headers });
});

app.get('/media/:key', async (c) => {
  const key = decodeURIComponent(c.req.param('key'));
  const object = await c.env.GALLERY_BUCKET.get(key);
  if (!object) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(object.body, { headers });
});

app.notFound(() => new Response('Not Found', { status: 404, headers: varyHeaders('text/plain; charset=utf-8', 'public, max-age=60') }));

export default app;
