// In-process mock engine.
// Defines the entire API surface as a single dispatch function that takes
// (method, url, body, auth) and returns a Response. We use this in two places:
//   1. The MSW handlers in ./handlers.ts (so the service worker still works
//      if someone wants to use it).
//   2. The API client in @/lib/api/client.ts in mock mode, bypassing the
//      network entirely (no service worker, no scope, no stale-state issues).

import { getDb } from "./db";
import { makeId } from "./ids";

type Query = Record<string, string | string[] | undefined>;

export function paginate<T>(items: T[], page: number, limit: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const data = items.slice(start, start + limit);
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

export function readPage(query: Query): { page: number; limit: number } {
  const page = Math.max(1, Number(query.page) || 1);
  const rawLimit = Number(query.limit) || 10;
  const limit = Math.min(100, Math.max(1, rawLimit));
  return { page, limit };
}

export function readToken(headers: Record<string, string>): string | null {
  const h = headers["authorization"] ?? headers["Authorization"];
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1] : null;
}

function filterDeleted<T>(items: T[]): T[] {
  return (items as Array<{ isDeleted?: boolean }>).filter(
    (x) => !x.isDeleted,
  ) as T[];
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function notFound(message = "Not Found"): Response {
  return json(404, { statusCode: 404, message, error: "Not Found" });
}

function unauthorized(message = "Unauthorized"): Response {
  return json(401, { statusCode: 401, message, error: "Unauthorized" });
}

function badRequest(message: string | string[]): Response {
  return json(400, { statusCode: 400, message, error: "Bad Request" });
}

type Ctx = {
  method: string;
  path: string; // e.g. "/projects" or "/projects/:id"
  params: Record<string, string>;
  query: Query;
  body: unknown;
  headers: Record<string, string>;
};

// Returns a Response or null when the route doesn't match.
export async function dispatchMock(ctx: Ctx): Promise<Response | null> {
  const { method, path, params, query, body, headers } = ctx;
  const m = method.toUpperCase();

  // Helper to match a single segment of the path.
  const segs = path.split("/").filter(Boolean);
  const seg = (i: number) => segs[i];

  // ---- Auth ----
  if (path === "/users/me" && m === "GET") {
    const token = readToken(headers);
    if (!token) return unauthorized("Missing Firebase token");
    void params;
    if (token === "mock-meron") {
      const meron = getDb().users.find((u) => u.id === "u-donor2");
      if (meron) return json(200, meron);
    }
    if (token.startsWith("mock-anon")) {
      const match = getDb().users.find((u) => u.firebaseUid === token);
      if (match) return json(200, match);
      return unauthorized("No DoW account for this Firebase user");
    }
    return unauthorized("No DoW account for this Firebase user");
  }

  if (path === "/users" && m === "POST") {
    const token = readToken(headers);
    if (!token) return unauthorized("Missing Firebase token");
    const b = (body ?? {}) as {
      name?: string;
      phoneNumber?: string;
      roles?: string[];
      entityType?: string;
      profile?: Record<string, unknown>;
    };
    if (!b.name) return badRequest("name is required");
    const user = {
      _id: makeId(),
      id: `u-${Date.now().toString(36)}`,
      firebaseUid: token,
      email: "demo@example.com",
      name: b.name,
      phoneNumber: b.phoneNumber,
      roles: b.roles && b.roles.length > 0 ? b.roles : ["donor"],
      entityType: b.entityType ?? null,
      isVerified: false,
      isActive: true,
      profile: b.profile,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    getDb().users.push(user as never);
    return json(201, user);
  }

  if (path === "/users/me" && m === "PATCH") {
    const token = readToken(headers);
    if (token !== "mock-meron") return unauthorized("Not signed in");
    const user = getDb().users.find((u) => u.id === "u-donor2");
    if (!user) return notFound("User not found");
    Object.assign(user, body ?? {}, { updatedAt: new Date().toISOString() });
    return json(200, user);
  }

  // ---- Projects ----
  if (path === "/projects" && m === "GET") {
    const status = typeof query.status === "string" ? query.status : undefined;
    const { page, limit } = readPage(query);
    let items = filterDeleted(getDb().projects);
    if (status) items = items.filter((p) => p.status === status);
    return json(200, paginate(items, page, limit));
  }

  if (path === "/projects/fundable" && m === "GET") {
    const { page, limit } = readPage(query);
    const items = filterDeleted(getDb().projects).filter(
      (p) => p.status === "fundable",
    );
    return json(200, paginate(items, page, limit));
  }

  if (segs[0] === "projects" && segs.length === 2 && m === "GET") {
    const id = seg(1);
    const project = getDb().projects.find(
      (p) =>
        p._id === id && !(p as { isDeleted?: boolean }).isDeleted,
    );
    if (!project) return notFound("Project not found");
    return json(200, project);
  }

  // ---- Campaigns ----
  if (path === "/campaigns" && m === "GET") {
    const status = typeof query.status === "string" ? query.status : undefined;
    const projectId =
      typeof query.projectId === "string" ? query.projectId : undefined;
    const includeSponsorships =
      query.includeSponsorships === "true" ||
      query.includeSponsorships === "1";
    const { page, limit } = readPage(query);
    let items = getDb().campaigns.filter((c) => c.status !== "draft");
    if (status) items = items.filter((c) => c.status === status);
    if (projectId) items = items.filter((c) => c.projectId === projectId);
    if (includeSponsorships) {
      items = items.map((c) => ({
        ...c,
        sponsorships: getDb().sponsorships.filter(
          (s) => s.campaignId === c._id && s.isActive && !s.isDeleted,
        ),
      })) as typeof items;
    }
    return json(200, paginate(items, page, limit));
  }

  if (path === "/campaigns/active" && m === "GET") {
    const includeSponsorships =
      query.includeSponsorships === "true" ||
      query.includeSponsorships === "1";
    const { page, limit } = readPage(query);
    let items = getDb().campaigns.filter((c) => c.status === "active");
    if (includeSponsorships) {
      items = items.map((c) => ({
        ...c,
        sponsorships: getDb().sponsorships.filter(
          (s) => s.campaignId === c._id && s.isActive && !s.isDeleted,
        ),
      })) as typeof items;
    }
    return json(200, paginate(items, page, limit));
  }

  if (
    segs[0] === "campaigns" &&
    segs[1] === "project" &&
    segs.length === 3 &&
    m === "GET"
  ) {
    const projectId = seg(2);
    const items = getDb().campaigns.filter(
      (c) => c.projectId === projectId && c.status !== "draft",
    );
    const { page, limit } = readPage(query);
    return json(200, paginate(items, page, limit));
  }

  if (
    segs[0] === "campaigns" &&
    segs[1] === "active" &&
    segs.length === 2 &&
    m === "GET"
  ) {
    // already handled above
    return null;
  }

  if (
    segs[0] === "campaigns" &&
    segs.length === 2 &&
    m === "GET"
  ) {
    const id = seg(1);
    const includeSponsorships =
      query.includeSponsorships === "true" ||
      query.includeSponsorships === "1";
    const c = getDb().campaigns.find((x) => x._id === id);
    if (!c) return notFound("Campaign not found");
    if (includeSponsorships) {
      return json(200, {
        ...c,
        sponsorships: getDb().sponsorships.filter(
          (s) => s.campaignId === c._id && s.isActive && !s.isDeleted,
        ),
      });
    }
    return json(200, c);
  }

  if (
    segs[0] === "campaigns" &&
    segs[1] &&
    segs[2] === "sponsorships" &&
    segs.length === 3 &&
    m === "GET"
  ) {
    const campaignId = seg(1);
    const items = getDb().sponsorships.filter(
      (s) => s.campaignId === campaignId && s.isActive && !s.isDeleted,
    );
    const { page, limit } = readPage(query);
    return json(200, paginate(items, page, limit));
  }

  // ---- Donations ----
  if (path === "/donations" && m === "POST") {
    const b = (body ?? {}) as {
      campaignId?: string;
      amount?: number;
      paymentMethod?: string;
      message?: string;
      isAnonymous?: boolean;
      donor?: { name?: string; email?: string };
    };
    if (!b.amount || b.amount < 1) return badRequest("amount must be at least 1");
    if (!b.paymentMethod) return badRequest("paymentMethod is required");
    const txId = `dow-mock-${Date.now().toString(36)}`;
    const isManualReview = b.amount >= 500_000;
    const donation = {
      _id: `mock-${Date.now()}`,
      campaignId: b.campaignId ?? null,
      donorId: null,
      donorSnapshot: {
        name: b.donor?.name ?? "Guest Giver",
        email: b.donor?.email,
      },
      amount: b.amount,
      currency: "ETB",
      paymentMethod: b.paymentMethod,
      transactionId: txId,
      paidAt: null,
      status: "pending" as const,
      requiresManualReview: isManualReview,
      message: b.message,
      isAnonymous: b.isAnonymous ?? false,
      createdBy: "guest",
      updatedBy: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    getDb().donations.push(donation as never);

    if (b.paymentMethod !== "manual") {
      setTimeout(() => {
        const target = getDb().donations.find((d) => d.transactionId === txId);
        if (!target) return;
        if (target.status !== "pending") return;
        target.paidAt = new Date().toISOString();
        target.status = isManualReview ? "manual_review" : "completed";
        target.updatedAt = new Date().toISOString();
        if (isManualReview) return;
        const campaign = getDb().campaigns.find(
          (c) => c._id === target.campaignId,
        );
        if (campaign) {
          campaign.currentAmount = (campaign.currentAmount ?? 0) + target.amount;
          campaign.updatedAt = new Date().toISOString();
        }
        if (target.campaignId) {
          const projectId = campaign?.projectId;
          const project = getDb().projects.find((p) => p._id === projectId);
          if (project) {
            project.currentFunding = (project.currentFunding ?? 0) + target.amount;
            project.updatedAt = new Date().toISOString();
          }
        }
      }, 3_000);
    }

    return json(
      201,
      {
        donation,
        checkout: {
          checkoutUrl: `/campaigns/${b.campaignId}/donate/return?tx_ref=${txId}&status=success&amount=${b.amount}&gateway=${b.paymentMethod}`,
          transactionRef: txId,
          gateway: b.paymentMethod,
        },
      },
    );
  }

  if (
    segs[0] === "donations" &&
    segs[1] === "campaign" &&
    segs.length === 3 &&
    m === "GET"
  ) {
    const campaignId = seg(2);
    const items = getDb()
      .donations.filter(
        (d) =>
          d.campaignId === campaignId &&
          d.status === "completed" &&
          !d.isAnonymous,
      )
      .map((d) => ({
        ...d,
        donorSnapshot: d.isAnonymous ? { name: "Anonymous" } : d.donorSnapshot,
      }));
    const { page, limit } = readPage(query);
    return json(200, paginate(items, page, limit));
  }

  // ---- Impact updates ----
  if (
    segs[0] === "impact-updates" &&
    segs[1] === "project" &&
    segs.length === 3 &&
    m === "GET"
  ) {
    const projectId = seg(2);
    const items = getDb().impactUpdates.filter(
      (i) => i.projectId === projectId && i.status === "published",
    );
    const { page, limit } = readPage(query);
    return json(200, paginate(items, page, limit));
  }

  if (
    segs[0] === "impact-updates" &&
    segs[1] === "campaign" &&
    segs.length === 3 &&
    m === "GET"
  ) {
    const campaignId = seg(2);
    const items = getDb().impactUpdates.filter(
      (i) => i.campaignId === campaignId && i.status === "published",
    );
    const { page, limit } = readPage(query);
    return json(200, paginate(items, page, limit));
  }

  // ---- Certificates ----
  if (segs[0] === "certificates" && segs.length === 2 && m === "GET") {
    const code = seg(1);
    const cert = getDb().certificates.find(
      (c) => c.certificateCode === code,
    );
    if (!cert) return notFound("Certificate not found");
    if (cert.isPublic) {
      const { recipient, ...rest } = cert;
      return json(200, { ...rest, recipient: { name: recipient.name } });
    }
    const token = readToken(headers);
    if (!token) return notFound("Certificate not found");
    return json(200, cert);
  }

  // ---- Notifications ----
  if (
    segs[0] === "notifications" &&
    segs[1] === "device-tokens" &&
    segs.length === 2 &&
    m === "POST"
  ) {
    const b = (body ?? {}) as { token?: string };
    if (!b.token) return badRequest("token is required");
    const token = readToken(headers);
    getDb().deviceTokens.push({
      token: b.token,
      userId: token === "mock-meron" ? "u-donor2" : "guest",
      createdAt: new Date().toISOString(),
    });
    return new Response(null, { status: 204 });
  }

  if (
    segs[0] === "notifications" &&
    segs[1] === "device-tokens" &&
    segs.length === 2 &&
    m === "DELETE"
  ) {
    const b = (body ?? {}) as { token?: string };
    if (!b.token) return badRequest("token is required");
    getDb().deviceTokens = getDb().deviceTokens.filter(
      (t) => t.token !== b.token,
    );
    return new Response(null, { status: 204 });
  }

  return null;
}

// Match a URL path against a pattern. Supports `:id` segments.
export function matchPath(
  pattern: string,
  path: string,
): Record<string, string> | null {
  const ps = pattern.split("/").filter(Boolean);
  const xs = path.split("/").filter(Boolean);
  if (ps.length !== xs.length) return null;
  const out: Record<string, string> = {};
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i];
    const x = xs[i];
    if (p.startsWith(":")) {
      out[p.slice(1)] = decodeURIComponent(x);
    } else if (p !== x) {
      return null;
    }
  }
  return out;
}
