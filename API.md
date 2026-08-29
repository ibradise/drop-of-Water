# Drop of Water — Backend API Guide (for Frontend Developers)

REST API for the Drop of Water (DoW) crowdfunding platform. This guide covers every endpoint, its auth requirements, parameters, request bodies, and response shapes.

> **Interactive docs:** run the backend (`npm run start:dev`) and open **`http://localhost:3000/docs`** for Swagger UI (try-it-out included). The raw OpenAPI JSON is at **`/docs-json`** — you can feed it to codegen tools (openapi-typescript, orval, etc.).

---

## Table of contents

1. [Core concepts & conventions](#1-core-concepts--conventions)
2. [Authentication](#2-authentication)
3. [Roles](#3-roles)
4. [Pagination](#4-pagination)
5. [Errors](#5-errors)
6. [Endpoints](#6-endpoints)
   - [Users](#users)
   - [Projects](#projects)
   - [Campaigns](#campaigns)
   - [Sponsorships](#sponsorships)
   - [Donations](#donations)
   - [Impact Updates](#impact-updates)
   - [Certificates](#certificates)
   - [Admin](#admin)
   - [Notifications](#notifications)
7. [Lifecycle / status reference](#7-lifecycle--status-reference)
8. [Data model quick reference](#8-data-model-quick-reference)

---

## 1. Core concepts & conventions

The platform revolves around four entities:

- **Project** — a physical water-infrastructure initiative (well, borehole, …). Created and managed only by the internal team. Campaigns can only be created against a project in `fundable` status.
- **Campaign** — a fundraising effort created by an external user against a fundable project. Goes through a draft → approval → active lifecycle.
- **Donation** — a single gift, either designated to a campaign or an unrestricted general-fund gift (no `campaignId`). Settled asynchronously by a payment-gateway webhook.
- **Impact Update** — a story/reporting post tied to a project (optionally a campaign). Authored by contributors, approved and published by content managers. Only `published` updates are publicly visible.

Alongside these, a **Sponsorship** records a corporate backer of a campaign (logo, blurb, optional pledge). Registered by the internal team, publicly visible while `isActive`.

**Conventions that apply everywhere:**

- **Money is always an integer in the smallest currency unit** (e.g. cents / santim). `goalAmount: 500000` with `currency: "ETB"` means 5,000 ETB. Default currency is `ETB`.
- **Ids** are MongoDB ObjectId strings (24 hex chars), e.g. `"665f1c2ab1e2f3a4b5c6d7e8"`.
- **Timestamps** are ISO 8601 strings. All documents carry `createdAt` / `updatedAt`.
- **Request bodies are strictly validated**: unknown fields are **rejected with 400** (`forbidNonWhitelisted`), not ignored. Send exactly what the DTO defines.
- Deletes are **soft deletes** — the record is flagged, the API returns the deleted document, and it disappears from listings.
- Responses return the raw document; Mongo internals (`__v`) and soft-delete bookkeeping (`isDeleted`) are stripped.

## 2. Authentication

Auth is **Firebase Authentication**. The frontend signs the user in with the Firebase SDK, obtains an **ID token**, and sends it on every protected request:

```
Authorization: Bearer <firebaseIdToken>
```

There are no `/auth/login` or `/auth/refresh` endpoints on this API — token acquisition and refresh are entirely the Firebase SDK's job.

Access levels used below:

| Level | Meaning |
|---|---|
| **Public** | No token needed. |
| **Auth** | Any valid token belonging to a registered DoW user. |
| **Auth (optional)** | Token honored if present, not required (only `POST /donations`). |
| **Roles: …** | Valid token **and** at least one of the listed roles. |

**Onboarding flow:** a Firebase-authenticated user does not automatically have a DoW account. After the first Firebase sign-in, call `POST /users` to create the DoW profile — that route is the only protected route that works with a token not yet linked to a DoW user. Until then, other protected routes return **401**.

## 3. Roles

A user holds an **array** of roles (`roles: string[]`). Defaults to `["donor"]`.

| Role value | Who |
|---|---|
| `donor` | Regular donor (default). |
| `campaign_creator` | External fundraiser (student, volunteer, corporate…). |
| `chapter_leader` | Leader of a DoW chapter. |
| `content_contributor` | Writes impact updates. |
| `content_manager` | Reviews/publishes content, manages campaigns. |
| `digital_coordinator` | Digital team; campaign + content management. |
| `project_manager` | Delivery team; milestones & proofs. |
| `site_engineer` | On-site delivery team; milestones & proofs. |
| `program_director` | Leadership; full project + oversight powers. |
| `finance_admin` | Finance; donation review/refunds + oversight. |
| `system_admin` | Full access. |

Named role groups used in the tables below:

- **Campaign creators** = `campaign_creator`, `chapter_leader`, `content_contributor`, `content_manager`, `digital_coordinator`, `program_director`, `system_admin`
- **Campaign managers** = `content_manager`, `digital_coordinator`, `program_director`, `system_admin`
- **Project managers** = `program_director`, `system_admin`
- **Delivery team** = `program_director`, `system_admin`, `project_manager`, `site_engineer`
- **Content contributors** = `content_contributor`, `content_manager`, `chapter_leader`, `site_engineer`, `project_manager`, `digital_coordinator`, `program_director`, `system_admin`
- **Content managers** = `content_manager`, `digital_coordinator`, `program_director`, `system_admin`
- **Finance** = `finance_admin`, `program_director`, `system_admin`
- **Sponsorship managers** = `system_admin`, `program_director`, `finance_admin`
- **Admin dashboard** = `program_director`, `finance_admin`, `system_admin`

## 4. Pagination

Every list endpoint takes the same query params and returns the same envelope:

| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | integer ≥ 1 | `1` | 1-based. |
| `limit` | integer 1–100 | `10` | Page size. |

```json
{
  "data": [ /* array of documents */ ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 10,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

## 5. Errors

Standard NestJS error envelope:

```json
{ "statusCode": 400, "message": ["amount must be at least 1"], "error": "Bad Request" }
```

| Code | When |
|---|---|
| `400` | Validation failed, unknown body field, illegal status transition, malformed id. |
| `401` | Missing/expired/invalid Firebase token, or no DoW account registered for it. |
| `403` | Authenticated but lacking a required role (or not the owner where ownership matters). |
| `404` | Resource does not exist (or is soft-deleted). |
| `409` | Conflict (e.g. registering a user that already exists). |

`message` is a string or an array of strings (one per failed validation rule).

---

## 6. Endpoints

### Users

Base path: `/users`

| Method & path | Access | Purpose |
|---|---|---|
| `POST /users` | Auth (Firebase token; no DoW account needed) | Register the caller's DoW profile |
| `GET /users/me` | Auth | Own profile |
| `PATCH /users/me` | Auth | Update own profile |
| `GET /users` | Roles: `system_admin` | List users (paginated + filters) |
| `GET /users/:id` | Roles: `system_admin`, `program_director` | Get any user |
| `PATCH /users/:id` | Roles: `system_admin` | Update any user (incl. roles/flags) |
| `DELETE /users/:id` | Roles: `system_admin` | Soft-delete a user |

#### `POST /users` — register

Creates the DoW profile for the caller's Firebase identity. UID and email come from the **verified token** — an `email` in the body is overridden. Returns **201** with the created user.

```json
{
  "name": "Abebe Bikila",                    // required, 2–120 chars
  "phoneNumber": "+251911223344",            // optional, valid phone number
  "roles": ["donor", "campaign_creator"],    // optional, defaults to ["donor"]
  "entityType": "individual",                // optional: individual | university | corporate | celebrity | diaspora | chapter
  "profile": {                               // optional
    "avatarUrl": "https://…",                // optional, URL
    "bio": "…",                              // optional, ≤1000 chars
    "location": "Addis Ababa",               // optional, ≤200 chars
    "organizationName": "…",                 // optional, ≤200 chars
    "socialLinks": [                         // optional
      { "platform": "instagram", "profileUrl": "https://…", "isPrimary": true }
    ]
  }
}
```

#### `PATCH /users/me` — update own profile

Partial update; only `name`, `phoneNumber`, `entityType`, `profile` are applied. Privileged fields (`roles`, `isVerified`, `isActive`, `email`) are **silently ignored** even if sent. Profile attributes **merge** (omitted attributes keep their values).

`profile.socialLinks` is **not replaced wholesale** — it's edited by operations (removals apply first, by index against the stored array, then additions append):

```json
{
  "name": "New Name",
  "profile": {
    "bio": "Updated bio",
    "socialLinks": {
      "add":    [{ "platform": "x", "profileUrl": "https://x.com/me", "isPrimary": false }],
      "remove": [0]
    }
  }
}
```

#### `GET /users` — list (admin)

Filters (all optional): `role` (a role value), `entityType`, `isVerified`, `isActive`, `isDeleted`. Booleans accept `true`/`false`/`1`/`0`. Omit a filter to not filter on it.

#### `PATCH /users/:id` — admin update

Same shape as `PATCH /users/me` **plus** the privileged fields:

```json
{ "roles": ["content_manager"], "isVerified": true, "isActive": true }
```

#### User response shape

```json
{
  "_id": "665f…", "id": "665f…",
  "firebaseUid": "…", "email": "user@example.com", "name": "…",
  "phoneNumber": "+251…",
  "roles": ["donor"],
  "entityType": "individual",            // or null
  "isVerified": false, "isActive": true,
  "profile": { "avatarUrl": "…", "bio": "…", "location": "…", "organizationName": "…", "socialLinks": [] },
  "createdAt": "…", "updatedAt": "…"
}
```
(`/users/me` responses omit soft-delete fields; admin routes may include them.)

---

### Projects

Base path: `/projects` — a project embeds its `milestones`, `costBreakdown`, `photos`, and `proofOfImpact`; those arrays are managed only through sub-resource routes, never through `PATCH /projects/:id`.

| Method & path | Access | Purpose |
|---|---|---|
| `GET /projects` | Public | List projects (`?status=` filter) |
| `GET /projects/fundable` | Public | Projects campaigns can be created against |
| `GET /projects/:id` | Public | One project (with all embedded arrays) |
| `POST /projects` | Project managers | Create (starts `draft`) |
| `PATCH /projects/:id` | Project managers | Update fields / advance status |
| `DELETE /projects/:id` | Project managers | Soft-delete |
| `POST /projects/:id/milestones` | Delivery team | Add milestone(s), ≤20/request |
| `PATCH /projects/:id/milestones/:milestoneId` | Delivery team | Update one milestone |
| `DELETE /projects/:id/milestones/:milestoneId` | Delivery team | Remove a milestone |
| `POST /projects/:id/cost-items` | Project managers | Add cost item(s), ≤50/request |
| `DELETE /projects/:id/cost-items/:itemId` | Project managers | Remove a cost item |
| `POST /projects/:id/photos` | Project managers | Add photo URL(s), ≤50/request |
| `DELETE /projects/:id/photos?index=N` | Project managers | Remove photo by zero-based index |
| `POST /projects/:id/proofs` | Delivery team | Add proof(s) of impact, ≤20/request |
| `DELETE /projects/:id/proofs/:proofId` | Delivery team | Remove a proof entry |

All sub-resource routes return the **full updated project document**.

#### `POST /projects` — create

```json
{
  "title": "Borehole at Adama",              // required, ≤200 chars
  "shortDescription": "…",                   // optional, ≤500
  "fullDescription": "…",                    // optional (long text)
  "location": { "lat": 8.54, "lng": 39.27 },// optional, valid lat/lng
  "gpsCoordinates": "8.54° N, 39.27° E",    // optional, ≤200
  "budget": 25000000,                        // required, int ≥ 0 (smallest unit)
  "currency": "ETB",                         // optional, 3 chars, default ETB
  "beneficiaryCount": 1200,                  // optional, int ≥ 0
  "estimatedPeopleServed": 5000,             // optional, int ≥ 0
  "costBreakdown": [ { "item": "Drilling", "amount": 12000000 } ],  // optional
  "photos": ["https://…"]                    // optional, URLs
}
```

`status` cannot be set — new projects start in `draft`.

#### `PATCH /projects/:id` — update

Any subset of the create fields (except `costBreakdown` / `photos` — use the sub-resource routes) plus:

```json
{ "status": "assessment" }
```

Status must follow the [project transition map](#7-lifecycle--status-reference); an illegal move is a 400.

#### Batch sub-resource bodies

`POST …/milestones`, `…/cost-items`, `…/proofs` each accept **three equivalent body shapes** — a single object, a raw array, or a wrapped array:

```json
{ "title": "Dig", "description": "phase 1" }
[{ "title": "Dig" }, { "title": "Line" }]
{ "items": [{ "title": "Dig" }] }
```

Item shapes:

- **Milestone**: `title` (required, 3–200), `description` (optional, ≤2000). New milestones start with `status: "pending"`.
- **Cost item**: `item` (required, ≤200), `amount` (required, int ≥ 0, smallest unit).
- **Proof of impact**: `type` (required, ≤50 — e.g. `"photo"`, `"video"`, `"document"`, `"report"`), `url` (required, URL). `uploadedBy`/`date` are stamped server-side.
- **Photos**: items are **plain URL strings** — send `["https://a.jpg"]` or `{ "items": ["https://a.jpg"] }`.

#### `PATCH /projects/:id/milestones/:milestoneId`

Partial merge — only supplied fields change:

```json
{
  "title": "…", "description": "…",
  "status": "in_progress",                   // free-form label: pending | in_progress | done | …
  "completedAt": "2026-07-01T00:00:00.000Z"  // ISO 8601; setting it also records the caller as verifier
}
```

#### Project response shape

```json
{
  "_id": "…", "title": "…", "shortDescription": "…", "fullDescription": "…",
  "location": { "lat": 8.54, "lng": 39.27 }, "gpsCoordinates": "…",
  "budget": 25000000, "currency": "ETB", "currentFunding": 4000000,
  "costBreakdown": [ { "_id": "…", "item": "Drilling", "amount": 12000000 } ],
  "beneficiaryCount": 1200, "estimatedPeopleServed": 5000,
  "status": "fundable",
  "milestones": [ { "_id": "…", "title": "…", "description": "…", "status": "pending", "completedAt": null, "verifiedBy": null } ],
  "photos": ["https://…"],
  "proofOfImpact": [ { "_id": "…", "type": "photo", "url": "https://…", "uploadedBy": "…", "date": "…" } ],
  "createdBy": "…", "updatedBy": "…", "createdAt": "…", "updatedAt": "…"
}
```

---

### Campaigns

Base path: `/campaigns`

| Method & path | Access | Purpose |
|---|---|---|
| `GET /campaigns` | Public | List (`?status=`, `?projectId=` filters) |
| `GET /campaigns/active` | Public | Live campaigns only |
| `GET /campaigns/project/:projectId` | Public | A project's campaigns |
| `GET /campaigns/:id` | Public | One campaign |
| `GET /campaigns/:campaignId/sponsorships` | Public | A campaign's active sponsors ([details](#sponsorships)) |
| `POST /campaigns/:campaignId/sponsorships` | Sponsorship managers | Register a sponsor ([details](#sponsorships)) |
| `POST /campaigns` | Campaign creators | Create (starts `draft`) |
| `PATCH /campaigns/:id` | Campaign creators¹ | Update fields / status |
| `POST /campaigns/:id/submit` | Campaign creators¹ | `draft` → `pending_approval` (no body) |
| `POST /campaigns/:id/approve` | Campaign managers | `pending_approval` → `active` |
| `POST /campaigns/:id/reject` | Campaign managers | `pending_approval` → `draft` (no body) |
| `POST /campaigns/:id/join?role=…` | Auth | Join as co-fundraiser (no body) |
| `DELETE /campaigns/:id` | Campaign creators¹ | Soft-delete |

¹ Role gets you through the gate; the service additionally requires you to be the campaign's **creator or a manager**. Activation and `contentManagerId` assignment are manager-only.

#### `POST /campaigns` — create

```json
{
  "projectId": "665f…",          // required — must reference a *fundable* project
  "title": "Water for Adama",    // required, ≤200
  "summary": "…",                // optional, ≤500
  "story": "… markdown …",       // optional, long-form
  "goalAmount": 500000,          // required, int ≥ 0 (smallest unit)
  "currency": "ETB",             // optional, 3 chars
  "dropsGoal": 1000,             // optional, int ≥ 0 (gamified units)
  "startDate": "2026-08-01",     // optional, ISO 8601
  "endDate": "2026-12-31",       // optional, ISO 8601
  "joinable": true,              // optional, default false
  "photos": ["https://…"]        // optional, URLs
}
```

#### `PATCH /campaigns/:id` — update

Any subset of the create fields **except `projectId`** (immutable), plus:

```json
{ "status": "paused", "contentManagerId": "665f…" }
```

#### `POST /campaigns/:id/approve`

```json
{ "contentManagerId": "665f…" }   // optional; approver becomes content manager if omitted
```

#### `POST /campaigns/:id/join`

The optional participant label is a **query param**, not a body: `POST /campaigns/665f…/join?role=co_fundraiser` (≤50 chars, defaults to `fundraiser`). Fails with 400 if the campaign isn't `joinable`+`active`, if you own it, or if you already joined.

#### Campaign response shape

```json
{
  "_id": "…", "projectId": "…",
  "title": "…", "summary": "…", "story": "…",
  "goalAmount": 500000, "currentAmount": 120000, "currency": "ETB", "dropsGoal": 1000,
  "startDate": "…", "endDate": "…",
  "status": "active", "joinable": true,
  "participants": [ { "_id": "…", "userId": "…", "role": "co_fundraiser", "joinedAt": "…" } ],
  "photos": ["https://…"],
  "createdBy": "…", "contentManagerId": "…", "approvedBy": "…", "updatedBy": "…",
  "createdAt": "…", "updatedAt": "…",
  "sponsorships": [ … ]          // only when ?includeSponsorships=true
}
```

`currentAmount` only grows when donations **settle** (see below).

#### Embedding sponsors — `?includeSponsorships=true`

All four public campaign reads (`GET /campaigns`, `/campaigns/active`, `/campaigns/project/:projectId`, `/campaigns/:id`) accept the optional flag `?includeSponsorships=true` (`1` also works). It adds a `sponsorships` array of the campaign's **active** sponsors, newest first. Omit the flag and the field is absent entirely — it costs an extra query, so it is opt-in.

---

### Sponsorships

Corporate backers of a campaign: the logos, blurbs, and (optional) pledges shown on the campaign page. A campaign may have many. Reads are public; every mutation is restricted to **system admin, program director, finance admin** — collectively "sponsorship managers". Unlike campaigns and impact updates there is **no owner tier**: any of the three roles may edit or delete any sponsorship.

Base paths: `/campaigns/:campaignId/sponsorships` (campaign-scoped) and `/sponsorships` (by id).

| Method & path | Access | Purpose |
|---|---|---|
| `GET /campaigns/:campaignId/sponsorships` | Public | A campaign's **active** sponsors, paginated |
| `POST /campaigns/:campaignId/sponsorships` | Sponsorship managers | Register a sponsor on that campaign |
| `PATCH /sponsorships/:id` | Sponsorship managers | Update fields (incl. `isActive`) |
| `DELETE /sponsorships/:id` | Sponsorship managers | Soft-delete |

**Visibility:** a sponsorship is publicly visible exactly while `isActive` is true and it is not deleted. `isActive: false` is the *reversible* way to pull a sponsor off the page; `DELETE` is the permanent one. The public listing and the embedded `sponsorships` array both apply the same filter.

#### `POST /campaigns/:campaignId/sponsorships` — create

`campaignId` comes from the **path** — do not send it in the body (unknown fields are rejected with 400).

```json
{
  "corporateName": "Acme Corp",     // required, ≤200
  "logoUrl": "https://…",           // optional, valid URL
  "amount": 500000,                 // optional, int ≥ 0 (smallest unit)
  "currency": "USD",                // optional, 3 chars, default USD
  "message": "Proud to support …",  // optional, ≤500
  "type": "matching",               // optional: matching | milestone | campus_sponsor | general (default general)
  "isActive": true                  // optional, default true → visible immediately
}
```

Returns **404** if the campaign doesn't exist or is soft-deleted.

#### `PATCH /sponsorships/:id` — update

Any subset of the create fields. `campaignId` is **immutable** — a sponsorship stays bound to the campaign it was created against; move a sponsor by deleting and re-creating it under the target campaign.

```json
{ "isActive": false }
```

#### Sponsorship response shape

```json
{
  "_id": "…", "campaignId": "…",
  "corporateName": "Acme Corp", "logoUrl": "https://…", "message": "…",
  "amount": 500000, "currency": "USD",
  "type": "matching", "isActive": true,
  "createdBy": "…", "updatedBy": "…",
  "createdAt": "…", "updatedAt": "…"
}
```

---

### Donations

Base path: `/donations`

| Method & path | Access | Purpose |
|---|---|---|
| `POST /donations` | Auth **optional** | Make a donation (guest or logged-in) |
| `GET /donations/campaign/:campaignId` | Public | A campaign's settled donations |
| `GET /donations/me` | Auth | Own donation history |
| `POST /payments/webhook/chapa` | Chapa → us | Signature-verified settlement callback (not for frontend) |
| `POST /payments/webhook/zeffy/:token` | Zeffy → us | Secret-URL + API-verified settlement callback (not for frontend) |
| `POST /donations/webhook` | Server-to-server | Legacy normalized callback (not for frontend) |
| `GET /donations` | Finance | List all (filters) |
| `GET /donations/review-queue` | Finance | `manual_review` queue, oldest first |
| `GET /donations/:id` | Finance | One donation |
| `PATCH /donations/:id/review` | Finance | Approve/reject a held donation |
| `POST /donations/:id/refund` | Finance | Refund a completed donation (no body) |
| `DELETE /donations/:id` | Finance | Soft-delete (does **not** reverse totals) |

#### `POST /donations` — the donation flow

Send a Bearer token to attribute the gift to the account; send none to donate as a guest (include `donor` contact details then).

```json
{
  "campaignId": "665f…",         // optional — omit for a general-fund gift
  "amount": 250000,              // required, int ≥ 1 (smallest unit)
  "paymentMethod": "chapa",      // required: chapa | zeffy | paypal | stripe | manual
  "message": "For clean water!", // optional, ≤1000
  "isAnonymous": false,          // optional — hide donor on public lists
  "donor": {                     // guests only; ignored when authenticated
    "name": "Guest Giver",       // optional, ≤120
    "email": "g@example.com"     // optional, valid email, ≤200
  }
}
```

**Response** is `{ donation, checkout }`:

```json
{
  "donation": { "…": "the created donation, status pending" },
  "checkout": {
    "checkoutUrl": "https://checkout.chapa.co/checkout/payment/…",
    "transactionRef": "dow-3f7c…",
    "gateway": "chapa"
  }
}
```

`checkout` is present for every online-gateway gift and absent only for `manual`
(offline) gifts, which staff settle. **Redirect the donor to `checkout.checkoutUrl`.**

**What happens next (important for UX):**

1. The donation is created `pending` — **always**, whatever the amount — and its `transactionRef` is stored as `transactionId`, the key the settlement webhook resolves by.
2. The donor pays on the gateway's hosted page. Chapa then calls `POST /payments/webhook/chapa`, which verifies the signature and re-verifies the charge against Chapa's API.
3. An ordinary gift settles to `completed` (or `failed`).
4. A **high-value** gift (`amount ≥ 500000`, i.e. 5,000 ETB) is instead parked in `manual_review` with `paidAt` stamped. The money **is captured** — the hold withholds recognition, not payment — and a finance decision (`PATCH /donations/:id/review`) then settles it to `completed` or returns it to the donor as `refunded`.
5. Only on `completed` does the money count toward `campaign.currentAmount` / `project.currentFunding` and appear in public donor lists.

So after a successful `POST` you show "processing", not "thank you, funds received". A gift sitting in `manual_review` should read as "payment received, being verified" — the donor has been charged.

Note the change from earlier revisions: high-value gifts are **no longer blocked before payment**. Every donor gets a checkout URL immediately; review happens after the charge lands.

**`paymentMethod: "zeffy"` behaves the same to the client but differs behind the scenes.** Zeffy's public API is read-only — it has no "create checkout" call — so `checkout.checkoutUrl` is the org's hosted Zeffy donation form (`ZEFFY_FORM_URL`), the same URL for every gift, and `transactionRef` is a local placeholder (`dow-zeffy-<donationId>`) that Zeffy has never seen. Consequences worth knowing on the client:

- Zeffy settles in **USD/CAD only**. A donation in any other currency (the platform default is ETB) is rejected with `400` at creation rather than sent to a form that cannot take it.
- Zeffy emits **only** `payment.completed`. A donor who abandons the Zeffy form produces no callback, so a `zeffy` donation can sit `pending` indefinitely — do not present `pending` as a failure, and expect finance to age these out.
- The donor must use the **same email** on the Zeffy form as on the donation, since that is part of how the callback is matched back (Zeffy carries no reference of ours). Prefill or restate it in the UI where possible.

#### `GET /donations/campaign/:campaignId`

Public donor list: only `completed` gifts; donors with `isAnonymous: true` are redacted.

#### `GET /donations` filters (finance)

`status`, `paymentMethod`, `campaignId`, `projectId` — all optional, plus pagination.

#### `PATCH /donations/:id/review`

```json
{ "approve": true, "note": "Verified with donor by phone" }   // note optional, ≤500
```

What a decision means depends on whether the money is already in hand (`paidAt`):

| Hold | `approve: true` | `approve: false` |
|---|---|---|
| **Captured** — the high-value path, donor already charged | → `completed`, credits campaign/project totals | → `refunded`, funds owed back to the donor |
| **Unpaid** — flagged before any charge landed | → `pending`, awaits gateway confirmation | → `failed`, nothing was ever charged |

Rejecting a captured gift reverses no totals: a held gift was never credited, so there is nothing to take back. Issuing the actual gateway refund is **not yet automated** — the status records the decision and the server logs that a refund is owed against the transaction.

#### `POST /payments/webhook/chapa` (reference only)

Chapa-to-backend; the frontend never calls this. Chapa signs the request body with the dashboard **webhook secret hash** (distinct from the API secret key) and sends the HMAC-SHA256 hex digest in `x-chapa-signature` (or `Chapa-Signature`). The handler verifies that HMAC over the **raw request bytes** in constant time, rejects a bad or missing signature with `401`, then re-verifies the transaction against Chapa's verify API — the API's status is authoritative, never the webhook body's. Idempotent on `transactionId`.

#### `POST /payments/webhook/zeffy/:token` (reference only)

Zeffy-to-backend; the frontend never calls this. **Zeffy publishes no webhook signing scheme** — its dashboard collects only a destination URL — so this route is authenticated in two layers instead:

1. **A shared secret in the URL.** We generate `ZEFFY_WEBHOOK_SECRET` and register `https://<APP_URL>/payments/webhook/zeffy/<secret>` in Zeffy. The `:token` segment is compared to the secret in constant time (both sides hashed first, so neither length nor a common prefix leaks). The bare `/payments/webhook/zeffy` path is also routed, for the day Zeffy ships a body signature — an `x-zeffy-signature` header, if present and no URL token was used, is verified as an HMAC-SHA256 hex digest over the raw bytes.
2. **Re-verification against the Zeffy API.** The payment named in the body is re-fetched via `GET /api/v1/payments/:id` with our organization key; that response is authoritative and the posted body is never trusted. A payment outside our organization 404s, which is what actually kills a forged callback.

Because Zeffy accepts no merchant reference at checkout, the callback cannot echo a key back. The verified payment is correlated to a **pending `zeffy` donation** on exact amount + currency + donor email + creation time. The match is deliberately conservative: no buyer email, or more than one look-alike candidate, means no match. Unmatched payments (a gift made straight on the Zeffy page, or a redelivery of one already settled) are acknowledged with `200` and settled nothing. Only `pending` donations are eligible, so redeliveries are inherently idempotent. On settlement the donation's `transactionId` becomes Zeffy's payment id, replacing the local placeholder. A payment that comes back fully refunded or disputed is reported as `failed`, not settled.

#### `POST /donations/webhook` (reference only)

Legacy backend-to-backend endpoint predating the Chapa integration. Normalized payload: `{ "transactionId": "…", "outcome": "succeeded" | "failed", "donationId": "…", "failureReason": "…" }`. Idempotent on `transactionId`. **Unauthenticated and unsigned** — superseded by `POST /payments/webhook/chapa`; slated for removal.

#### Donation response shape

```json
{
  "_id": "…",
  "campaignId": "665f…",          // null for general-fund
  "projectId": "665f…",           // denormalized from the campaign; absent for general-fund
  "donorId": "665f…",             // null for guests
  "donorSnapshot": { "name": "…", "email": "…" },
  "amount": 250000, "drops": 25, "currency": "ETB",
  "paymentMethod": "chapa", "transactionId": "dow-3f7c…",  // set when the checkout session opens
  "paidAt": null,                 // set when the gateway confirms capture
  "status": "pending", "requiresManualReview": false,
  "message": "…", "isAnonymous": false,
  "createdBy": "…", "updatedBy": null,
  "createdAt": "…", "updatedAt": "…"
}
```

---

### Impact Updates

Base path: `/impact-updates`

| Method & path | Access | Purpose |
|---|---|---|
| `GET /impact-updates` | Content managers | List, any status (filters) |
| `GET /impact-updates/pending` | Content managers | `submitted` queue, oldest first |
| `GET /impact-updates/project/:projectId` | Public | Project's `published` timeline |
| `GET /impact-updates/campaign/:campaignId` | Public | Campaign's `published` timeline |
| `GET /impact-updates/:id` | Public | One update |
| `POST /impact-updates` | Content contributors | Create (starts `draft`) |
| `PATCH /impact-updates/:id` | Content contributors² | Update fields / status |
| `POST /impact-updates/:id/submit` | Content contributors² | `draft` → `submitted` (no body) |
| `PATCH /impact-updates/:id/approve` | Content managers | `submitted` → `published` |
| `PATCH /impact-updates/:id/reject` | Content managers | `submitted` → `rejected` |
| `DELETE /impact-updates/:id` | Content contributors² | Soft-delete |

² Role gets you through the gate; the service additionally requires **author or manager**. Publishing via a raw status PATCH is manager-only.

#### `POST /impact-updates` — create

```json
{
  "projectId": "665f…",          // required
  "campaignId": "665f…",         // optional
  "title": "Drilling complete!", // required, ≤200
  "content": "… markdown …",     // required
  "attachments": [               // optional, ≤20 items
    { "type": "image", "url": "https://…" }   // type: image | video | pdf | report
  ]
}
```

#### `PATCH /impact-updates/:id` — update

Any subset of `campaignId`, `title`, `content`, `attachments` (**`projectId` is immutable**; `attachments` replaces the array) plus an optional `status` move following the [transition map](#7-lifecycle--status-reference).

#### Approve / reject

```json
// PATCH /impact-updates/:id/approve  — publishedAt optional (back-date/schedule); now if omitted
{ "publishedAt": "2026-07-15T09:00:00.000Z" }

// PATCH /impact-updates/:id/reject   — reason optional (≤1000), stored as rejectionReason
{ "reason": "Please add photos of the completed work." }
```

#### Impact-update response shape

```json
{
  "_id": "…", "projectId": "…", "campaignId": null, "authorId": "…",
  "title": "…", "content": "…",
  "attachments": [ { "type": "image", "url": "https://…" } ],
  "status": "published", "publishedAt": "…", "rejectionReason": null,
  "approvedBy": "…", "updatedBy": "…", "createdAt": "…", "updatedAt": "…"
}
```

Reference fields (`projectId`, `campaignId`, `authorId`, …) may arrive **populated** (as embedded objects) on some reads — handle both id-string and object forms.

---

### Certificates

Base path: `/certificates`

Recognition records for what a user has contributed — money raised through their campaigns (`fundraising`) or time volunteered on them (`volunteer_time`). A certificate is a **frozen snapshot**, not a live counter: the totals on it are what the user had achieved when it was issued. There is no admin tier here — users generate, read, and share their own.

| Method & path | Access | Purpose |
|---|---|---|
| `GET /certificates/me` | Auth | My certificates (`?type=`, `?includeSuperseded=`) |
| `POST /certificates/generate` | Auth | Compute + issue one of my certificates |
| `GET /certificates/:code` | Public (auth optional) | Open a certificate by its share code |
| `PATCH /certificates/:id/visibility` | Owner | Publish / unpublish my certificate |

#### `POST /certificates/generate`

```json
{
  "type": "fundraising",                     // required: fundraising | volunteer_time
  "campaignIds": ["665f…"],                  // optional — narrow to these campaigns (≤100)
  "from": "2026-01-01T00:00:00.000Z",        // optional ISO 8601 lower bound
  "to":   "2026-06-30T23:59:59.000Z"         // optional ISO 8601 upper bound
}
```

Returns **201** with the certificate. The recipient is always the caller — there is no `userId` field.

- **Eligibility**: you must clear at least the bronze tier (see the thresholds below), otherwise **400** with the shortfall in the message.
- **Idempotent**: if your current certificate of that type already froze exactly these numbers, that same certificate comes back and nothing new is created. Once the numbers move, a new `version` is issued and the old one is kept, marked `supersededAt` — links you already shared keep resolving to what you shared.
- New certificates are **private** (`isPublic: false`).

How each metric is computed, over the campaigns you created **or joined as a co-fundraiser**:

| Type | Metric |
|---|---|
| `fundraising` | Sum of `completed` donations to those campaigns (smallest unit). Measured per campaign — every co-fundraiser is credited with the campaign's full settled total, since donations record no referring fundraiser. `currency` is stated only when all the money came in one currency, otherwise `null` with a raw cross-currency sum. |
| `volunteer_time` | Days each campaign's `startDate`→`endDate` window overlaps your involvement (from `joinedAt` if you joined later), clamped to *now*, at **2 hours per active day**. Campaigns with no `startDate` are unmeasurable and count for nothing. |

#### `GET /certificates/:code`

Resolves a share code (e.g. `DOW-FR-9F2A7C41B0`). Readable by anyone once the owner sets `isPublic`; while private, only the owner can open it (send a Bearer token). To anyone else a private certificate returns **404**, so a code can't be probed for existence. Public reads omit the owner-only fields (`recipient.id`, `isPublic`).

#### `PATCH /certificates/:id/visibility`

```json
{ "isPublic": true }                         // required
```

Owner-only (**403** otherwise) — no internal role can flip someone else's certificate. This is the only mutable field; the metrics, title, and code never change.

#### Certificate response shape

```json
{
  "id": "665f…", "type": "fundraising",
  "title": "Gold Fundraising Certificate",
  "description": "Awarded to Abebe Bikila for raising 62,500.00 ETB across 3 campaigns on Drop of Water — Gold tier.",
  "badgeLevel": "gold",
  "recipient": { "id": "665f…", "name": "Abebe Bikila" },   // `id` on owner reads only
  "totalAmount": 6250000, "totalHours": 0, "currency": "ETB",
  "relatedCampaignIds": ["665f…"],
  "certificateCode": "DOW-FR-9F2A7C41B0",
  "isPublic": false,                                        // owner reads only
  "issuedAt": "2026-08-01T09:30:00.000Z",
  "version": 2, "supersededAt": null
}
```

`totalAmount` is meaningful on a `fundraising` certificate and `totalHours` on a `volunteer_time` one; the other is `0`. PDF rendering is not implemented yet — this payload is the structured data a template will render from, and `certificateCode` is what a printed certificate carries for verification.

---

### Admin

Base path: `/admin` — **every** route requires one of: `program_director`, `finance_admin`, `system_admin`. This is a convenience oversight surface; the review actions are the same operations as their module counterparts.

| Method & path | Purpose |
|---|---|
| `GET /admin/dashboard/summary` | Live aggregated platform stats |
| `GET /admin/review-queue` | Combined moderation backlog |
| `GET /admin/projects` | All projects (`?status=`) |
| `GET /admin/campaigns` | All campaigns (`?status=`, `?projectId=`) |
| `GET /admin/donations` | All donations (standard filters + `?highValue=`, `?minAmount=`) |
| `GET /admin/impact-updates/pending` | `submitted` impact updates, oldest first |
| `PATCH /admin/donations/:id/review` | Same as `PATCH /donations/:id/review` |
| `PATCH /admin/impact-updates/:id/approve` | Same as `PATCH /impact-updates/:id/approve` |

#### `GET /admin/dashboard/summary` response

```json
{
  "projects":      { "total": 12, "byStatus": { "draft": 2, "fundable": 5 }, "totalBudget": 0, "totalFunding": 0, "estimatedPeopleServed": 0, "beneficiaries": 0 },
  "campaigns":     { "total": 30, "byStatus": {}, "pendingApproval": 3, "active": 9, "totalGoalAmount": 0, "totalRaisedAmount": 0, "goalCompletionPercent": 41.2 },
  "donations":     { "total": 400, "byStatus": {}, "pendingManualReview": 2, "completedCount": 350, "totalRaised": 0, "totalDrops": 0, "averageDonation": 0, "totalRefunded": 0 },
  "impactUpdates": { "total": 25, "byStatus": {}, "pendingApproval": 4, "published": 18 },
  "users":         { "total": 900, "active": 850 },
  "generatedAt": "2026-07-20T12:00:00.000Z"
}
```

All money figures are raw sums in the smallest unit **across currencies** (no FX normalization).

#### `GET /admin/review-queue` response

Two independent paginated lists (the same `page`/`limit` applies to both):

```json
{
  "donations":     { "data": [ /* manual_review donations, oldest first */ ], "meta": { … } },
  "impactUpdates": { "data": [ /* submitted updates, oldest first */ ],      "meta": { … } }
}
```

#### `GET /admin/donations` extra filters

- `highValue=true` — only gifts that tripped the high-value threshold (`requiresManualReview`), at any lifecycle stage.
- `minAmount=100000` — only gifts at/above the amount (smallest unit, int ≥ 1).

---

### Notifications

Base path: `/notifications` — all routes require auth (any registered user).

| Method & path | Purpose |
|---|---|
| `GET /notifications/me` | Stored notification history (newest first, up to 50) |
| `POST /notifications/device-tokens` | Register an FCM device token — **204**, no body back |
| `DELETE /notifications/device-tokens` | De-register a token (e.g. on logout) — **204**; token goes in the request **body** |

Register/remove body (both routes):

```json
{ "token": "<FCM registration token from the Firebase SDK>" }   // required, ≤4096 chars
```

Both are idempotent. Registering a token is the prerequisite for receiving any push.

`GET /notifications/me` response:

```json
[
  { "id": "…", "title": "…", "body": "…", "data": { "campaignId": "…" }, "read": false, "createdAt": "2026-07-20T…" }
]
```

Returns `[]` when there are none (or Firebase is unconfigured server-side).

---

## 7. Lifecycle / status reference

Illegal transitions are rejected with 400. The primary happy-path moves also have dedicated endpoints (submit/approve/reject/refund) — prefer those over raw `status` PATCHes.

**Project** (`status`):
```
draft → assessment → fundable → funded → in_progress → completed
```
- Backwards: `assessment → draft`, `fundable → assessment`.
- `archived` (terminal) reachable from every non-terminal state. `completed` is terminal.

**Campaign** (`status`):
```
draft → pending_approval → active → completed
```
- `pending_approval → draft` (rejected), `active ⇄ paused`, `paused → completed`.
- `cancelled` (terminal) reachable from every non-terminal state. `completed` is terminal.

**Donation** (`status`):
```
pending → completed → refunded
pending → manual_review → completed | refunded     (high-value: charged, then reviewed)
pending → manual_review → pending   | failed       (held before any charge landed)
pending → failed
```
- Every donation is charged first; a high-value gift is held for review only **after** the gateway captures the money, so a donor is never made to wait on an admin to pay.
- `failed` and `refunded` are terminal. Totals change only on `→ completed` (add) and `completed → refunded` (reverse).
- `manual_review → refunded` reverses nothing — a held gift was never credited.
- `paidAt` distinguishes the two `manual_review` cases; see `PATCH /donations/:id/review`.

**Impact update** (`status`):
```
draft → submitted → published
                  → rejected → draft | submitted
published → draft   (unpublish for edits)
submitted → draft   (bounced back)
```
- No terminal states.

## 8. Data model quick reference

| Enum | Values |
|---|---|
| `Role` | `donor`, `campaign_creator`, `chapter_leader`, `content_contributor`, `content_manager`, `digital_coordinator`, `project_manager`, `site_engineer`, `program_director`, `finance_admin`, `system_admin` |
| `EntityType` | `individual`, `university`, `corporate`, `celebrity`, `diaspora`, `chapter` |
| `ProjectStatus` | `draft`, `assessment`, `fundable`, `funded`, `in_progress`, `completed`, `archived` |
| `CampaignStatus` | `draft`, `pending_approval`, `active`, `paused`, `completed`, `cancelled` |
| `DonationStatus` | `pending`, `manual_review`, `completed`, `failed`, `refunded` |
| `ImpactUpdateStatus` | `draft`, `submitted`, `published`, `rejected` |
| `SponsorshipType` | `matching`, `milestone`, `campus_sponsor`, `general` |
| `CertificateType` | `fundraising`, `volunteer_time` |
| `BadgeLevel` | `bronze`, `silver`, `gold`, `champion` |
| `PaymentMethod` | `chapa`, `zeffy`, `paypal`, `stripe`, `manual` |
| `AttachmentType` | `image`, `video`, `pdf`, `report` |

Other constants:

| Constant | Value |
|---|---|
| Default / max page size | 10 / 100 |
| High-value donation threshold (→ `manual_review` *after* capture) | `500000` smallest units (5,000 ETB) |
| Max batch sizes | milestones 20 · proofs 20 · cost items 50 · photos 50 |
| Max attachments per impact update | 20 |
| Certificate tiers — `fundraising` (whole currency units raised) | bronze 1,000 · silver 10,000 · gold 50,000 · champion 250,000 |
| Certificate tiers — `volunteer_time` (hours) | bronze 10 · silver 50 · gold 150 · champion 500 |
| Volunteer hours credited per active campaign day | 2 |
| Default currency | `ETB` (sponsorships default to `USD`) |
