-- Trove — update pack 3 (run once in the Supabase SQL Editor; safe to re-run)
-- ---------------------------------------------------------------------------
-- Separates place COVER photos (e.g. Google's picture of a venue) from family
-- MEMORIES, and cleans up any Google photos that were wrongly saved as
-- memories (the meerkat incident 🦫).

-- 1 ─ Cover photo column
alter table public.places add column if not exists cover_url text;

-- 2 ─ Migrate: any Google-hosted photo sitting in memories becomes the
--     place's cover instead…
update public.places p
   set cover_url = (
     select ph.uri
       from public.photos ph
      where ph.place_id = p.id
        and ph.uri like '%googleusercontent%'
      limit 1
   )
 where p.cover_url is null
   and exists (
     select 1 from public.photos ph
      where ph.place_id = p.id and ph.uri like '%googleusercontent%'
   );

-- 3 ─ …and is removed from the memories strip.
delete from public.photos where uri like '%googleusercontent%';
