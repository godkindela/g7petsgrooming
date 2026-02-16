ALTER TABLE pages ADD COLUMN title_en TEXT;
ALTER TABLE pages ADD COLUMN title_zh TEXT;
ALTER TABLE pages ADD COLUMN summary_en TEXT;
ALTER TABLE pages ADD COLUMN summary_zh TEXT;
ALTER TABLE pages ADD COLUMN description_en TEXT;
ALTER TABLE pages ADD COLUMN description_zh TEXT;
ALTER TABLE pages ADD COLUMN sections_json_en TEXT;
ALTER TABLE pages ADD COLUMN sections_json_zh TEXT;
ALTER TABLE pages ADD COLUMN nap_name_en TEXT;
ALTER TABLE pages ADD COLUMN nap_name_zh TEXT;
ALTER TABLE pages ADD COLUMN nap_address_en TEXT;
ALTER TABLE pages ADD COLUMN nap_address_zh TEXT;
ALTER TABLE pages ADD COLUMN nap_phone TEXT;
ALTER TABLE pages ADD COLUMN nap_phone2 TEXT;
ALTER TABLE pages ADD COLUMN opening_hours_en TEXT;
ALTER TABLE pages ADD COLUMN opening_hours_zh TEXT;

ALTER TABLE services ADD COLUMN title_en TEXT;
ALTER TABLE services ADD COLUMN title_zh TEXT;
ALTER TABLE services ADD COLUMN bullets_json_en TEXT;
ALTER TABLE services ADD COLUMN bullets_json_zh TEXT;

ALTER TABLE faq ADD COLUMN question_en TEXT;
ALTER TABLE faq ADD COLUMN question_zh TEXT;
ALTER TABLE faq ADD COLUMN answer_en TEXT;
ALTER TABLE faq ADD COLUMN answer_zh TEXT;

ALTER TABLE gallery_images ADD COLUMN title_en TEXT;
ALTER TABLE gallery_images ADD COLUMN title_zh TEXT;
ALTER TABLE gallery_images ADD COLUMN alt_en TEXT;
ALTER TABLE gallery_images ADD COLUMN alt_zh TEXT;
ALTER TABLE gallery_images ADD COLUMN tags_json TEXT;
ALTER TABLE gallery_images ADD COLUMN pet_type TEXT;
ALTER TABLE gallery_images ADD COLUMN before_after INTEGER;
ALTER TABLE gallery_images ADD COLUMN public_url TEXT;
ALTER TABLE gallery_images ADD COLUMN is_published INTEGER DEFAULT 1;
ALTER TABLE gallery_images ADD COLUMN created_at TEXT;

UPDATE pages
SET
  title_en = COALESCE(title_en, title),
  title_zh = COALESCE(title_zh, title_en, title),
  summary_en = COALESCE(summary_en, intro),
  summary_zh = COALESCE(summary_zh, summary_en, intro),
  description_en = COALESCE(description_en, metaDescription),
  description_zh = COALESCE(description_zh, description_en, metaDescription),
  sections_json_en = COALESCE(sections_json_en, '[]'),
  sections_json_zh = COALESCE(sections_json_zh, '[]'),
  nap_name_en = COALESCE(nap_name_en, napName),
  nap_name_zh = COALESCE(nap_name_zh, nap_name_en),
  nap_address_en = COALESCE(nap_address_en, napAddress),
  nap_address_zh = COALESCE(nap_address_zh, nap_address_en),
  nap_phone = COALESCE(nap_phone, napPhone),
  nap_phone2 = COALESCE(nap_phone2, napPhone2),
  opening_hours_en = COALESCE(opening_hours_en, openingHours),
  opening_hours_zh = COALESCE(opening_hours_zh, opening_hours_en);

UPDATE services
SET
  title_en = COALESCE(title_en, title),
  title_zh = COALESCE(title_zh, title_en, title),
  bullets_json_en = COALESCE(bullets_json_en, json_array(summary, details)),
  bullets_json_zh = COALESCE(bullets_json_zh, bullets_json_en);

UPDATE faq
SET
  question_en = COALESCE(question_en, question),
  question_zh = COALESCE(question_zh, question_en, question),
  answer_en = COALESCE(answer_en, answer),
  answer_zh = COALESCE(answer_zh, answer_en, answer);

UPDATE gallery_images
SET
  title_en = COALESCE(title_en, title),
  title_zh = COALESCE(title_zh, title_en, title),
  alt_en = COALESCE(alt_en, alt),
  alt_zh = COALESCE(alt_zh, alt_en, alt),
  tags_json = COALESCE(tags_json, tagsJSON, '[]'),
  pet_type = COALESCE(pet_type, petType, ''),
  before_after = COALESCE(before_after, beforeAfter, 0),
  created_at = COALESCE(created_at, createdAt, CURRENT_TIMESTAMP),
  is_published = COALESCE(is_published, 1);

INSERT OR IGNORE INTO pages (
  slug, title, metaDescription, h1, intro, bodyMarkdown, canonicalPath,
  title_en, title_zh, summary_en, summary_zh, description_en, description_zh,
  sections_json_en, sections_json_zh
) VALUES (
  'ai',
  'AI Aggregated Content',
  'Structured bilingual AI aggregation page for G7 Pets Grooming.',
  'AI Aggregated Content',
  'This page aggregates bilingual summaries for AI crawlers.',
  'Generated from D1 content tables.',
  '/ai',
  'AI Aggregated Content',
  'AI 聚合内容',
  'Bilingual structured site summary for AI systems.',
  '面向 AI 系统的中英双语结构化站点摘要。',
  'Bilingual AI-focused data feed for g7pets.com.au.',
  'g7pets.com.au 的 AI 双语数据摘要页面。',
  '[]',
  '[]'
);

UPDATE pages
SET
  nap_name_zh = 'G7 宠物美容',
  nap_address_zh = '澳大利亚维州墨尔本 Kew East，Harp 路 81 号',
  opening_hours_zh = '周四至周日：上午9:00 - 下午5:00'
WHERE slug = 'site';
