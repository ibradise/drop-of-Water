# Drop of Water — Frontend Plan

A crowdfunding platform for water-infrastructure projects in Ethiopia. The backend is already built (NestJS + MongoDB + Firebase Auth, 77 endpoints across 9 sections, 7 main collections). This document is the build plan for the Next.js 16 frontend.

---

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16 (App Router) + TypeScript** | SSR for SEO on public project/campaign pages, file-based routing, mature, fits an auth-heavy + content-heavy app |
| Styling | **Tailwind CSS v4 + custom primitives** | Fast, accessible; we built our own Card/Button/Badge/Money to avoid shadcn/cli overhead in a non-interactive env |
| API client | **Hand-written typed wrapper over `fetch`** | Calls the 77 endpoints per `API.md`, with zod validation of every response |
| Data fetching | **TanStack Query (React Query) v5** | Caching, retries, optimistic updates |
| Forms | **react-hook-form + zod** | Same zod schemas reused for runtime validation |
| Auth | **Firebase Auth SDK** (client-side) → ID token sent on every request | Matches the backend's spec exactly |
| Mocking | **MSW (Mock Service Worker)** | Will be enabled when `NEXT_PUBLIC_API_MOCK=true` and no backend URL is available |
| Push | **Firebase Cloud Messaging** (web) | Required by `POST /notifications/device-tokens` |
| Lint/format | **ESLint (Next 16 flat config) + Prettier-ready** | Standard |
| Testing (later) | **Vitest + Testing Library** (unit), **Playwright** (e2e) | — |
| Deploy | TBD | Likely Vercel or your existing infra |

---

## 2. High-level architecture

```
src/
  app/                          ← Next.js App Router
    (public)/                   ← unauthenticated, SSR for SEO
      page.tsx                  ← home
      projects/
        page.tsx                ← list
        [id]/page.tsx           ← detail
      campaigns/
        page.tsx                ← list
        [id]/page.tsx           ← detail
        [id]/donate/page.tsx    ← donation flow
        [id]/donate/return/page.tsx  ← gateway redirect handler
      certificates/
        [code]/page.tsx         ← public verify
    (auth)/                     ← sign-in / sign-up
      sign-in/page.tsx
      sign-up/page.tsx
    (account)/                  ← auth-gated, donor self-service
      layout.tsx                ← checks DoW profile, redirects to /onboarding if missing
      me/                       ← profile
      me/donations/             ← my donations
      me/certificates/          ← my certificates
      me/campaigns/             ← my campaigns (creator)
      me/notifications/         ← my notifications
      onboarding/page.tsx       ← POST /users to create DoW profile
    (staff)/                    ← role-gated staff dashboards
      admin/
        page.tsx                ← dashboard summary
        review-queue/page.tsx
        donations/page.tsx
        projects/page.tsx
        campaigns/page.tsx
        impact-updates/page.tsx
        users/page.tsx
      projects/new/page.tsx     ← project managers
      projects/[id]/manage/     ← milestones, cost items, photos, proofs
      campaigns/pending/        ← content managers: approve/reject
      impact-updates/           ← contributors + managers
    api/                        ← (optional) BFF routes
  lib/
    api/                        ← typed client + resource modules
    auth/                       ← Firebase init + AuthProvider + useAuth
    query/                      ← React Query provider
    schemas/                    ← zod schemas mirroring API.md
    money.ts                    ← format/parse smallest-unit
    enums.ts                    ← roles, statuses, payment methods
    cn.ts
    firebase/
  components/                   ← shared UI primitives
  features/                     ← feature folders (donations, certificates, ...)
  types/                        ← generated from OpenAPI (later)
```

---

## 3. Cross-cutting concerns

