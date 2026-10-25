# Drop of Water — Frontend

Crowdfunding platform for water-infrastructure projects in Ethiopia. Donors fund campaigns, campaigners raise money against verified projects, and staff review donations, publish field updates, and manage projects.

This repository is the **Next.js frontend**. It consumes a separate NestJS backend (documented in [`API.md`](./API.md)); there is no backend code here.

## Tech stack

- **Next.js 16** (App Router, React 19, TypeScript)
- **Tailwind CSS v4**
- **TanStack Query** for data fetching and caching
- **React Hook Form + Zod** for forms and validation
- **Firebase Auth** for sign-in (ID token sent as `Authorization: Bearer`)
- **Firebase Cloud Messaging** for push (opt-in)

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev                  # http://localhost:3000
```

### Environment variables

See `.env.example`. All variables are public (`NEXT_PUBLIC_*`).

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL |
| `NEXT_PUBLIC_API_MOCK` | `true` runs an in-process mock API (no backend needed) |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase web config (auth + messaging) |

> With `NEXT_PUBLIC_API_MOCK=true` the app runs fully offline against a seeded mock; set it to `false` to use the real backend.

## Scripts

```bash
npm run dev      # dev server
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint
```

Type-check: `npx tsc --noEmit`.

## Architecture

```
src/
  app/              routes (App Router)
    (account)/me    donor + creator account area
    (staff)/admin   staff area (program_director / finance_admin / system_admin)
  components/       UI components (ui/ = primitives: button, card, badge, …)
  lib/
    api/            one module per resource (users, campaigns, donations, …)
    schemas/        Zod schemas — single source of truth for types
    transformers/   raw backend shape -> clean app shape (pure functions)
    auth/           AuthProvider + auth state machine
    enums.ts        shared roles, statuses, constants
```

**Data flow:** `api/` parses input with a Zod schema → calls `fetch` → `transformers/` normalize the raw response → a clean Zod schema validates it. Components never see raw backend shapes.

**Auth states:** `loading → unauthenticated → needs-onboarding → authenticated`. Until `POST /users` creates a DoW profile, protected routes return 401.

## Main routes

- Public: `/`, `/projects`, `/projects/:id`, `/campaigns`, `/campaigns/:id`, `/campaigns/:id/donate`, `/certificates`, `/certificates/:code`
- Auth: `/sign-in`, `/sign-up`, `/onboarding`
- Account: `/me` (+ donations, certificates, campaigns, impact updates, notifications, edit)
- Staff: `/admin` (+ review queue, projects, campaigns, sponsorships, donations, users, pending updates)

## Notes

- **Money is an integer in the smallest currency unit** (e.g. santim). Never treat API amounts as major units.
- **Role-based access.** Staff roles: `program_director`, `finance_admin`, `system_admin`. Campaign creators, content managers, and finance each have their own capabilities.
- Backend-side issues found during integration are tracked in [`BACKEND-HANDOFF.md`](./BACKEND-HANDOFF.md).
- `test/` contains integration probe scripts and real-backend captures; it is git-ignored (may contain live credentials and production data).
