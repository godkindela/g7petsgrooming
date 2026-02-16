CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  sortOrder INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS faq (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pages (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  metaDescription TEXT NOT NULL,
  h1 TEXT NOT NULL,
  intro TEXT NOT NULL,
  bodyMarkdown TEXT NOT NULL DEFAULT '',
  canonicalPath TEXT NOT NULL,
  napName TEXT,
  napAddress TEXT,
  napPhone TEXT,
  napPhone2 TEXT,
  openingHours TEXT,
  mapsUrl TEXT,
  instagramUrl TEXT,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO pages (
  slug, title, metaDescription, h1, intro, bodyMarkdown, canonicalPath,
  napName, napAddress, napPhone, napPhone2, openingHours, mapsUrl, instagramUrl
) VALUES (
  'site',
  'G7 Pets Grooming',
  'Professional pet grooming and daycare in Kew East, Melbourne.',
  'G7 Pets Grooming',
  'Trusted local pet grooming service in Melbourne.',
  'Core NAP profile and global SEO business data.',
  '/',
  'G7 Pets Grooming',
  '81 Harp Rd, Kew East VIC 3102',
  '0488668837',
  '0490685668',
  'Thursday-Sunday: 9:00am-5:00pm',
  'https://maps.app.goo.gl/wxkLwVRh7Q5D12Th9',
  'https://instagram.com/g7petsgrooming?r=nametag'
);

INSERT OR IGNORE INTO pages (slug, title, metaDescription, h1, intro, bodyMarkdown, canonicalPath) VALUES
('home', 'Pet Grooming in Kew East Melbourne | G7 Pets Grooming', 'Dog and cat grooming, wash, style cut, and daycare services in Kew East VIC.', 'Best place for pet grooming and daycare', 'Professional dog and cat grooming in Kew East, Melbourne.', '## What We Offer\n- Breed styling\n- Wash and blow dry\n- Cat grooming\n- Daycare support', '/'),
('services', 'Dog & Cat Grooming Services | G7 Pets Grooming', 'Explore full grooming, wash and dry, and cat grooming services in Melbourne.', 'Pet Grooming Services', 'Our team provides grooming plans based on coat condition and pet comfort.', 'Service catalog is managed from D1 table `services`.', '/services'),
('gallery', 'Pet Grooming Gallery | G7 Pets Grooming', 'View pet grooming photos and transformations from G7 Pets Grooming.', 'Pet Grooming Gallery', 'Browse recent grooming outcomes and featured before/after results.', 'Gallery items are sourced from D1 table `gallery_images` and images from R2.', '/gallery'),
('pricing', 'Pet Grooming Pricing | G7 Pets Grooming', 'Estimated pricing for small, medium, and large pets plus cat grooming.', 'Pricing Guide', 'Final quote depends on pet size, coat condition, and grooming complexity.', '## Notes\n- Pricing may vary by coat and temperament\n- Confirm final quote during booking', '/pricing'),
('faq', 'Pet Grooming FAQ | G7 Pets Grooming', 'Frequently asked questions about pet grooming and booking.', 'Frequently Asked Questions', 'Common questions for first-time and returning pet owners.', 'FAQ answers are managed from D1 table `faq`.', '/faq'),
('contact', 'Contact Pet Groomer in Kew East | G7 Pets Grooming', 'Contact G7 Pets Grooming for bookings and service questions.', 'Contact G7 Pets Grooming', 'For bookings and service questions, call us directly or message via Instagram.', 'Use call links, map link, and opening hours below.', '/contact');

INSERT OR IGNORE INTO services (id, title, summary, details, sortOrder) VALUES
(1, 'Full Groom', 'Wash, dry, style cut, and hygiene trim.', 'Includes nails, ears, and coat finishing.', 1),
(2, 'Wash & Blow Dry', 'Coat cleansing and dry-off for routine maintenance.', 'Recommended between full grooming sessions.', 2),
(3, 'Cat Grooming', 'Gentle cat grooming and lion cut options.', 'Handled with low-stress grooming workflow.', 3),
(4, 'Daycare Add-on', 'Safe daycare option before or after grooming.', 'Useful for owners with fixed pickup times.', 4);

INSERT OR IGNORE INTO faq (id, question, answer, sortOrder) VALUES
(1, 'How often should my pet be groomed?', 'Most pets benefit from grooming every 4 to 8 weeks depending on coat type.', 1),
(2, 'Can you handle matted coats?', 'Yes. We assess matting severity and recommend the safest grooming plan.', 2),
(3, 'Can I request a style reference?', 'Yes. Bring a photo reference and we will align the cut style as closely as possible.', 3),
(4, 'Do you groom cats?', 'Yes, cat grooming appointments are available and should be booked in advance.', 4);
