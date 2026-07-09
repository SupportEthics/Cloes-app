import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RealtimeChannel } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './auth';
import {
  getOrCreateFamilyId,
  insertPhoto,
  insertPlace,
  insertVisit,
  loadPlaces,
  removePlace as cloudRemovePlace,
  updatePlace as cloudUpdatePlace,
  uploadPhotoFile,
} from './cloud';
import { makeId, SEED_PLACES } from './seed';
import { supabase } from './supabase';
import type { NewPlace, Photo, Place, Status, Visit } from './types';

/**
 * The one place the whole app reads and writes data. It runs in two modes,
 * transparently to every screen:
 *
 *   • Local mode  — no backend configured (or signed out): state lives on the
 *     device via AsyncStorage, seeded with demo content on first launch.
 *   • Cloud mode  — a Supabase project is configured AND a user is signed in:
 *     the family's journal loads from Postgres, every change writes through,
 *     and realtime keeps both parents' phones in sync. The UI updates
 *     optimistically so it always feels instant.
 */

const STORAGE_KEY = 'trove.places.v1';

export type { NewPlace };

type StoreValue = {
  places: Place[];
  loaded: boolean;
  cloud: boolean;
  familyId: string | null;
  getPlace: (id: string) => Place | undefined;
  addPlace: (draft: NewPlace) => Promise<Place>;
  setStatus: (id: string, status: Status) => void;
  logVisit: (id: string, visit?: Partial<Visit>) => void;
  addPhoto: (id: string, photo: Photo) => void;
  updatePlace: (id: string, patch: Partial<Place>) => void;
  removePlace: (id: string) => void;
  refresh: () => void;
  /** Last cloud-sync error message (so the UI can surface why a save failed). */
  cloudError: string | null;
  clearError: () => void;
};

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { cloud, session } = useAuth();
  const useCloud = cloud && !!session;

  const [places, setPlaces] = useState<Place[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const familyIdRef = useRef<string | null>(null);

  const reload = useCallback(async () => {
    const fid = familyIdRef.current;
    if (!fid) return;
    try {
      setPlaces(await loadPlaces(fid));
    } catch {
      /* keep last-known good state on a transient error */
    }
  }, []);

  // ---- Local mode: hydrate from disk (seeding on first launch) + persist ----
  useEffect(() => {
    if (useCloud) return;
    let active = true;
    setLoaded(false);
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const next: Place[] = raw ? JSON.parse(raw) : SEED_PLACES;
        if (active) {
          setPlaces(next);
          setLoaded(true);
        }
      } catch {
        if (active) {
          setPlaces(SEED_PLACES);
          setLoaded(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [useCloud]);

  useEffect(() => {
    if (useCloud || !loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(places)).catch(() => {});
  }, [places, loaded, useCloud]);

  // ---- Cloud mode: resolve family, load, then keep in sync via realtime ----
  useEffect(() => {
    if (!useCloud) {
      familyIdRef.current = null;
      setFamilyId(null);
      return;
    }
    let active = true;
    let channel: RealtimeChannel | null = null;
    setLoaded(false);
    (async () => {
      try {
        const fid = await getOrCreateFamilyId();
        if (!active) return;
        familyIdRef.current = fid;
        setFamilyId(fid);
        setPlaces(await loadPlaces(fid));
        setCloudError(null);
        setLoaded(true);
        channel = supabase!
          .channel(`family-${fid}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'places', filter: `family_id=eq.${fid}` }, reload)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'visits', filter: `family_id=eq.${fid}` }, reload)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'photos', filter: `family_id=eq.${fid}` }, reload)
          .subscribe();
      } catch (e) {
        if (active) {
          setCloudError('Couldn’t connect your family journal: ' + errMsg(e));
          setLoaded(true); // don't trap the user on a spinner
        }
      }
    })();
    return () => {
      active = false;
      if (channel) supabase!.removeChannel(channel);
    };
  }, [useCloud, reload]);

  const value = useMemo<StoreValue>(() => {
    const fid = () => familyIdRef.current;
    const patchOne = (id: string, fn: (p: Place) => Place) =>
      setPlaces((prev) => prev.map((p) => (p.id === id ? fn(p) : p)));
    const onWriteError = (e: unknown) => {
      setCloudError('Couldn’t save to the cloud: ' + errMsg(e));
      reload();
    };

    return {
      places,
      loaded,
      cloud: useCloud,
      familyId,
      cloudError,
      clearError: () => setCloudError(null),
      getPlace: (id) => places.find((p) => p.id === id),

      addPlace: async (draft) => {
        const place: Place = {
          id: makeId('place'),
          notes: [],
          visits: [],
          photos: [],
          createdAt: new Date().toISOString(),
          ...draft,
        };
        setPlaces((prev) => [place, ...prev]);
        if (useCloud && fid()) {
          try {
            await insertPlace(fid()!, place);
            setCloudError(null);
          } catch (e) {
            setCloudError('Couldn’t save to the cloud: ' + errMsg(e));
          }
        } else if (useCloud && !fid()) {
          setCloudError('Not connected to your family journal yet — try reloading the app.');
        }
        return place;
      },

      setStatus: (id, status) => {
        patchOne(id, (p) => ({ ...p, status }));
        if (useCloud && fid()) cloudUpdatePlace(id, { status }).catch(onWriteError);
      },

      logVisit: (id, visitPartial) => {
        const current = places.find((p) => p.id === id);
        if (!current) return;
        const visit: Visit = { id: makeId('visit'), date: new Date().toISOString(), ...visitPartial };
        // Logging a visit records the date; the family picks the verdict themselves.
        patchOne(id, (p) => ({ ...p, visits: [visit, ...p.visits] }));
        if (useCloud && fid()) insertVisit(fid()!, id, visit).catch(onWriteError);
      },

      addPhoto: (id, photo) => {
        // Show the picked image immediately…
        patchOne(id, (p) => ({ ...p, photos: [...p.photos, photo] }));
        if (useCloud && fid()) {
          // …then upload the file to Storage and save the permanent URL so it
          // survives reloads and appears on every family member's phone.
          (async () => {
            try {
              const stored: Photo = photo.uri
                ? { ...photo, uri: await uploadPhotoFile(fid()!, id, photo.id, photo.uri) }
                : photo;
              patchOne(id, (p) => ({
                ...p,
                photos: p.photos.map((ph) => (ph.id === photo.id ? stored : ph)),
              }));
              await insertPhoto(fid()!, id, stored);
            } catch (e) {
              onWriteError(e);
            }
          })();
        }
      },

      updatePlace: (id, patch) => {
        patchOne(id, (p) => ({ ...p, ...patch }));
        if (useCloud && fid()) cloudUpdatePlace(id, patch).catch(onWriteError);
      },

      removePlace: (id) => {
        setPlaces((prev) => prev.filter((p) => p.id !== id));
        if (useCloud && fid()) cloudRemovePlace(id).catch(onWriteError);
      },

      refresh: () => {
        if (useCloud) reload();
      },
    };
  }, [places, loaded, useCloud, familyId, cloudError, reload]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