### 3.1 Auth + onboarding
- Single source of truth: `useAuth()` returns `{ firebaseUser, dowUser, idToken, roles, isReady }`.
- Every API call attaches `Authorization: Bearer <idToken>` (via the registered `tokenProvider`).
- **First-time flow:** if `firebaseUser && !dowUser` → `needs-onboarding` state → redirect to `/onboarding` which calls `POST /users`. Until that succeeds, other protected routes show a loading state, not a 401.
- Role-gated routes use `<RequireRole roles={…}>` (wrapper).
- FCM device token: on first authenticated load, request permission, get token, `POST /notifications/device-tokens`. Unregister on logout.

### 3.2 API client
- One `apiFetch(path, init)` wrapper:
  - Reads current ID token from a registered async provider.
  - Sets `Authorization`, base URL from env (`NEXT_PUBLIC_API_URL`).
  - Throws typed `ApiError` with `statusCode`, `messages` (string | string[]), plus helpers: `isUnauthorized`, `isForbidden`, `isNotFound`, `isConflict`, `isValidation`.
- 9 resource modules (`usersApi`, `projectsApi`, `campaignsApi`, `sponsorshipsApi`, `donationsApi`, `impactUpdatesApi`, `certificatesApi`, `adminApi`, `notificationsApi`) wrap `api` and validate every response with zod.

