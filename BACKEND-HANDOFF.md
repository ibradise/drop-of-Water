# Backend Handoff — Issues Found During Frontend Probe

These are backend-side issues discovered while probing the live API and auditing user flows. Each includes the endpoint, observed behavior, and why it matters. Frontend workarounds are noted where they exist, but these need backend fixes.

---

## 1. Draft and pending-approval campaigns leak publicly

**Endpoint:** `GET /campaigns` (no `?status=` filter)

**Observed:** Returns `draft` and `pending_approval` campaigns with no authentication. In production, 9 of 15 items on the first page were non-public (including titles, summaries, and goals).

**Why it matters:** Anyone can see campaigns that haven't been approved yet. The frontend hides them client-side, but the data is exposed to anyone who calls the API directly.

**Fix:** Filter out `draft` and `pending_approval` by default, or require auth for non-active campaigns.

---

## 2. Manual (offline) gifts can never settle

**Endpoint:** `PATCH /donations/:id/review`

**Observed:** Returns `400` with `"Donation … is not awaiting review (status: 'pending')"` when reviewing a `manual` payment. Only gifts parked in `manual_review` (via gateway webhook) are reviewable.

**Why it matters:** A manual gift can never become `completed` via the API, so it never counts toward campaign totals, project funding, or certificate metrics. Finance has no path to settle offline donations.

**Fix:** Allow `pending` manual gifts to be reviewed, or provide a separate settlement path for offline donations.

---

## 3. `totalBudget` aggregation returns absurd values

**Endpoint:** `GET /admin/dashboard/summary`

**Observed:** `projects.totalBudget` returns `7.698769876982345e+39` — far beyond JS safe integer range.

**Why it matters:** The frontend had to add a lenient aggregate parser to avoid crashing. The underlying aggregation or a project budget value is wrong.

**Fix:** Check the `totalBudget` computation and the underlying project budget values.

---

## 4. Registration accepts privileged roles

**Endpoint:** `POST /users`

**Observed:** Sending `roles: ["system_admin"]` in the registration body creates a system admin account. The frontend never sends this, but the API accepts it.

**Why it matters:** Anyone can self-assign admin privileges by crafting a registration request.

**Fix:** Ignore the `roles` field on registration (always default to `["donor"]`), or restrict it to a bootstrap/admin-only path.

---

## 5. No return-URL handshake for online donations

**Endpoint:** `POST /donations`

**Observed:** The create-donation DTO has no `returnUrl` or `callbackUrl` field. After a donor pays on Chapa/Zeffy, they are not routed back to the app's return page.

**Why it matters:** The donor pays on the gateway's hosted page and is stranded there. The app's return page (`/campaigns/:id/donate/return`) is only reachable for `manual` payments.

**Fix:** Add a `returnUrl` field to the donation DTO and configure it in the gateway dashboard (`https://<APP_URL>/campaigns/<id>/donate/return?tx_ref=…`). For Zeffy, note that it accepts no merchant reference — the backend matches by amount + currency + email + time.

---

## 6. Legacy webhook is unauthenticated

**Endpoint:** `POST /donations/webhook`

**Observed:** Accepts normalized settlement payloads with no signature or secret verification.

**Why it matters:** Anyone can forge a settlement callback. The API guide marks it as "slated for removal."

**Fix:** Remove this endpoint now that Chapa and Zeffy webhooks are in place.

---

## 7. Sub-resource POSTs only accept `{items: [...]}`

**Endpoints:** `POST /projects/:id/milestones`, `POST /projects/:id/cost-items`, `POST /projects/:id/photos`, `POST /projects/:id/proofs`

**Observed:** Single-object and raw-array body shapes return `400` (`"property title should not exist"`, `"items must be an array"`). Only the wrapped `{items: [...]}` shape works, contradicting the API guide's "three equivalent shapes."

**Why it matters:** The frontend had to normalize all sub-resource POSTs to the wrapped shape. The docs are misleading.

**Fix:** Either support all three shapes as documented, or update the docs to specify only `{items: [...]}`.

---

## 8. `/donations/me` rejects `?status=` filter

**Endpoint:** `GET /donations/me?status=completed`

**Observed:** Returns `400` with `"property status should not exist"`.

**Why it matters:** The frontend filters client-side as a workaround, but the filter doesn't exist server-side.

**Fix:** Either support the `status` filter or remove it from the frontend's expectations.

---

## 9. Zeffy + non-USD/CAD currency returns 400 at creation

**Endpoint:** `POST /donations` with `paymentMethod: "zeffy"` and `currency: "ETB"`

**Observed:** Returns `400` with `"Zeffy cannot process ETB donations — please choose another payment method"`.

**Why it matters:** The frontend now gates Zeffy to USD/CAD campaigns, but the error message is clear enough to surface directly.

**Fix:** No backend change needed — this is correct behavior. The frontend handles it.

---

## Summary for backend dev

| # | Issue | Severity | Frontend workaround |
|---|---|---|---|
| 1 | Draft/pending campaigns leak publicly | **High** | Client-side hiding |
| 2 | Manual gifts can never settle | **High** | None — needs backend path |
| 3 | `totalBudget` absurd value | Medium | Lenient aggregate parser |
| 4 | Registration accepts privileged roles | **High** | None — needs backend fix |
| 5 | No return-URL handshake | Medium | None — needs DTO + gateway config |
| 6 | Legacy webhook unauthenticated | Medium | None — remove endpoint |
| 7 | Sub-resource POSTs only accept `{items}` | Low | Frontend normalizes |
| 8 | `//donations/me rejects `?status=` | Low | Client-side filter |
| 9 | Zeffy + non-USD/CAD 400 | Info | Frontend gates Zeffy |
