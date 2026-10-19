create extension if not exists pgcrypto;

create table if not exists public.election_state (
  id smallint primary key check (id = 1),
  is_open boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.election_state (id, is_open) values (1, false) on conflict (id) do nothing;

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null unique,
  option smallint not null check (option in (1, 2)),
  created_at timestamptz not null default now()
);

create table if not exists public.admin_login_attempts (
  client_key text primary key,
  failed_attempts integer not null default 0,
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz
);

alter table public.election_state enable row level security;
alter table public.votes enable row level security;
alter table public.admin_login_attempts enable row level security;
revoke all on public.election_state, public.votes, public.admin_login_attempts from public, anon, authenticated;
grant all on public.election_state, public.votes, public.admin_login_attempts to service_role;

create or replace function public.cast_vote(p_operation_id uuid, p_option smallint)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  existing_option smallint;
begin
  if p_option not in (1, 2) then raise exception 'INVALID_OPTION'; end if;
  perform id from public.election_state where id = 1 and is_open = true for share;
  if not found then
    select option into existing_option from public.votes where operation_id = p_operation_id;
    if found and existing_option = p_option then return p_operation_id; end if;
    raise exception 'VOTING_CLOSED';
  end if;
  insert into public.votes (operation_id, option) values (p_operation_id, p_option)
  on conflict (operation_id) do nothing;
  select option into existing_option from public.votes where operation_id = p_operation_id;
  if existing_option <> p_option then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  return p_operation_id;
end;
$$;

create or replace function public.get_election_results()
returns json
language sql
security definer
set search_path = public, pg_temp
as $$
  select json_build_object(
    'option1', (select count(*) from public.votes where option = 1),
    'option2', (select count(*) from public.votes where option = 2),
    'total', (select count(*) from public.votes),
    'open', (select is_open from public.election_state where id = 1),
    'updatedAt', now()
  );
$$;

create or replace function public.set_election_state(p_is_open boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.election_state set is_open = p_is_open, updated_at = now() where id = 1;
end;
$$;

create or replace function public.admin_login_allowed(p_client_key text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare attempt public.admin_login_attempts%rowtype;
begin
  insert into public.admin_login_attempts(client_key) values (p_client_key) on conflict (client_key) do nothing;
  select * into attempt from public.admin_login_attempts where client_key = p_client_key for update;
  if attempt.blocked_until is not null and attempt.blocked_until > now() then return false; end if;
  if attempt.window_started_at < now() - interval '15 minutes' then
    update public.admin_login_attempts set failed_attempts = 0, window_started_at = now(), blocked_until = null where client_key = p_client_key;
  end if;
  return true;
end;
$$;

create or replace function public.admin_login_succeeded(p_client_key text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.admin_login_attempts set failed_attempts = 0, window_started_at = now(), blocked_until = null where client_key = p_client_key;
$$;

create or replace function public.admin_login_failed(p_client_key text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare attempts integer;
begin
  insert into public.admin_login_attempts(client_key) values (p_client_key) on conflict (client_key) do nothing;
  update public.admin_login_attempts
  set failed_attempts = case when window_started_at < now() - interval '15 minutes' then 1 else failed_attempts + 1 end,
      window_started_at = case when window_started_at < now() - interval '15 minutes' then now() else window_started_at end
  where client_key = p_client_key returning failed_attempts into attempts;
  if attempts >= 5 then update public.admin_login_attempts set blocked_until = now() + interval '15 minutes' where client_key = p_client_key; end if;
end;
$$;

revoke all on function public.cast_vote(uuid, smallint) from public, anon, authenticated;
revoke all on function public.get_election_results() from public, anon, authenticated;
revoke all on function public.set_election_state(boolean) from public, anon, authenticated;
revoke all on function public.admin_login_allowed(text) from public, anon, authenticated;
revoke all on function public.admin_login_succeeded(text) from public, anon, authenticated;
revoke all on function public.admin_login_failed(text) from public, anon, authenticated;
grant execute on function public.cast_vote(uuid, smallint) to service_role;
grant execute on function public.get_election_results() to service_role;
grant execute on function public.set_election_state(boolean) to service_role;
grant execute on function public.admin_login_allowed(text) to service_role;
grant execute on function public.admin_login_succeeded(text) to service_role;
grant execute on function public.admin_login_failed(text) to service_role;
