-- Trove — ratings & photo credits (run once in the Supabase SQL Editor)
-- ---------------------------------------------------------------------
-- Adds: Google's public rating + the family's own star rating on places,
-- and "who added it" credits on photos. Safe to run more than once.

alter table public.places add column if not exists google_rating numeric;
alter table public.places add column if not exists family_rating int;
alter table public.photos add column if not exists added_by text;
