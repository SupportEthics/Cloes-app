import type { Place } from './types';

/**
 * Id helper. Returns a real v4 UUID because the cloud database's id columns
 * are uuid-typed — short prefixed ids get rejected by Postgres, which was
 * silently blocking every cloud save. The prefix is accepted (and ignored)
 * so existing call sites don't change.
 */
export function makeId(_prefix = 'id'): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  // Fallback v4 generator for runtimes without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const now = Date.now();
const DAY = 24 * 60 * 60 * 1000;
/** ISO date `n` days before now — keeps "8 months ago" nudges realistic on first run. */
const daysAgo = (n: number) => new Date(now - n * DAY).toISOString();

/**
 * Seed content mirrors the prototype so the app feels alive on first launch.
 * Cloe (or anyone) can edit, delete, or add to it — it's just starter data.
 */
export const SEED_PLACES: Place[] = [
  {
    id: 'seed_woods',
    name: 'Bluebell Woods',
    location: 'Middleton',
    emoji: '🌲',
    gradient: 'woods',
    status: 'would_again',
    tags: ['outdoors', 'free', 'toddler'],
    cost: 'Free',
    notes: ['Go early — the little car park fills by 10am on weekends.', 'Wellies in spring, the bottom path gets muddy.', 'Take a picnic — benches by the stream are lovely.'],
    visits: [
      { id: 'v_w1', date: daysAgo(14), rating: 5, cost: 'Free', companions: ['Mum', 'Dad', 'Ivy', 'Biscuit'], note: 'Bluebells were out in full — magic.' },
      { id: 'v_w2', date: daysAgo(120), rating: 5, cost: 'Free' },
      { id: 'v_w3', date: daysAgo(300), rating: 4, cost: 'Free' },
    ],
    photos: [{ id: 'p1', emoji: '🌲' }, { id: 'p2', emoji: '🦋' }, { id: 'p3', emoji: '🍄' }],
    createdAt: daysAgo(340),
  },
  {
    id: 'seed_farm',
    name: 'Wander Farm Park',
    location: 'Otley',
    emoji: '🐐',
    gradient: 'farm',
    status: 'would_again',
    tags: ['fullday', 'toddler'],
    cost: '££',
    notes: ['Book tickets online — cheaper and skips the queue.', 'Take a picnic, the café gets rammed at noon.'],
    visits: [{ id: 'v_f1', date: daysAgo(242), rating: 5, cost: '££', companions: ['Mum', 'Dad', 'Ivy'] }],
    photos: [{ id: 'p4', emoji: '🐐' }, { id: 'p5', emoji: '🐑' }],
    createdAt: daysAgo(260),
  },
  {
    id: 'seed_beach',
    name: 'Sandymouth Beach',
    location: 'Coast',
    emoji: '🏖️',
    gradient: 'beach',
    status: 'not_yet',
    tags: ['outdoors', 'free', 'fullday'],
    cost: 'Free',
    notes: ['Best at low tide — check the tide times.', 'Café shuts at 4pm.'],
    visits: [],
    photos: [],
    createdAt: daysAgo(21),
  },
  {
    id: 'seed_castle',
    name: 'Hollow Castle',
    location: 'Skipton',
    emoji: '🏰',
    gradient: 'castle',
    status: 'might_again',
    tags: ['toddler', 'fullday'],
    cost: '££',
    notes: ['Pushchair-friendly on the lower ramparts only.'],
    visits: [{ id: 'v_c1', date: daysAgo(92), rating: 4, cost: '££', companions: ['Mum', 'Ivy'] }],
    photos: [{ id: 'p6', emoji: '🏰' }],
    createdAt: daysAgo(120),
  },
  {
    id: 'seed_soft',
    name: 'Puddle Ducks Soft Play',
    location: 'Guiseley',
    emoji: '🤸',
    gradient: 'soft',
    status: 'would_again',
    tags: ['rainy', 'toddler'],
    cost: '£',
    notes: ['Quietest on weekday mornings before 11.', 'Grippy socks required — keep a spare pair in the car.'],
    visits: [
      { id: 'v_s1', date: daysAgo(28), rating: 5, cost: '£' },
      { id: 'v_s2', date: daysAgo(70), rating: 5, cost: '£' },
    ],
    photos: [{ id: 'p7', emoji: '🎈' }],
    createdAt: daysAgo(200),
  },
  {
    id: 'seed_museum',
    name: 'Riverside Museum',
    location: 'Leeds',
    emoji: '🦕',
    gradient: 'museum',
    status: 'not_yet',
    tags: ['rainy', 'free', 'toddler'],
    cost: 'Free',
    notes: ['Free entry — donation box at the door.', 'Dinosaur trail sheet from the front desk keeps toddlers busy.'],
    visits: [],
    photos: [],
    createdAt: daysAgo(7),
  },
];
