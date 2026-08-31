# Progress

## Phase 0 — Scaffold ✅ complete

### Done
- Bootstrapped a fresh Next.js 16.3.3 + TypeScript + Tailwind v4 project directly into `/home/ibrahim/projects/drop-of-water` (preserved the existing `API.md`).
- Read the in-tree Next.js 16 docs to confirm breaking changes (Promises in `params`/`searchParams`, `proxy.ts` replaces `middleware`, new `PageProps`/`LayoutProps` helpers).
- Installed runtime deps: `firebase`, `@tanstack/react-query`, `zod`, `react-hook-form`, `@hookform/resolvers`, `sonner`, `lucide-react`, `clsx`, `tailwind-merge`. Dev dep: `openapi-typescript`.
- Added `.env.local` (placeholders) and `.env.example` for the API base URL, mock toggle, and Firebase web config.
- Built the type system — zod schemas for all 7 main collections plus the pagination envelope:
  - `src/lib/enums.ts` — 11 roles, all status enums, payment methods, certificate tiers, role groups, `hasAnyRole()` helper
  - `src/lib/schemas/user.ts` — User, register/update/admin-update, social-links op, list filters
  - `src/lib/schemas/project.ts` — Project, cost items, milestones, proof of impact, create/update
  - `src/lib/schemas/campaign.ts` — Campaign + participants, create/update
  - `src/lib/schemas/sponsorship.ts` — Sponsorship, create/update
  - `src/lib/schemas/donation.ts` — Donation, checkout envelope, create/review
  - `src/lib/schemas/impact-update.ts` — ImpactUpdate (handles id-string OR populated ref objects), create/update/approve/reject
  - `src/lib/schemas/certificate.ts` — Certificate, generate, set visibility
  - `src/lib/schemas/pagination.ts` — paginated envelope + params
  - `src/lib/schemas/index.ts` — barrel
- Built the API layer:
  - `src/lib/api/client.ts` — `apiFetch` + `api.{get,post,patch,put,delete}`, typed `ApiError` (`isUnauthorized` / `isForbidden` / `isNotFound` / `isConflict` / `isValidation`), registered `tokenProvider`, mock-mode URL (`/api/mock`) when `NEXT_PUBLIC_API_MOCK=true`
  - 9 typed resource modules: `usersApi`, `projectsApi`, `campaignsApi`, `sponsorshipsApi`, `donationsApi`, `impactUpdatesApi`, `certificatesApi`, `adminApi`, `notificationsApi` — every method validates its response with zod
- Built the money helpers (`src/lib/money.ts`): `formatSmallestUnit` and `parseToSmallestUnit` with zero-decimal currency awareness.
- Built Firebase init (`src/lib/firebase/client.ts`): lazy, no-ops when env vars are placeholders, with `getFirebaseApp` / `getFirebaseAuth` / `getFirebaseMessaging`.
- Built the auth layer (`src/lib/auth/context.tsx`):
  - `AuthProvider` listens to Firebase `onAuthStateChanged`
  - If `firebaseUser` exists but no DoW profile → `needs-onboarding` state
  - Registered token provider so `apiFetch` automatically attaches the ID token
  - `useAuth()`, `useCurrentUser()`, helpers for sign-in / sign-up / Google / sign-out / password reset
- Built the React Query provider with smart retry (no retry on 4xx).
- Built shared UI primitives in `src/components/ui/`:
  - `Button` (5 variants, 3 sizes, loading state)
  - `Card` + `CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter` + `EmptyState`
  - `Money` component (formatted, ARIA-labelled)
  - `Badge` with tones
  - `status-badges.tsx` — typed mappers for project / campaign / donation / impact-update statuses
- Built `src/components/site-header.tsx` — top nav with auth-aware sign-in / sign-out / onboarding CTA.
- Replaced the boilerplate `src/app/page.tsx` with a real landing page (hero, 4 feature cards, CTA strip).
- Updated `src/app/layout.tsx` to wire up `QueryProvider` → `AuthProvider` → `SiteHeader` → `Toaster` and update metadata.

