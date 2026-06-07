-- ============================================================
--  CONSULTAS DE VERIFICACIÓN — Bot CEE (Persona 3)
--  Copiar y correr en: Supabase -> SQL Editor
--  Sirven para comprobar el estado de la base de datos.
-- ============================================================

-- 1) Conteo general: ¿cuántas conversaciones y mensajes hay?
select
  (select count(*) from public.conversations) as total_conversaciones,
  (select count(*) from public.messages)      as total_mensajes;

-- 2) Últimas conversaciones con su número de mensajes
select c.title,
       count(m.id)        as mensajes,
       max(m.created_at)  as ultimo_mensaje
from public.conversations c
left join public.messages m on m.conversation_id = c.id
group by c.title
order by ultimo_mensaje desc nulls last
limit 20;

-- 3) Ver una conversación completa (la más reciente)
select m.role, m.content, m.created_at
from public.messages m
where m.conversation_id = (
  select id from public.conversations order by updated_at desc limit 1
)
order by m.created_at;

-- 4) Distribución de mensajes por rol (user / assistant / system)
select role, count(*) as cantidad
from public.messages
group by role
order by cantidad desc;

-- 5) Promedio de tokens y longitud de respuestas del asistente
select count(*)                         as respuestas_bot,
       round(avg(token_count), 1)       as tokens_promedio,
       round(avg(length(content)), 1)   as caracteres_promedio
from public.messages
where role = 'assistant';

-- 6) SEGURIDAD: verificar que RLS está ACTIVO en ambas tablas (rowsecurity = true)
select tablename, rowsecurity as rls_activo
from pg_tables
where schemaname = 'public'
  and tablename in ('conversations','messages');

-- 7) SEGURIDAD: listar las políticas RLS definidas
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 8) LIMPIEZA: ver los jobs programados de pg_cron (deben estar active = true)
select jobid, jobname, schedule, active
from cron.job
order by jobid;

-- 9) Actividad por día (útil para análisis de uso)
select date_trunc('day', created_at)::date as dia,
       count(*)                            as mensajes
from public.messages
group by dia
order by dia desc
limit 14;
