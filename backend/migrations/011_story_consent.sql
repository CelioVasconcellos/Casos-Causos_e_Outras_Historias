-- Migração 011: registra o consentimento do autor para publicação no mural e uso futuro em e-book.
ALTER TABLE stories ADD COLUMN IF NOT EXISTS consent_publish BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS consent_ebook BOOLEAN NOT NULL DEFAULT FALSE;
