/**
 * Supabase seam (not wired up yet).
 * ---------------------------------
 * Trove currently persists locally via AsyncStorage in `store.tsx`, so it works
 * with zero backend. To make journals shared across a family and backed up in
 * the cloud, this is the ONLY file the screens don't touch — swap the store's
 * read/write calls for these and nothing in the UI changes.
 *
 * Steps to go live:
 *   1. Create a project at https://supabase.com and copy the URL + anon key.
 *   2. `npx expo install @supabase/supabase-js`
 *   3. Put the values in an `.env` (EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY).
 *   4. Create tables mirroring `types.ts`:
 *        families(id, name)
 *        members(id, family_id, user_id, display_name)
 *        places(id, family_id, name, location, emoji, gradient, status, tags,
 *               cost, travel_time, notes, created_at)
 *        visits(id, place_id, date, rating, cost, companions, note)
 *        photos(id, place_id, visit_id, storage_path)
 *      …and enable Row Level Security so each family only sees its own rows.
 *   5. Store photos in a Supabase Storage bucket; keep only the path in `photos`.
 *
 * Example client (uncomment once the dependency is installed):
 *
 *   import 'react-native-url-polyfill/auto';
 *   import { createClient } from '@supabase/supabase-js';
 *
 *   export const supabase = createClient(
 *     process.env.EXPO_PUBLIC_SUPABASE_URL!,
 *     process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
 *   );
 */

export const SUPABASE_READY = false;
