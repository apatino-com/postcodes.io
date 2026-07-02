CREATE EXTENSION IF NOT EXISTS pg_prewarm;

VACUUM ANALYZE;

SELECT pg_prewarm(c.oid::regclass)
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'i', 'm');
