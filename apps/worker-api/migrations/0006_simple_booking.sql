ALTER TABLE services ADD COLUMN name TEXT NOT NULL DEFAULT '';
ALTER TABLE services ADD COLUMN duration_min INTEGER NOT NULL DEFAULT 60;
ALTER TABLE services ADD COLUMN price_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE services ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;
ALTER TABLE services ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

UPDATE services
SET
  name = CASE
    WHEN trim(COALESCE(name, '')) = '' THEN COALESCE(title, 'Service')
    ELSE name
  END,
  duration_min = CASE WHEN duration_min <= 0 THEN 60 ELSE duration_min END,
  sort_order = CASE WHEN sort_order = 0 THEN COALESCE(sortOrder, id) ELSE sort_order END;

CREATE TABLE IF NOT EXISTS slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1,
  booked_count INTEGER NOT NULL DEFAULT 0,
  is_open INTEGER NOT NULL DEFAULT 1,
  service_id INTEGER NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (service_id) REFERENCES services(id)
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slot_id INTEGER NOT NULL,
  service_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  pet_name TEXT NULL,
  pet_breed TEXT NULL,
  notes TEXT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (slot_id) REFERENCES slots(id),
  FOREIGN KEY (service_id) REFERENCES services(id)
);

CREATE TABLE IF NOT EXISTS booking_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  event TEXT NOT NULL,
  at TEXT NOT NULL,
  meta_json TEXT NULL,
  FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_slots_start_at_unique ON slots(start_at);
CREATE INDEX IF NOT EXISTS idx_slots_start_at ON slots(start_at);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_client_phone ON bookings(client_phone);
CREATE INDEX IF NOT EXISTS idx_booking_events_booking_id ON booking_events(booking_id);
