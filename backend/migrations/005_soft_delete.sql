-- Migração 005: soft delete de histórias
-- Adiciona coluna deleted_at: preenchida quando a história é excluída (recuperável).
-- Execute no Shell do Render ou direto no PostgreSQL de produção.

ALTER TABLE stories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
CREATE INDEX IF NOT EXISTS ix_stories_deleted_at ON stories (deleted_at);
