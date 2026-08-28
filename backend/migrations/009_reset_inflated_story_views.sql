-- Migração 009: remove visualizações infladas pelo registro repetido da versão anterior.
-- As contagens serão reconstruídas corretamente a partir do próximo acesso real.
TRUNCATE TABLE story_views;
