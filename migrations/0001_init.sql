CREATE TABLE IF NOT EXISTS gallery_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  r2Key TEXT NOT NULL,
  thumbKey TEXT NOT NULL,
  title TEXT NOT NULL,
  alt TEXT NOT NULL,
  tagsJSON TEXT NOT NULL DEFAULT '[]',
  petType TEXT NOT NULL DEFAULT '',
  beforeAfter INTEGER NOT NULL DEFAULT 0,
  pairedId INTEGER,
  featured INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gallery_createdAt ON gallery_images(createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_petType ON gallery_images(petType);
CREATE INDEX IF NOT EXISTS idx_gallery_beforeAfter ON gallery_images(beforeAfter);
CREATE INDEX IF NOT EXISTS idx_gallery_featured ON gallery_images(featured DESC);
