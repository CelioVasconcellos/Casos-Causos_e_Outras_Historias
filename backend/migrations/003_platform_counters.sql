CREATE TABLE IF NOT EXISTS anonymous_visitors (
  id INTEGER PRIMARY KEY,
  visitor_hash VARCHAR(64) NOT NULL UNIQUE,
  first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_anonymous_visitors_visitor_hash
  ON anonymous_visitors (visitor_hash);

CREATE TABLE IF NOT EXISTS logged_user_presence (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_logged_user_presence_user_id
  ON logged_user_presence (user_id);

CREATE INDEX IF NOT EXISTS ix_logged_user_presence_last_seen_at
  ON logged_user_presence (last_seen_at);
