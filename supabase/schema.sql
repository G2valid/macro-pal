-- Macro Pal: partner link + challenges
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run once on a fresh project.
--
-- Privacy: only a small daily summary is shared with your partner
-- (streaks, goals hit, workouts, steps, weekly % change). Food logs,
-- body measurements, progress photos and cycle data never leave the phone.

-- ---------- Members ----------
create table public.members (
  id          uuid primary key references auth.users on delete cascade,
  name        text not null default '',
  accent      text not null default 'ocean',
  invite_code text not null unique default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
  partner_id  uuid references public.members(id) on delete set null,
  summary     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- Who is my partner? (security definer avoids recursive policies)
create function public.my_partner() returns uuid
language sql stable security definer set search_path = public as $$
  select partner_id from public.members where id = auth.uid()
$$;

alter table public.members enable row level security;
create policy members_read on public.members for select to authenticated
  using (id = auth.uid() or id = public.my_partner());
create policy members_insert on public.members for insert to authenticated
  with check (id = auth.uid());
create policy members_update on public.members for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Nobody can set partner_id or invite_code directly; pairing goes through pair_with().
revoke all on public.members from anon, authenticated;
grant select on public.members to authenticated;
grant insert (id, name, accent) on public.members to authenticated;
grant update (name, accent, summary, updated_at) on public.members to authenticated;

create function public.pair_with(code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare other uuid;
begin
  select id into other from public.members
   where invite_code = upper(trim(code)) and id <> auth.uid();
  if other is null then raise exception 'No one found with that code'; end if;
  if exists (select 1 from public.members where id = other and partner_id is not null and partner_id <> auth.uid()) then
    raise exception 'That person is already linked with someone else';
  end if;
  update public.members set partner_id = null where partner_id = auth.uid() and id <> other;
  update public.members set partner_id = other where id = auth.uid();
  update public.members set partner_id = auth.uid() where id = other;
  return other;
end $$;

create function public.unpair() returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.members set partner_id = null where id = auth.uid() or partner_id = auth.uid();
end $$;

revoke all on function public.pair_with(text), public.unpair(), public.my_partner() from public, anon;
grant execute on function public.pair_with(text), public.unpair(), public.my_partner() to authenticated;

-- ---------- Challenges ----------
create table public.challenges (
  id         uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references public.members(id) on delete cascade,
  opponent   uuid not null references public.members(id) on delete cascade,
  kind       text not null,             -- e.g. weekly_showdown, steps, streak, workouts
  title      text not null,
  stakes     text not null default '',
  starts_on  date not null,
  ends_on    date not null,
  status     text not null default 'active' check (status in ('active', 'done', 'cancelled')),
  winner     uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.challenges enable row level security;
create policy challenges_read on public.challenges for select to authenticated
  using (auth.uid() in (created_by, opponent));
create policy challenges_insert on public.challenges for insert to authenticated
  with check (created_by = auth.uid() and opponent = public.my_partner());
create policy challenges_update on public.challenges for update to authenticated
  using (auth.uid() in (created_by, opponent)) with check (auth.uid() in (created_by, opponent));
create policy challenges_delete on public.challenges for delete to authenticated
  using (auth.uid() in (created_by, opponent));
revoke all on public.challenges from anon;

-- ---------- Cheers (🔥 💪 reactions) ----------
create table public.cheers (
  id         bigint generated always as identity primary key,
  from_id    uuid not null default auth.uid() references public.members(id) on delete cascade,
  to_id      uuid not null references public.members(id) on delete cascade,
  emoji      text not null,
  note       text not null default '',
  seen       boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.cheers enable row level security;
create policy cheers_read on public.cheers for select to authenticated
  using (auth.uid() in (from_id, to_id));
create policy cheers_insert on public.cheers for insert to authenticated
  with check (from_id = auth.uid() and to_id = public.my_partner());
create policy cheers_mark_seen on public.cheers for update to authenticated
  using (to_id = auth.uid()) with check (to_id = auth.uid());
revoke all on public.cheers from anon;
revoke update on public.cheers from authenticated;
grant update (seen) on public.cheers to authenticated;
