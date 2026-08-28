-- Migração 010: remove contagens antigas geradas antes de ignorar usuários logados.
-- As visualizações anônimas serão reconstruídas com a regra correta.
TRUNCATE TABLE story_views;