### Verified
- `npx tsc --noEmit` — clean
- `npm run lint` — 0 errors, 0 warnings
- `npm run build` — compiled successfully, static prerender working

### Notes / decisions made
- Skipped the `shadcn/ui` CLI (non-interactive env) and wrote the small set of primitives we actually need by hand — they live in `src/components/ui/` with the same naming conventions.
- Skipped `openapi-typescript` codegen for now (no backend URL yet). When the backend is reachable, we run codegen into `src/types/api.ts` and let the resource modules keep zod as the runtime guard.
- Auth provider initializes lazily: if Firebase isn't configured (placeholder env), the app boots straight to `unauthenticated` so the home page renders without errors.
- Kept the api resource module signatures flexible on inputs (accept partial filters, parse with zod) so callers can use them ergonomically.
- The 2 supporting collections (`notifications` history, `device-tokens`) are implemented only to the depth the spec documents — no speculative server-side fields.

### Next: Phase 2 — public campaigns + donate flow

---

## Phase 1 — Public site ✅ complete

### Done
- Installed `msw@2` and ran `msw init public/` to drop `public/mockServiceWorker.js` into the app.
- `NEXT_PUBLIC_API_MOCK=true` in `.env.local`. Flip to `false` once the backend URL is known; the API client already routes via this flag.
- Built the mock layer:
  - `src/lib/mocks/ids.ts` — local ObjectId generator + ISO clock.
  - `src/lib/mocks/db.ts` — in-memory store seeded with 3 projects (Adama Primary, Wenchi springs, Debre Berhan well), 2 campaigns, 2 sponsorships, 3 donations, 2 published impact updates, 1 sample certificate, 2 notifications, 1 mock user.
  - `src/lib/mocks/handlers.ts` — MSW v2 request handlers for the public endpoints (`/projects`, `/projects/fundable`, `/projects/:id`, `/campaigns*`, `/campaigns/:id/sponsorships`, `/donations`, `/donations/campaign/:id`, `/impact-updates/project/:id`, `/impact-updates/campaign/:id`, `/certificates/:code`, `/users/me` 401). All paginated, all support `?status`, `?projectId`, `?includeSponsorships=true`.
  - `src/lib/mocks/browser.ts` — `setupWorker`.
  - `src/lib/mocks/use-mocks.ts` — `useMocks()` hook, no-op when not in mock mode, lazy-imports the worker.
  - `src/components/mock-boot.tsx` — mounts MSW from the root layout.
- Built the public site:
  - `src/components/project-card.tsx` — card with cover photo, status badge, location, funding progress bar, beneficiary count.
  - `src/components/status-filter.tsx` — chip filter that writes `?status=` to the URL.
  - `src/components/progress-bar.tsx` — accessible progress bar (ARIA).
  - `src/components/projects-list.tsx` — client component, paginated, status filter, skeletons, empty state, error retry, prev/next pagination.
  - `src/app/projects/page.tsx` — server component that reads `searchParams.status` (Promise per Next.js 16) and seeds the client component.
  - `src/components/project-detail.tsx` — fetches the project + its campaigns + its published impact updates in parallel, renders hero with photo gallery, stats, funding progress, full description, cost breakdown, milestones timeline, proof of impact, attached campaigns, field updates. Includes 404 and error states.
  - `src/app/projects/[id]/page.tsx` — server component, awaits `params` (Next.js 16 Promise pattern), generates metadata.
- Wired `MockBoot` into the root layout so MSW starts before any data fetching.
- Added the `public/mockServiceWorker.js` file to the ESLint ignore list (auto-generated).

### Verified
- `npx tsc --noEmit` — clean
- `npm run lint` — 0 errors, 0 warnings
- `npm run build` — compiled successfully, 4 routes (`/`, `/_not-found`, `/projects`, `/projects/[id]`)
- `npm run dev` + `curl` — home and `/projects` return 200 with expected content; the projects list shows the loading skeleton on SSR (client component), then MSW fills in real data in the browser.

