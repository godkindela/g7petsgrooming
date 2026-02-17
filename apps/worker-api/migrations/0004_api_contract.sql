CREATE TABLE IF NOT EXISTS api_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_doc_tags (
  doc_id TEXT NOT NULL,
  tag_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (doc_id, tag_id),
  FOREIGN KEY (doc_id) REFERENCES pages(slug) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES api_tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_api_doc_tags_doc_id ON api_doc_tags(doc_id);
CREATE INDEX IF NOT EXISTS idx_api_doc_tags_tag_id ON api_doc_tags(tag_id);

CREATE TABLE IF NOT EXISTS api_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO api_jobs (id, job_type, status, payload_json)
VALUES
  (1, 'content.reindex', 'done', '{"source":"seed"}'),
  (2, 'gallery.sync', 'queued', '{"source":"seed"}');
