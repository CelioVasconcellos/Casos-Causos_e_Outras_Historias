-- Adds author ownership and the moderator's correction message.
ALTER TYPE storystatus ADD VALUE IF NOT EXISTS 'needs_revision';

ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS author_id INTEGER,
  ADD COLUMN IF NOT EXISTS moderation_note TEXT;

CREATE INDEX IF NOT EXISTS ix_stories_author_id ON stories (author_id);
