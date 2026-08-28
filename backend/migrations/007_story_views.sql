-- Migração 007: visualizações únicas e anônimas por história.
CREATE TABLE IF NOT EXISTS story_views (
    id SERIAL PRIMARY KEY,
    story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    visitor_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_story_views_story_visitor UNIQUE (story_id, visitor_hash)
);
CREATE INDEX IF NOT EXISTS ix_story_views_story_id ON story_views (story_id);
CREATE INDEX IF NOT EXISTS ix_story_views_visitor_hash ON story_views (visitor_hash);