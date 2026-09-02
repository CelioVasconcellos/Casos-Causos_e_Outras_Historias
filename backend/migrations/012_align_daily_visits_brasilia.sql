-- Realinha registros gravados antes da adoção do fuso America/Sao_Paulo.
-- created_at é armazenado em UTC; visit_date deve representar o dia em Brasília.
WITH corrected_dates AS (
  SELECT
    id,
    visitor_hash,
    TO_CHAR(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS local_date
  FROM daily_visits
), duplicates AS (
  SELECT incorrect.id
  FROM corrected_dates incorrect
  JOIN daily_visits correct
    ON correct.visitor_hash = incorrect.visitor_hash
   AND correct.visit_date = incorrect.local_date
  WHERE incorrect.visit_date <> incorrect.local_date
)
DELETE FROM daily_visits
WHERE id IN (SELECT id FROM duplicates);

UPDATE daily_visits
SET visit_date = TO_CHAR(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD')
WHERE visit_date <> TO_CHAR(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD');