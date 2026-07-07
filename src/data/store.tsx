import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { SEED_PLACES, makeId } from './seed';
import type { Photo, Place, Status, Visit } from './types';

/**
 * Local-first data store. Everything persists to the device via AsyncStorage,
 * so the app is fully usable with no backend. When you're ready, `src/data/
 * supabase.ts` documents how to swap this layer for a shared cloud database
 * without touching any screen code — the screens only ever talk to `useStore()`.
 */

const STORAGE_KEY = 'trove.places.v1';

type State = { places: Place[]; loaded: boolean };

type Action =
  | { type: 'hydrate'; places: Place[] }
  | { type: 'upsert'; place: Place }
  | { type: 'remove'; id: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'hydrate':
      return { places: action.places, loaded: true };
    case 'upsert': {
      const exists = state.places.some((p) => p.id === action.place.id);
      const places = exists
        ? state.places.map((p) => (p.id === action.place.id ? action.place : p))
        : [action.place, ...state.places];
      return { ...state, places };
    }
    case 'remove':
      return { ...state, places: state.places.filter((p) => p.id !== action.id) };
    default:
      return state;
  }
}

export type NewPlace = {
  name: string;
  location?: string;
  emoji: string;
  gradient: Place['gradient'];
  status: Status;
  tags: Place['tags'];
  cost?: string;
  travelTime?: string;
  notes?: string[];
};

type StoreValue = {
  places: Place[];
  loaded: boolean;
  getPlace: (id: string) => Place | undefined;
  addPlace: (draft: NewPlace) => Place;
  setStatus: (id: string, status: Status) => void;
  logVisit: (id: string, visit?: Partial<Visit>) => void;
  addPhoto: (id: string, photo: Photo) => void;
  updatePlace: (id: string, patch: Partial<Place>) => void;
  removePlace: (id: string) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { places: [], loaded: false });

  // Hydrate from disk once, seeding demo content on first ever launch.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const places: Place[] = raw ? JSON.parse(raw) : SEED_PLACES;
        if (active) dispatch({ type: 'hydrate', places });
      } catch {
        if (active) dispatch({ type: 'hydrate', places: SEED_PLACES });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Persist on every change (after initial hydrate).
  useEffect(() => {
    if (!state.loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state.places)).catch(() => {});
  }, [state.places, state.loaded]);

  const value = useMemo<StoreValue>(() => {
    const getPlace = (id: string) => state.places.find((p) => p.id === id);

    return {
      places: state.places,
      loaded: state.loaded,
      getPlace,
      addPlace: (draft) => {
        const place: Place = {
          id: makeId('place'),
          notes: [],
          visits: [],
          photos: [],
          createdAt: new Date().toISOString(),
          ...draft,
        };
        dispatch({ type: 'upsert', place });
        return place;
      },
      setStatus: (id, status) => {
        const p = getPlace(id);
        if (!p) return;
        dispatch({ type: 'upsert', place: { ...p, status } });
      },
      logVisit: (id, visit) => {
        const p = getPlace(id);
        if (!p) return;
        const v: Visit = { id: makeId('visit'), date: new Date().toISOString(), ...visit };
        const status: Status = p.status === 'not_yet' ? 'done' : p.status;
        dispatch({ type: 'upsert', place: { ...p, status, visits: [v, ...p.visits] } });
      },
      addPhoto: (id, photo) => {
        const p = getPlace(id);
        if (!p) return;
        dispatch({ type: 'upsert', place: { ...p, photos: [...p.photos, photo] } });
      },
      updatePlace: (id, patch) => {
        const p = getPlace(id);
        if (!p) return;
        dispatch({ type: 'upsert', place: { ...p, ...patch } });
      },
      removePlace: (id) => dispatch({ type: 'remove', id }),
    };
  }, [state.places, state.loaded]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
