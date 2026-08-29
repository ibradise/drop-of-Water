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

### Next: Phase 2 — public campaigns + donate flow
- `/campaigns` list (with status filter, pagination)
- `/campaigns/[id]` detail with sponsors (using `?includeSponsorships=true`)
- `/campaigns/[id]/donate` form with the state machine (submit → redirect to gateway → return)
- Public donor list on the campaign page
