-- Trove — update pack 2 (run once in the Supabase SQL Editor; safe to re-run)
-- ---------------------------------------------------------------------------
-- Adds: 1) the Discover cache, 2) real family-member names, 3) the
-- remove-from-family function.

-- 1 ─ Discover cache: recent searches + place details stored locally so
--     repeat lookups are instant and don't call Google (function d9+).
create table if not exists public.discover_cache (
  key        text primary key,
  payload    jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.discover_cache enable row level security; -- backend-only

-- 2 ─ Member names: profiles carry a display name the app keeps in sync, and
--     family members may read each other's (needed for the Family tab list).
alter table public.profiles add column if not exists display_name text;

drop policy if exists profiles_family_read on public.profiles;
create policy profiles_family_read on public.profiles
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.family_members me
      join public.family_members them on them.family_id = me.family_id
      where me.user_id = auth.uid() and them.user_id = profiles.user_id
    )
  );

-- 3 ─ Remove someone from a family (any member may; also used to leave).
--     If the removed person was "in" that family, they fall back to another
--     of theirs — or get a fresh one next time they open the app.
create or replace function public.remove_family_member(p_family uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_family_member(p_family) then
    raise exception 'You are not a member of that family';
  end if;

  delete from public.family_members where family_id = p_family and user_id = p_user;

  update public.profiles
     set current_family_id = (
       select m.family_id from public.family_members m where m.user_id = p_user limit 1
     )
   where user_id = p_user and current_family_id = p_family;
end;
$$;

grant execute on function public.remove_family_member(uuid, uuid) to authenticated;
