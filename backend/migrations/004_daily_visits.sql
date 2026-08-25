CREATE TABLE IF NOT EXISTS daily_visits (
  id INTEGER PRIMARY KEY,
  visit_date VARCHAR(10) NOT NULL,
  visitor_hash VARCHAR(64) NOT NULL,
  source VARCHAR(16) NOT NULL DEFAULT 'anonymous',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_daily_visits_date_visitor
  ON daily_visits (visit_date, visitor_hash);

CREATE INDEX IF NOT EXISTS ix_daily_visits_visit_date
  ON daily_visits (visit_date);

CREATE INDEX IF NOT EXISTS ix_daily_visits_visitor_hash
  ON daily_visits (visitor_hash);