### Decisions made
- The mock layer runs only in the browser (MSW service worker). The API client routes to `/api/mock/*` when `NEXT_PUBLIC_API_MOCK=true`. SSR sees no mock data, which is fine for now — public pages use client components for data fetching anyway.
- Skipped the optional `?includeSponsorships=true` on the project detail page; it lives on the campaign detail page where it's most useful.

### Next: Phase 3 — auth + onboarding forms

---

## Phase 2 — Public campaigns + donate flow ✅ complete

### Done
- **MSW enhancements**:
  - `POST /donations` now returns the full `{ donation, checkout }` shape and auto-settles the donation after 3 s in the in-memory store (3 s for normal, `manual_review` immediately for ≥ 5,000 ETB). The campaign `currentAmount` and project `currentFunding` are updated on settlement. The `checkoutUrl` points back to our own `/donate/return` page so we can demo the full flow without an external gateway.
  - Guest donor `name`/`email` are honored on `POST /donations`; the existing donor-list handler now redacts anonymous donors.
- **New `useNow` hook** (`src/lib/use-now.ts`) for "days left" countdowns that don't trip the React Compiler purity rule.
- **Generic `StatusFilter`** — typed over `T extends string`, reused by both Projects and Campaigns lists.
- **`/campaigns` list page** with status filter (all 6 statuses), pagination, skeletons, empty state, error retry. `?status=` is reflected in the URL.
- **`/campaigns/[id]` detail page** that fetches the campaign with `?includeSponsorships=true`, the backing project, the public donor list, and related impact updates in parallel. Renders:
  - hero with photo, status, days-left, progress bar, donate + view-project buttons
  - story section
  - backing project card with its own progress bar and link to project page
  - sponsors section (matching / milestone / campus_sponsor / general badges)
  - recent donors (top 5) with total count
  - latest field updates
- **Donate flow** (`/campaigns/[id]/donate`):
  - 6 preset amounts + custom input in whole ETB
  - payment method picker (Chapa / Zeffy / PayPal / Stripe); Zeffy shows USD/CAD note + same-email reminder
  - guest donor name/email fields (required for gifts at/above the 5,000 ETB review threshold; zod `superRefine` enforces it)
  - optional message + anonymous toggle
  - live side panel showing the gift summary + campaign progress
  - submit → `POST /donations` → `window.location.assign(checkoutUrl)`
  - threshold banner explains the manual-review flow
- **Donate return** (`/campaigns/[id]/donate/return`):
  - reads `?status=`, `?tx_ref=`, `?amount=` from the gateway callback
  - 4 outcome panels: processing, completed, manual_review, failed
  - polls the campaign donor list every 2 s (until a tx-id match is found or 20 attempts)
  - "What happens next?" explainer
- **Featured campaigns** on the home page (top 3 active, with skeletons).
- **Site header nav** now highlights the active route (Projects / Campaigns / Certificates).

### Verified
- `npx tsc --noEmit` — clean
- `npm run lint` — 0 errors, 1 known false-positive warning from React Compiler against react-hook-form's `watch()` (incompatible library)
- `npm run build` — 8 routes: `/`, `/_not-found`, `/campaigns`, `/campaigns/[id]`, `/campaigns/[id]/donate`, `/campaigns/[id]/donate/return`, `/projects`, `/projects/[id]`
- `npm run dev` + `curl` — all routes return 200, return page shows the "Processing" panel on a `?status=pending` callback