### 3.3 Money everywhere
- All API money values are integers in the **smallest currency unit** (e.g. 5,000 ETB = `500000`).
- `<Money cents={…} currency={…} />` component handles formatting (handles zero-decimal currencies like ETB conventionally — we treat ETB as 2-decimal to match the backend's `500000` smallest-unit convention; sponsorships default to USD).
- Inputs accept either whole units (UI) or smallest units (API) — we standardize on **whole units in the UI, convert on submit** (`parseToSmallestUnit`).

### 3.4 Donation flow (the highest-stakes screen)
State machine:
```
idle → submitting → awaitingCheckout → processing → success | failed | manualReview
```
- On submit → `POST /donations` → immediately `window.location = checkout.checkoutUrl`.
- Gateway redirect back lands on `/campaigns/[id]/donate/return?status=…&tx_ref=…` — show "processing, you'll get a notification". Never declare success on the redirect alone.
- `manual_review` UX: "Payment received, our team will verify and confirm."
- A guest donor sees the same flow with optional name/email; backend accepts both.

### 3.5 Role-based UI
- `useAuth().state.user.roles` is the source of truth.
- `<Can roles={…}>` for in-page hiding; `<RequireRole roles={…}>` for whole pages.
- A single `hasAnyRole(userRoles, allowed)` helper (already in `lib/enums.ts`) centralizes authorization.

### 3.6 Validation strictness
- The backend rejects unknown body fields. Our zod schemas are `.strict()` so the frontend fails fast in dev if a typo sneaks in.

### 3.7 Soft delete + 404
- Every list query treats "missing" as "not found", not "error". Use a shared `<EmptyState />`.

### 3.8 Mocks (MSW) — when needed
- Handlers for the 7 main collections, deterministic seed data, simulated webhook settlement (after 5s, a `pending` donation flips to `completed`).
- Activated only when `NEXT_PUBLIC_API_MOCK=true`.

---

## 4. Domain model (built in `lib/schemas/`)

The 7 fully-specified collections in `API.md`:

1. **users** — id, firebaseUid, email, name, phoneNumber, roles[], entityType, isVerified, isActive, profile{avatarUrl, bio, location, organizationName, socialLinks[]}
2. **projects** — id, title, description, location, budget, currency, currentFunding, costBreakdown[], beneficiaryCount, status, milestones[], photos[], proofOfImpact[]
3. **campaigns** — id, projectId, title, summary, story, goalAmount, currentAmount, currency, dropsGoal, status, joinable, participants[], photos[], sponsorships? (when `?includeSponsorships=true`)
4. **sponsorships** — id, campaignId, corporateName, logoUrl, amount, currency, message, type, isActive
5. **donations** — id, campaignId, projectId, donorId, donorSnapshot, amount, currency, paymentMethod, transactionId, paidAt, status, requiresManualReview, message, isAnonymous
6. **impact-updates** — id, projectId, campaignId, authorId, title, content, attachments[], status, publishedAt, rejectionReason
7. **certificates** — id, type, title, badgeLevel, recipient, totalAmount, totalHours, currency, relatedCampaignIds, certificateCode, isPublic, version, supersededAt

Plus 2 partial collections:
- **notifications** — read-only history (≤50, newest first)
- **device-tokens** — opaque to the client; just a token string sent to `POST /notifications/device-tokens`

Lifecycles to enforce in UI:
- **Project**: `draft → assessment → fundable → funded → in_progress → completed` (+ `archived`)
- **Campaign**: `draft → pending_approval → active → completed` (+ `paused`, `cancelled`)
- **Donation**: `pending → completed` (or via `manual_review` for ≥ 5,000 ETB after capture)
- **Impact update**: `draft → submitted → published` (+ `rejected`)

Certificate tiers:

| Tier | fundraising (whole units) | volunteer_time (hours) |
|---|---|---|
| bronze | 1,000 | 10 |
| silver | 10,000 | 50 |
| gold | 50,000 | 150 |
| champion | 250,000 | 500 |

---

## 5. Build order (incremental, demo-able each step)

| Phase | What | Demo |
|---|---|---|
| **0. Scaffold** ✅ | Next.js + TS + Tailwind + Firebase init + API client + auth context + UI primitives + landing page | Empty app boots, lint/typecheck/build pass |
| **1. Public site** | Home polish, `/projects`, `/projects/:id` (with milestones, photos, proofs) | Browse projects, no auth |
| **2. Public campaigns + donate** | `/campaigns`, `/campaigns/:id` (with optional sponsors), donation flow with Chapa redirect | Donate as guest end-to-end (mocked or real) |
| **3. Auth + onboarding** | Sign-in, FCM token, `POST /users`, `/me` | Sign up, see own profile |
| **4. Account dashboard** | My donations, my certificates (generate + share) | Donor self-service |
| **5. Campaign creator flow** | Create / submit / manage campaigns, join as co-fundraiser | External user runs a campaign |
| **6. Staff dashboards** | Admin summary, review queue, donation review, project management, content publishing | Internal team uses it |
| **7. Polish** | Empty states, loading skeletons, error toasts, a11y, e2e tests, deploy | Ship |

Each phase is independently mergeable.

---

## 6. Open questions / decisions

1. **Brand / visual identity** — is there a logo, palette, or reference site? Currently using a calm sky-blue palette.
2. **i18n** — spec is in English; do you also need Amharic?
3. **Auth providers** — Firebase supports email/password, Google, phone, etc. Which to ship first?
4. **Deploy target** — Vercel? Self-hosted Node? Static + separate API host?
5. **Multi-currency display** — how to surface mixed-currency totals to users.
6. **Backend access** — when can we get the repo / dev URL so we can flip MSW off and test against the real API?

---

## 7. Key technical notes for future contributors

- **Money is always integer smallest-unit.** Never display `5000.00` from the API — it's already in cents.
- **Strict validation.** Unknown body fields → 400. Use `.strict()` zod schemas for inputs.
- **The donate flow does not "succeed" on submit.** Show "processing" until the webhook settles. High-value gifts (≥ 5,000 ETB) go through `manual_review` after capture.
- **Firebase ID token, not custom JWT.** Get it via `firebaseUser.getIdToken()` and send as `Authorization: Bearer …`.
- **Onboarding is mandatory.** Until `POST /users` is called, every other protected route returns 401. The `AuthProvider` already handles this with a `needs-onboarding` state.
- **Zeffy has no merchant reference.** Donor must use the same email on the Zeffy form as on the donation.
- **Reference fields can be populated.** `projectId` / `campaignId` / `authorId` on impact updates may arrive as id-string OR embedded object — handle both.
