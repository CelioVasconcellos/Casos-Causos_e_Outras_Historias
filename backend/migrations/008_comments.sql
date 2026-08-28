-- Migração 008: comentários identificados e moderados antes da publicação.
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_name VARCHAR(100) NOT NULL,
    comment_text TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    moderation_note TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS ix_comments_story_id ON comments (story_id);
CREATE INDEX IF NOT EXISTS ix_comments_author_id ON comments (author_id);
CREATE INDEX IF NOT EXISTS ix_comments_deleted_at ON comments (deleted_at);