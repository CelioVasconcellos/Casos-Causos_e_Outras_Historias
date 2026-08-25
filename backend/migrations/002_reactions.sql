CREATE TABLE IF NOT EXISTS reactions (
  id INTEGER PRIMARY KEY,
  story_id INTEGER NOT NULL,
  emoji VARCHAR(8) NOT NULL,
  fingerprint_hash VARCHAR(64) NOT NULL,
  ip_hash VARCHAR(64) NOT NULL,
  user_agent_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_reactions_story_emoji_fingerprint
  ON reactions (story_id, emoji, fingerprint_hash);

CREATE INDEX IF NOT EXISTS ix_reactions_story_id ON reactions (story_id);
CREATE INDEX IF NOT EXISTS ix_reactions_emoji ON reactions (emoji);
CREATE INDEX IF NOT EXISTS ix_reactions_fingerprint_hash ON reactions (fingerprint_hash);
CREATE INDEX IF NOT EXISTS ix_reactions_ip_hash ON reactions (ip_hash);

CREATE TABLE IF NOT EXISTS reaction_blocks (
  id INTEGER PRIMARY KEY,
  fingerprint_hash VARCHAR(64),
  ip_hash VARCHAR(64),
  reason VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS ix_reaction_blocks_fingerprint_hash ON reaction_blocks (fingerprint_hash);
CREATE INDEX IF NOT EXISTS ix_reaction_blocks_ip_hash ON reaction_blocks (ip_hash);
CREATE INDEX IF NOT EXISTS ix_reaction_blocks_expires_at ON reaction_blocks (expires_at);
