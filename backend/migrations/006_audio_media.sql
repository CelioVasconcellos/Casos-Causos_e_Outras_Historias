-- Migração 006: permite áudio como mídia de uma história.
-- PostgreSQL usa um enum para MediaType; SQLite recria o enum via SQLAlchemy em bancos novos.
ALTER TYPE mediatype ADD VALUE IF NOT EXISTS 'audio';