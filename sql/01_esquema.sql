-- ============================================================
--  CHATBOT CEE · Esquema mínimo sin login visible (Persona 3)
--  Diseñado para Supabase Free Tier + Anonymous Auth
--  Ejecutar en: Supabase -> SQL Editor
-- ============================================================

-- 1) CONVERSACIONES (sin tabla de perfiles — la identidad viene de auth.uid())
create table if not exists public.conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,  -- UUID que Supabase asigna via auth.uid() (anónimo o autenticado)
  title       text not null default 'Nueva conversación',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2) MENSAJES
create table if not exists public.messages (
  id              bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role            text not null check (role in ('user','assistant','system')),
  content         text not null,
  token_count     int,
  created_at      timestamptz not null default now()
);

-- ÍNDICES (solo los necesarios -> menos espacio y consultas rápidas)
create index if not exists idx_conversations_user
  on public.conversations(user_id, updated_at desc);
create index if not exists idx_messages_conversation
  on public.messages(conversation_id, created_at);

-- ============================================================
--  ROW LEVEL SECURITY (cada usuario anónimo/autenticado ve lo suyo)
-- ============================================================
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;

create policy "conversaciones propias" on public.conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "mensajes de mis conversaciones" on public.messages
  for all using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

-- TRIGGER: actualizar updated_at de la conversación al insertar mensaje
create or replace function public.touch_conversation()
returns trigger language plpgsql as $$
begin
  update public.conversations
     set updated_at = now()
   where id = new.conversation_id;
  return new;
end; $$;

create trigger trg_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation();