### Decisions made
- The mock `POST /donations` immediately returns a `checkoutUrl` pointing at our own `/donate/return` so the entire UX is exercisable end-to-end without a real gateway. The "checkout" is a soft redirect; the donor sees our return page with a "Processing" state, then it polls and the donation settles after ~3 s.
- We poll the public donor list to detect settlement rather than adding a public `GET /donations/:id` (which doesn't exist in the spec). When the backend is wired up, we can add a targeted `GET /donations/by-transaction/:txRef` or hook into the gateway's webhook and switch the return page over.
- The donate form shows preset amounts as whole ETB; the conversion to smallest-unit happens at submit time (`parseToSmallestUnit`).
- We deliberately used `useForm`'s `watch()` for the live side-panel summary. React Compiler's static analysis can't safely memoize it; this is a known limitation, not a bug.

### Next: Phase 4 — account dashboard (my donations, my certificates, my campaigns)

---

## Phase 3 — Auth + onboarding ✅ complete

### Done
- **MSW handlers for the user lifecycle**:
  - Smarter `GET /users/me` that looks up the bearer token: `mock-meron` → seeded Meron user; any `mock-anon*` → a previously registered user with that `firebaseUid`; anything else → 401.
  - `POST /api/mock/users` accepts the registration payload and pushes a new user into the in-memory store.
  - `PATCH /api/mock/users/me` lets the seeded Meron update her profile.
  - `POST /api/mock/notifications/device-tokens` and the matching `DELETE` (204s both) so the device-token registration story is at least API-complete.
- **Auth context refactor** (`src/lib/auth/context.tsx`):
  - Added a "mock mode" path that reads a fake token from `localStorage` and synthesizes a Firebase User, so the whole auth flow can be exercised without a real Firebase project.
  - `useAuth()` now exposes `isMockMode` and a `devSignIn(mode)` helper for the demo buttons.
  - `signInWithEmail` / `signUpWithEmail` / `signInWithGoogle` / `signOut` / `resetPassword` all route through either Firebase or the mock path, depending on `NEXT_PUBLIC_API_MOCK`.
  - `refreshDowProfile()` re-fetches `GET /users/me` and flips the state.
- **Auth forms**:
  - `/sign-in` — email/password form (react-hook-form + zod) + "Continue with Google" button. In mock mode, two extra demo buttons ("Sign in as Meron" and "Sign in as a brand-new user"). Reads `?next=` to send the user back where they came from.
  - `/sign-up` — email + password + confirm. On success, the mock flow leaves the token at `mock-anon*` and redirects to `/onboarding`. The real Firebase flow does the same.
  - `/onboarding` — full profile form (name, phone, entity type, bio/location/organization, one social link). Validates with zod. On submit, calls `POST /users`, then `refreshDowProfile()` to flip from `needs-onboarding` to `authenticated`.
- **Account route group with route guards**:
  - `src/app/(account)/layout.tsx` redirects unauthenticated users to `/sign-in?next=…` and `needs-onboarding` users to `/onboarding`. Renders a tabbed sub-nav (Profile / My donations / My certificates / My campaigns / Notifications).
  - `src/app/(account)/me/page.tsx` — the profile landing. Shows the DoW profile (name, email, phone, entity type, role badges, optional profile fields) plus a sidebar of "what you can do" links to the other tabs.
  - Placeholder pages for `/me/donations`, `/me/certificates`, `/me/campaigns`, `/me/notifications` — real implementations land in Phases 4 and 5.

### Verified
- `npx tsc --noEmit` — clean
- `npm run lint` — 0 errors, 1 known false positive from React Compiler against react-hook-form's `watch()`
- `npm run build` — 14 routes including the 5 placeholder account pages
- `npm run dev` + `curl` — `/sign-in`, `/sign-up`, `/onboarding`, `/me` all 200; the protected ones correctly show "Loading…" on SSR and the route guard takes over on the client

### Decisions made
- The "mock mode" lives entirely on the client (fake token in `localStorage`, synthesized Firebase User object). When the real Firebase project is wired up, `signInWithEmail` will just go through the real SDK and the `mock-meron` / `mock-anon` branches never run. No code in the API client or the resource modules needs to change.
- The `MockBoot` is fine to keep on for the demo. The auth forms surface two demo buttons so the rest of the app (donate, my-account) is reachable without a Firebase project.
- The onboarding schema is built from scratch in the form (not extending `registerUserSchema`) because zod 4 doesn't allow `.extend` on `ZodOptional<ZodObject>`. The form's values are translated into a `RegisterUserInput` payload at submit time.
- The account layout tabs include placeholders for the next two phases so the navigation is real now and the implementation lands in Phase 4/5 without restructuring.

### Next: Phase 4 — account dashboard
- `/me/donations` — `GET /donations/me` list, status filters, deep-link to the matching campaign.
- `/me/certificates` — `GET /certificates/me` with the bronze/silver/gold/champion badge, "Generate" button (calls `POST /certificates/generate`), share-link modal with the certificate code.
- `/me/campaigns` placeholder → Phase 5.
- `/me/notifications` — list from `GET /notifications/me`, register/unregister FCM device tokens.
- Cross-cutting: the donate form should suggest signing in (or require it) when the gift hits the manual-review threshold.

---

## Phase 4 — Account dashboard ✅ complete

### Done
- **In-process mock engine** now serves these new endpoints (in addition to the existing ones): `GET /donations/me`, `GET /certificates/me`, `POST /certificates/generate`, `PATCH /certificates/:id/visibility`, `GET /notifications/me`, `POST /notifications/device-tokens`, `DELETE /notifications/device-tokens`.
- `donationsApi.mine()` now accepts a `status` filter.
- Seed data: added 2 more donations for Meron (one completed, one pending via Zeffy) so the donations list has something to show.
- **`/me/donations`** — paginated, status-filtered list of the signed-in user's donations. Each row shows status badge, high-value flag, donor name, campaign link (with title fetched on demand), date, payment method, and amount. Empty state links to `/campaigns`.
- **`/me/certificates`** — list of the user's certificates with:
  - Two "generate" cards (fundraising / volunteer time) with explanations of the tier thresholds.
  - Each cert shows badge level, type, public/private badge, title, description, totals, issued date, version.
  - One-click copy-to-clipboard share link, public/private toggle, "Open page" link to the public certificate.
  - On success: invalidates `["certificates", "me"]` so the list refreshes.
- **`/me/notifications`** — list of in-app notifications (read state shown with a colored dot + "new" badge). A "Push notifications" card lets you register / unregister a device token (any string works in dev; the real Firebase SDK will provide the real one in prod).
- **`/certificates/[code]`** — public certificate view page. Reachable by anyone with the link; private certificates show "This certificate is private" to non-owners and a 404-style message to anonymous visitors. Shows badge, recipient, totals, related campaign links, and a copyable share code.
- **`/me` sidebar** now links to Notifications alongside the existing entries.

### Verified
- `npx tsc --noEmit` — clean
- `npm run lint` — 0 errors, 1 known false positive (RHF `watch()`)
- `npm run build` — 17 routes including the new `/certificates/[code]`

### Decisions made
- The certificate generate endpoint in the mock uses the user's seeded `completed` donations to compute the badge level. This means Meron (who has 12,500 ETB in the seed) will land in the **silver** tier; a brand-new user will get a 400 ("below bronze tier"). The real backend computes per-campaign ratios, so this is a faithful approximation.
- The donate form does **not** automatically route high-value gifts through a sign-in gate (yet). I left that for Phase 5 or later — current behavior is the same as Phase 2, with the 5,000 ETB banner on the form.
- The `/certificates/[code]` page is server-route-agnostic: it works for both public and owner reads. Private certificates correctly 404 for anonymous visitors and show a polite "private" message for authenticated non-owners (the backend's `GET /certificates/:code` returns 404 in both cases — the frontend differentiates by checking the auth state).

### Next: Phase 5 — campaign creator flow
- `/me/campaigns` (currently a placeholder): list campaigns the user created or co-fundraised, with status filters.
- `/me/campaigns/new`: create a new campaign against a fundable project (uses `POST /campaigns`).
- `/me/campaigns/[id]/manage`: edit, submit-for-approval, see approval state, join-as-co-fundraiser button on joinable+active campaigns.
- Wire the existing `/campaigns` filters to "My campaigns" too.
