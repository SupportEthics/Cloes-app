-- Trove — shared family journal schema for Supabase (Postgres)
-- ------------------------------------------------------------
-- Paste this whole file into the Supabase SQL Editor and click "Run".
-- It is safe to run more than once.
--
-- What it sets up:
--   • families / family_members / profiles  — who shares a journal
--   • places / visits / photos              — the journal itself
--   • Row-Level Security                     — each family sees ONLY its own data
--   • get_or_create_family() / join_family() — the two functions the app calls

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Our family',
  invite_code text not null unique,
  created_at  timestamptz not null default now()
);

create table if not exists public.family_members (
  family_id  uuid not null references public.families(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

-- Which family a user is currently looking at (lets a partner "switch" into
-- your family when they join with your code).
create table if not exists public.profiles (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  current_family_id uuid references public.families(id) on delete set null,
  created_at        timestamptz not null default now()
);

create table if not exists public.places (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families(id) on delete cascade,
  name        text not null,
  location    text,
  emoji       text not null default '📍',
  gradient    text not null default 'park',
  status      text not null default 'not_yet',
  tags        text[] not null default '{}',
  cost        text,
  travel_time text,
  notes       text[] not null default '{}',
  created_at  timestamptz not null default now()
);

create table if not exists public.visits (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families(id) on delete cascade,
  place_id   uuid not null references public.places(id) on delete cascade,
  date       timestamptz not null default now(),
  rating     int,
  cost       text,
  companions text[],
  note       text,
  created_at timestamptz not null default now()
);

create table if not exists public.photos (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families(id) on delete cascade,
  place_id   uuid not null references public.places(id) on delete cascade,
  uri        text,
  emoji      text,
  created_at timestamptz not null default now()
);

create index if not exists places_family_idx on public.places(family_id);
create index if not exists visits_place_idx  on public.visits(place_id);
create index if not exists photos_place_idx  on public.photos(place_id);

-- ---------------------------------------------------------------------------
-- Membership helper (SECURITY DEFINER so it can be used safely inside policies)
-- ---------------------------------------------------------------------------
create or replace function public.is_family_member(fid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.family_members m
    where m.family_id = fid and m.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------
alter table public.families       enable row level security;
alter table public.family_members enable row level security;
alter table public.profiles       enable row level security;
alter table public.places         enable row level security;
alter table public.visits         enable row level security;
alter table public.photos         enable row level security;

-- Families: you may read a family you belong to.
drop policy if exists families_select on public.families;
create policy families_select on public.families
  for select to authenticated using (public.is_family_member(id));

-- Memberships: you may read rows for families you belong to.
drop policy if exists members_select on public.family_members;
create policy members_select on public.family_members
  for select to authenticated using (user_id = auth.uid() or public.is_family_member(family_id));

-- Profiles: you may read/write only your own.
drop policy if exists profiles_rw on public.profiles;
create policy profiles_rw on public.profiles
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Journal data: full access, but only for families you belong to.
do $$
declare t text;
begin
  foreach t in array array['places','visits','photos'] loop
    execute format('drop policy if exists %I_all on public.%I', t, t);
    execute format(
      'create policy %I_all on public.%I for all to authenticated
         using (public.is_family_member(family_id))
         with check (public.is_family_member(family_id))', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Invite codes + the two RPCs the app calls
-- ---------------------------------------------------------------------------
create or replace function public.gen_invite_code()
returns text
language plpgsql
as $$
declare
  code  text;
  chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- no ambiguous 0/O/1/I
  i     int;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(chars, floor(random() * length(chars))::int + 1, 1);
    end loop;
    exit when not exists (select 1 from public.families where invite_code = code);
  end loop;
  return code;
end;
$$;

-- Returns the caller's current family, creating one on first use.
create or replace function public.get_or_create_family()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare fid uuid;
begin
  select current_family_id into fid from public.profiles where user_id = auth.uid();
  if fid is not null then
    return fid;
  end if;

  insert into public.families(name, invite_code)
    values ('Our family', public.gen_invite_code())
    returning id into fid;
  insert into public.family_members(family_id, user_id) values (fid, auth.uid());
  insert into public.profiles(user_id, current_family_id) values (auth.uid(), fid)
    on conflict (user_id) do update set current_family_id = excluded.current_family_id;
  return fid;
end;
$$;

-- Join a partner's family by their invite code, and switch to it.
create or replace function public.join_family(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare fid uuid;
begin
  select id into fid from public.families where invite_code = upper(trim(p_code));
  if fid is null then
    raise exception 'Invite code not found';
  end if;

  insert into public.family_members(family_id, user_id) values (fid, auth.uid())
    on conflict (family_id, user_id) do nothing;
  insert into public.profiles(user_id, current_family_id) values (auth.uid(), fid)
    on conflict (user_id) do update set current_family_id = fid;
  return fid;
end;
$$;

grant execute on function public.get_or_create_family() to authenticated;
grant execute on function public.join_family(text)       to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: let both phones update live when the journal changes
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['places','visits','photos'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null; -- already added
    end;
  end loop;
end $$;
