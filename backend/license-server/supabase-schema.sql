-- Gestor Web - Supabase DB-only license schema
-- Ejecutar en Supabase SQL Editor.

create table if not exists public.licenses (
  id text primary key,
  hwid text not null,
  app text not null default 'gestor-web',
  plan text not null,
  tier text not null default 'standard',
  features jsonb not null default '["standard"]'::jsonb,
  issued_at bigint not null,
  expires_at bigint,
  revoked boolean not null default false,
  revoke_reason text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_check_at timestamptz,
  last_hwid text,
  license_hash text not null unique,
  license_text text not null
);

create index if not exists idx_licenses_hwid on public.licenses(hwid);
create index if not exists idx_licenses_hash on public.licenses(license_hash);
create index if not exists idx_licenses_revoked on public.licenses(revoked);
create index if not exists idx_licenses_expires_at on public.licenses(expires_at);

alter table public.licenses enable row level security;

-- No se crean policies de SELECT/INSERT/UPDATE para anon.
-- La app publica solo puede ejecutar verify_license_public.
-- El service_role de Supabase sigue pudiendo administrar la tabla desde los scripts.

drop function if exists public.verify_license_public(text, text, text);

create or replace function public.verify_license_public(
  p_id text,
  p_hwid text,
  p_license_hash text
)
returns table (
  active boolean,
  reason text,
  id text,
  plan text,
  tier text,
  expires_at bigint,
  revoked boolean,
  server_time bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  lic public.licenses%rowtype;
  now_ms bigint;
begin
  now_ms := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;

  select * into lic
  from public.licenses
  where licenses.id = p_id
    and licenses.hwid = p_hwid
    and licenses.license_hash = p_license_hash
  limit 1;

  if not found then
    return query select false, 'licencia no registrada o no coincide con HWID'::text, p_id, null::text, null::text, null::bigint, false, now_ms;
    return;
  end if;

  if lic.revoked then
    return query select false, coalesce(lic.revoke_reason, 'licencia revocada')::text, lic.id, lic.plan, lic.tier, lic.expires_at, true, now_ms;
    return;
  end if;

  if lic.expires_at is not null and now_ms > lic.expires_at then
    return query select false, 'licencia expirada'::text, lic.id, lic.plan, lic.tier, lic.expires_at, false, now_ms;
    return;
  end if;

  update public.licenses
  set last_check_at = clock_timestamp(),
      last_hwid = p_hwid
  where licenses.id = lic.id;

  return query select true, 'ok'::text, lic.id, lic.plan, lic.tier, lic.expires_at, false, now_ms;
end;
$$;

revoke all on function public.verify_license_public(text, text, text) from public;
grant execute on function public.verify_license_public(text, text, text) to anon;
grant execute on function public.verify_license_public(text, text, text) to authenticated;
