-- Gestor Web - licencia por dias + seguridad
-- Ejecutar una vez en Supabase SQL Editor si se instala desde cero o en otra base.

alter table public.licenses
  add column if not exists suspended boolean not null default false,
  add column if not exists suspend_reason text,
  add column if not exists suspended_at timestamptz,
  add column if not exists validation_failures integer not null default 0,
  add column if not exists last_ip text,
  add column if not exists last_user_agent text,
  add column if not exists mismatched_hwid_count integer not null default 0,
  add column if not exists last_mismatched_hwid text,
  add column if not exists last_mismatched_at timestamptz;

create table if not exists public.license_events (
  id uuid primary key default gen_random_uuid(),
  license_id text not null,
  action text not null,
  detail text,
  actor_license_id text,
  actor_hwid text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists license_events_license_id_idx on public.license_events (license_id, created_at desc);
create index if not exists license_events_action_idx on public.license_events (action, created_at desc);

alter table public.license_events enable row level security;

-- La funcion verify_license_public debe devolver false para revoked, suspended o expired.
-- Tambien debe actualizar validation_failures, last_ip, last_user_agent,
-- mismatched_hwid_count, last_mismatched_hwid y last_mismatched_at.
