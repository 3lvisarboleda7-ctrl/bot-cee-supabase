-- ============================================================
--  PRUEBA DE VALIDACIÓN DE RLS (aislamiento entre usuarios)
--  Simula 2 usuarios anónimos con auth.uid() distintos.
--  Resultado esperado: A ve sus datos, B ve 0 de A.
--  (El SQL Editor muestra solo el resultado del último SELECT;
--   correr cada bloque por separado para ver A=… y B=0.)
-- ============================================================

-- === USUARIO A crea una conversación y la ve ===
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

  insert into public.conversations (user_id, title)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Conversación privada de A');

  select 'Usuario A ve:' as resultado, count(*) as total
  from public.conversations;
commit;

-- === USUARIO B intenta espiar (debe ver 0) ===
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';

  select 'Usuario B ve:' as resultado, count(*) as total
  from public.conversations;
commit;

-- === Limpieza de los datos de la prueba ===
delete from public.conversations
where user_id in (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
);
