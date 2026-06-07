-- ============================================================
--  LIMPIEZA AUTOMÁTICA · pg_cron · Retención 30 días (Persona 3)
--  Requisito: habilitar la extensión pg_cron en
--  Supabase -> Database -> Extensions (buscar "pg_cron").
-- ============================================================

-- Job 1: borrar mensajes con más de 30 días (diario, 3:00 AM UTC)
select cron.schedule(
  'limpieza_mensajes',
  '0 3 * * *',
  $$ delete from public.messages where created_at < now() - interval '30 days'; $$
);

-- Job 2: borrar conversaciones inactivas >30 días (domingos, 4:00 AM UTC)
--          el ON DELETE CASCADE borra automáticamente sus mensajes
select cron.schedule(
  'limpieza_conversaciones',
  '0 4 * * 0',
  $$ delete from public.conversations where updated_at < now() - interval '30 days'; $$
);

-- Verificar que los jobs quedaron activos
select jobid, jobname, schedule, active
from cron.job
order by jobid;
