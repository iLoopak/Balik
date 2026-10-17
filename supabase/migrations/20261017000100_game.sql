-- Private authoritative state. Clients may read only their filtered delivery journal.
create table public.balik_rooms (
  code text primary key check (code ~ '^[A-Z]{4}$'),
  version bigint not null,
  state jsonb not null,
  updated_at timestamptz not null default now()
);
create table public.balik_memberships (
  user_id uuid primary key,
  code text not null references public.balik_rooms(code) on delete cascade
);
create index balik_memberships_code_idx on public.balik_memberships(code);
create table public.balik_requests (
  user_id uuid not null,
  request_id text not null,
  reply jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, request_id)
);
create table public.balik_player_messages (
  code text not null,
  user_id uuid not null,
  revision bigint not null,
  frame jsonb not null,
  created_at timestamptz not null default now(),
  primary key (code, user_id, revision)
);
create index balik_player_messages_user_idx on public.balik_player_messages(user_id, code, revision);
create table public.balik_rate_limits (
  user_id uuid primary key,
  bucket bigint not null,
  requests integer not null
);

alter table public.balik_rooms enable row level security;
alter table public.balik_memberships enable row level security;
alter table public.balik_requests enable row level security;
alter table public.balik_player_messages enable row level security;
alter table public.balik_rate_limits enable row level security;
revoke all on public.balik_rooms, public.balik_memberships, public.balik_requests,
  public.balik_player_messages, public.balik_rate_limits from anon, authenticated;
grant all on public.balik_rooms, public.balik_memberships, public.balik_requests,
  public.balik_player_messages, public.balik_rate_limits to service_role;
grant select on public.balik_player_messages to authenticated;
create policy "Only the recipient reads game messages" on public.balik_player_messages
  for select to authenticated using (user_id = (select auth.uid()));
-- Subscribe to INSERT only. No raw room state is added to Realtime.
alter publication supabase_realtime add table public.balik_player_messages;

create function public.balik_commit(
  p_user_id uuid, p_request_id text, p_expected_version bigint,
  p_state jsonb, p_deliveries jsonb, p_reply jsonb
) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_code text := p_state->>'code';
  v_reply jsonb;
  v_version bigint;
  v_player jsonb;
  v_delivery jsonb;
begin
  -- Serializes retries of one actor, including two simultaneous create requests.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  select reply into v_reply from public.balik_requests
    where user_id = p_user_id and request_id = p_request_id;
  if found then return jsonb_build_object('status', 'replay', 'reply', v_reply); end if;

  select version into v_version from public.balik_rooms where code = v_code for update;
  if p_expected_version is null then
    if found then return jsonb_build_object('status', 'conflict'); end if;
  elsif not found or v_version <> p_expected_version then
    return jsonb_build_object('status', 'conflict');
  end if;

  -- A savepoint rolls back the entire mutation on code/membership uniqueness races.
  begin
    if p_expected_version is null then
      insert into public.balik_rooms(code, version, state)
        values (v_code, (p_state->>'version')::bigint, p_state);
    else
      update public.balik_rooms set version = (p_state->>'version')::bigint,
        state = p_state, updated_at = now() where code = v_code;
    end if;
    delete from public.balik_memberships where code = v_code;
    for v_player in select value from jsonb_array_elements(p_state->'players') loop
      if v_player->>'userId' is not null then
        insert into public.balik_memberships(user_id, code) values ((v_player->>'userId')::uuid, v_code);
      end if;
    end loop;
    for v_delivery in select value from jsonb_array_elements(p_deliveries) loop
      insert into public.balik_player_messages(code, user_id, revision, frame)
        values (v_code, (v_delivery->>'userId')::uuid,
          (v_delivery->'frame'->>'revision')::bigint, v_delivery->'frame');
    end loop;
    if not exists (select 1 from public.balik_memberships where code = v_code) then
      delete from public.balik_rooms where code = v_code;
    end if;
    insert into public.balik_requests(user_id, request_id, reply) values (p_user_id, p_request_id, p_reply);
  exception when unique_violation then
    return jsonb_build_object('status', 'conflict');
  end;
  return jsonb_build_object('status', 'ok', 'reply', p_reply);
end;
$$;

create function public.balik_allow_request(p_user_id uuid) returns boolean
language plpgsql set search_path = '' as $$
declare
  v_bucket bigint := floor(extract(epoch from now()) / 60);
  v_requests integer;
begin
  insert into public.balik_rate_limits as limits(user_id, bucket, requests)
    values (p_user_id, v_bucket, 1)
    on conflict (user_id) do update set bucket = v_bucket,
      requests = case when limits.bucket = v_bucket then limits.requests + 1 else 1 end
    returning requests into v_requests;
  return v_requests <= 120;
end;
$$;

create function public.balik_cleanup() returns void
language sql set search_path = '' as $$
  delete from public.balik_rooms where updated_at < now() - interval '5 minutes';
  delete from public.balik_requests where created_at < now() - interval '1 day';
  delete from public.balik_player_messages where created_at < now() - interval '1 hour';
  delete from public.balik_player_messages messages using (
    select code, user_id, revision, row_number() over (partition by code, user_id order by revision desc) as position
      from public.balik_player_messages
  ) old where old.position > 128 and messages.code = old.code and messages.user_id = old.user_id and messages.revision = old.revision;
  delete from public.balik_rate_limits where bucket < floor(extract(epoch from now()) / 60) - 60;
$$;

-- PostgreSQL functions default to PUBLIC execute; restrict every privileged entry point.
revoke all on function public.balik_commit(uuid,text,bigint,jsonb,jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.balik_allow_request(uuid) from public, anon, authenticated;
revoke all on function public.balik_cleanup() from public, anon, authenticated;
grant execute on function public.balik_commit(uuid,text,bigint,jsonb,jsonb,jsonb) to service_role;
grant execute on function public.balik_allow_request(uuid) to service_role;
grant execute on function public.balik_cleanup() to service_role;
