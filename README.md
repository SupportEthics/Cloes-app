# Trove — Family Adventure App 🧭

> Helping families discover more, remember more, and make the most of every day together.

A personal **family adventure journal + planner**: keep a bucket list of days out, record what you've done and whether you'd do it again, auto-log visit dates, save a few favourite photos per trip, and get gentle nudges to revisit ("sunny today — go back to Bluebell Woods", "8 months since Wander Farm Park").

**[▶ Open the clickable prototype](mockup/family-adventure-mockup.html)** — 5 tappable screens (Home / nudges, the family list with working filters, place detail with a live verdict toggle, add-a-place, and a "Year in Adventures" summary). Light & dark aware.

> **The real app now lives in this repo** — a native iOS + Android app built with **Expo + React Native + TypeScript**. It runs today with local, on-device storage (no backend needed) and is structured so a shared cloud database drops in later. See [Getting started](#getting-started) to run it on a phone.

---

## Idea rating: 8 / 10

The market splits into two camps that never overlap:

- **Discovery / listings** — *Day Out With The Kids, Kids Pass, National Trust*. Great for finding places and buying tickets; **no memory or journal layer**.
- **Travel trackers** — *Visited, Been, Places Been, iBucket*. Pin **countries/cities for holiday bragging**, not local recurring days out, and none built around the family-decision loop.

**The gap (the wedge):** a *local, recurring, family-decision-and-memory* app. Nobody combines the **"Would do again / Wouldn't / Not yet"** verdict axis + **auto time-since-last-visit** + **weather-and-time-aware revisit nudges** + toddler/rainy/free filters on *your own* saved places.

**Strengths:** solves a real, felt problem the founder already has (the Notes-app habit); the verdict axis is a genuine differentiator; naturally sticky (the personal database gets more irreplaceable per trip); strong emotional hook via the photo journal and annual summary.

**Watch-outs:** cold-start & data-entry friction (adding a place must take <20s); retention between trips (the nudge layer is core, not "later"); discovery data has a cost/content problem (defer past MVP); modest per-user monetisation — a lifestyle app, not a rocket.

**Verdict:** worth building. Start narrow, nail logging speed + nudges, let discovery/AI come later.

---

## Build plan

**Stack (native iOS + Android):**
- **React Native + Expo** — one TypeScript codebase → both app stores; native camera, push, location.
- **Supabase** — Postgres + Auth (email + Apple/Google) + Storage for photos, with row-level security so each family sees only their own data.
- **Nudges** — Expo Push + a scheduled Supabase edge function checking "days since visited" and a free weather API (Open-Meteo) for the "sunny today" prompt.

**Data model (MVP):** `families` → `members`; `places` (name, location, tags, cost, travel time, notes-for-next-time, status enum); `visits` (date auto-set, rating, cost, who-came, note); `photos` (per visit).

**Phases**
1. **MVP** *(~6–10 weeks)* — fast add-a-place, bucket list with status + tag filters, place detail + visit logging, photo journal, nudges feed, auth + family sharing.
2. **Retention** — "Year in Adventures" summary, seasonal lists, map view.
3. **Growth** — discover nearby places (Places API + curated UK content), personalised recs, AI "make the most of today" suggestions. Introduce alongside a freemium subscription that funds the API costs.

**Costs:** Supabase free tier covers early users; Apple Developer $99/yr + Google Play $25 one-off; Phase 3 adds recurring API/AI costs.

---

## Getting started

You'll need [Node.js](https://nodejs.org) and the **Expo Go** app on your phone (App Store / Play Store).

```bash
npm install
npx expo start        # scan the QR code with Expo Go (iOS: Camera app)
```

The app opens with a few seeded UK family days out so it feels alive — add, edit, filter, log visits and attach photos straight away. Everything is saved on your device.

To build installable App Store / Play Store binaries later: `npx expo run:ios` / `npx expo run:android`, or use [EAS Build](https://docs.expo.dev/build/introduction/).

## Project structure

```
src/
  app/                     # screens (Expo Router — file-based navigation)
    _layout.tsx            # providers + theme
    (tabs)/                # Home · List · Add · Year · Family  (+ raised “add” button)
    place/[id].tsx         # place detail (verdict toggle, notes, photos, log a visit)
  components/              # PlaceCard, StatusPill, FilterChips, GradientPhoto, Screen…
  data/
    types.ts               # Place / Visit / Photo / Status model + helpers
    store.tsx              # app state + on-device persistence (AsyncStorage)
    seed.ts                # starter content
    nudges.ts              # the “sunny today / been 8 months” reminder logic
    supabase.ts            # documented seam for the future shared cloud database
  theme.ts                 # the warm pine/coral design tokens (light + dark)
mockup/                    # the original standalone HTML clickable prototype
```

### Where it goes next (from the roadmap above)
- **Shared cloud journal** — wire up `src/data/supabase.ts` (Auth + Postgres + photo storage) so both parents share one journal.
- **Real nudges** — replace the weather stub in `nudges.ts` with a forecast API and schedule push notifications.
- **Discovery & AI** — Phase 3 features, funded by a small subscription.

---

*Built as a starting point — names, seeded content and scope are all open to change.*
