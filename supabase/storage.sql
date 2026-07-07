-- Trove — photo storage
-- ----------------------
-- Run this in the Supabase SQL Editor (once), after schema.sql. It creates the
-- bucket that family photos are uploaded to, and the rules that let signed-in
-- family members upload while keeping the images viewable in the app.
--
-- The bucket is "public" so images load by URL on every device. Paths include
-- random ids so they can't be guessed. (If you'd rather lock this down to
-- signed, expiring URLs later, we can — it's a small change.)

insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists "trove photos insert" on storage.objects;
create policy "trove photos insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'photos');

drop policy if exists "trove photos update" on storage.objects;
create policy "trove photos update" on storage.objects
  for update to authenticated using (bucket_id = 'photos') with check (bucket_id = 'photos');

drop policy if exists "trove photos read" on storage.objects;
create policy "trove photos read" on storage.objects
  for select to public using (bucket_id = 'photos');
