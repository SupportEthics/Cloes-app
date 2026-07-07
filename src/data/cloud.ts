import { supabase } from './supabase';
import type { Photo, Place, Visit } from './types';

/**
 * The cloud data layer: talks to Supabase and maps rows to/from the app's
 * `Place` model. Used by the store only when a project is configured AND a
 * user is signed in.
 *
 * Ids are generated on the device (see the store) and written through here, so
 * the on-screen state and the server row always share the same id — that keeps
 * the optimistic UI and the realtime sync in agreement. Photo *files* stay
 * device-local for now (we sync the reference); uploading the images
 * themselves is a documented next step (Supabase Storage) — see the README.
 */

function client() {
  if (!supabase) throw new Error('Cloud not configured');
  return supabase;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function toVisit(r: any): Visit {
  return {
    id: r.id,
    date: r.date,
    rating: r.rating ?? undefined,
    cost: r.cost ?? undefined,
    companions: r.companions ?? undefined,
    note: r.note ?? undefined,
  };
}

function toPhoto(r: any): Photo {
  return { id: r.id, uri: r.uri ?? undefined, emoji: r.emoji ?? undefined };
}

function toPlace(r: any): Place {
  const visits: Visit[] = (r.visits ?? [])
    .map(toVisit)
    .sort((a: Visit, b: Visit) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return {
    id: r.id,
    name: r.name,
    location: r.location ?? undefined,
    emoji: r.emoji,
    gradient: r.gradient,
    status: r.status,
    tags: r.tags ?? [],
    cost: r.cost ?? undefined,
    notes: r.notes ?? [],
    visits,
    photos: (r.photos ?? []).map(toPhoto),
    createdAt: r.created_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const PLACE_SELECT = '*, visits(*), photos(*)';

/** Returns the signed-in user's family id, creating one on first use. */
export async function getOrCreateFamilyId(): Promise<string> {
  const { data, error } = await client().rpc('get_or_create_family');
  if (error) throw error;
  return data as string;
}

export async function loadPlaces(familyId: string): Promise<Place[]> {
  const { data, error } = await client()
    .from('places')
    .select(PLACE_SELECT)
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toPlace);
}

export async function insertPlace(familyId: string, place: Place): Promise<void> {
  const { error } = await client().from('places').insert({
    id: place.id,
    family_id: familyId,
    name: place.name,
    location: place.location ?? null,
    emoji: place.emoji,
    gradient: place.gradient,
    status: place.status,
    tags: place.tags,
    cost: place.cost ?? null,
    notes: place.notes,
    created_at: place.createdAt,
  });
  if (error) throw error;
}

export async function updatePlace(id: string, patch: Partial<Place>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.location !== undefined) row.location = patch.location;
  if (patch.tags !== undefined) row.tags = patch.tags;
  if (patch.cost !== undefined) row.cost = patch.cost;
  if (Object.keys(row).length === 0) return;
  const { error } = await client().from('places').update(row).eq('id', id);
  if (error) throw error;
}

export async function insertVisit(familyId: string, placeId: string, visit: Visit): Promise<void> {
  const { error } = await client().from('visits').insert({
    id: visit.id,
    family_id: familyId,
    place_id: placeId,
    date: visit.date,
    rating: visit.rating ?? null,
    cost: visit.cost ?? null,
    companions: visit.companions ?? null,
    note: visit.note ?? null,
  });
  if (error) throw error;
}

export async function insertPhoto(familyId: string, placeId: string, photo: Photo): Promise<void> {
  const { error } = await client()
    .from('photos')
    .insert({ id: photo.id, family_id: familyId, place_id: placeId, uri: photo.uri ?? null, emoji: photo.emoji ?? null });
  if (error) throw error;
}

/**
 * Upload a picked image to Supabase Storage and return its public URL, so the
 * photo is saved for good and visible on every family member's device.
 * `localUri` is the temporary reference from the image picker (a blob: URL on
 * web, a file: URL on native) — we read the bytes and store them in the
 * `photos` bucket (see supabase/storage.sql).
 */
export async function uploadPhotoFile(familyId: string, placeId: string, photoId: string, localUri: string): Promise<string> {
  const c = client();
  const resp = await fetch(localUri);
  const blob = await resp.blob();
  const ext = (blob.type && blob.type.split('/')[1]) || 'jpg';
  const path = `${familyId}/${placeId}/${photoId}.${ext}`;
  const { error } = await c.storage.from('photos').upload(path, blob, {
    contentType: blob.type || 'image/jpeg',
    upsert: true,
  });
  if (error) throw error;
  return c.storage.from('photos').getPublicUrl(path).data.publicUrl;
}

export async function removePlace(id: string): Promise<void> {
  const { error } = await client().from('places').delete().eq('id', id);
  if (error) throw error;
}

export async function getInviteCode(familyId: string): Promise<string | null> {
  const { data, error } = await client().from('families').select('invite_code').eq('id', familyId).single();
  if (error) throw error;
  return data?.invite_code ?? null;
}

/** Join a partner's family by their invite code; returns the joined family id. */
export async function joinFamilyByCode(code: string): Promise<string> {
  const { data, error } = await client().rpc('join_family', { p_code: code.trim().toUpperCase() });
  if (error) throw error;
  return data as string;
}
