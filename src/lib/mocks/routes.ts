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

  // POST /projects/:id/milestones
  if (
    segs[0] === "projects" &&
    segs[1] &&
    segs[2] === "milestones" &&
    m === "POST"
  ) {
    const id = seg(1);
    const project = getDb().projects.find(
      (p) => p._id === id && !(p as { isDeleted?: boolean }).isDeleted,
    );
    if (!project) return notFound("Project not found");
    const payload = (body ?? {}) as
      | { title?: string; description?: string }
      | Array<{ title?: string; description?: string }>
      | { items: Array<{ title?: string; description?: string }> };
    const items = Array.isArray(payload) ? payload : "items" in payload ? payload.items : [payload];
    for (const it of items) {
      if (!it.title) return badRequest("title is required for each milestone");
      project.milestones.push({
        _id: makeId(),
        title: it.title,
        description: it.description,
        status: "pending",
        completedAt: null,
        verifiedBy: null,
      });
    }
    project.updatedAt = new Date().toISOString();
    return json(200, project);
  }

  // DELETE /projects/:id/milestones/:milestoneId
  if (
    segs[0] === "projects" &&
    segs[1] &&
    segs[2] === "milestones" &&
    segs[3] &&
    m === "DELETE"
  ) {
    const id = seg(1);
    const milestoneId = seg(3);
    const project = getDb().projects.find(
      (p) => p._id === id && !(p as { isDeleted?: boolean }).isDeleted,
    );
    if (!project) return notFound("Project not found");
    project.milestones = project.milestones.filter(
      (m) => m._id !== milestoneId,
    ) as typeof project.milestones;
    project.updatedAt = new Date().toISOString();
    return json(200, project);
  }

  // POST /projects/:id/cost-items
  if (
    segs[0] === "projects" &&
    segs[1] &&
    segs[2] === "cost-items" &&
    m === "POST"
  ) {
    const id = seg(1);
    const project = getDb().projects.find(
      (p) => p._id === id && !(p as { isDeleted?: boolean }).isDeleted,
    );
    if (!project) return notFound("Project not found");
    const payload = (body ?? {}) as
      | { item?: string; amount?: number }
      | Array<{ item?: string; amount?: number }>
      | { items: Array<{ item?: string; amount?: number }> };
    const items = Array.isArray(payload) ? payload : "items" in payload ? payload.items : [payload];
    for (const it of items) {
      if (!it.item) return badRequest("item is required for each cost item");
      if (typeof it.amount !== "number" || it.amount < 0)
        return badRequest("amount must be a non-negative integer (smallest unit)");
      project.costBreakdown.push({
        _id: makeId(),
        item: it.item,
        amount: it.amount,
      });
    }
    project.updatedAt = new Date().toISOString();
    return json(200, project);
  }

  // POST /projects/:id/photos
  if (
    segs[0] === "projects" &&
    segs[1] &&
    segs[2] === "photos" &&
    m === "POST"
  ) {
    const id = seg(1);
    const project = getDb().projects.find(
      (p) => p._id === id && !(p as { isDeleted?: boolean }).isDeleted,
    );
    if (!project) return notFound("Project not found");
    const payload = body as string[] | { items?: string[] } | undefined;
    let urls: string[] = [];
    if (Array.isArray(payload)) {
      urls = payload.filter((u): u is string => typeof u === "string");
    } else if (payload && Array.isArray((payload as { items?: string[] }).items)) {
      urls = (payload as { items: string[] }).items;
    } else if (typeof payload === "string") {
      urls = [payload];
    }
    for (const url of urls) {
      project.photos.push(url);
    }
    project.updatedAt = new Date().toISOString();
    return json(200, project);
  }

  // POST /projects/:id/proofs
  if (
    segs[0] === "projects" &&
    segs[1] &&
    segs[2] === "proofs" &&
    m === "POST"
  ) {
    const id = seg(1);
    const project = getDb().projects.find(
      (p) => p._id === id && !(p as { isDeleted?: boolean }).isDeleted,
    );
    if (!project) return notFound("Project not found");
    const payload = (body ?? {}) as
      | { type?: string; url?: string }
      | Array<{ type?: string; url?: string }>
      | { items: Array<{ type?: string; url?: string }> };
    const items = Array.isArray(payload) ? payload : "items" in payload ? payload.items : [payload];
    for (const it of items) {
      if (!it.type) return badRequest("type is required for each proof");
      if (!it.url) return badRequest("url is required for each proof");
      project.proofOfImpact.push({
        _id: makeId(),
        type: it.type,
        url: it.url,
        uploadedBy: readToken(headers) ?? "admin",
        date: new Date().toISOString(),
      });
    }
    project.updatedAt = new Date().toISOString();
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

  // POST /campaigns — create
  if (path === "/campaigns" && m === "POST") {
    const b = (body ?? {}) as {
      projectId?: string;
      title?: string;
      summary?: string;
      story?: string;
      goalAmount?: number;
      currency?: string;
      dropsGoal?: number;
      startDate?: string;
      endDate?: string;
      joinable?: boolean;
      photos?: string[];
    };
    if (!b.projectId) return badRequest("projectId is required");
    if (!b.title) return badRequest("title is required");
    if (typeof b.goalAmount !== "number" || b.goalAmount < 0)
      return badRequest("goalAmount must be a non-negative integer (smallest unit)");
    const project = getDb().projects.find((p) => p._id === b.projectId);
    if (!project) return badRequest("projectId references a missing project");
    if (project.status !== "fundable")
      return badRequest("Project is not in 'fundable' status");

    const token = readToken(headers);
    const userId = token === "mock-meron" ? "u-donor2" : "u-anon";

    const campaign = {
      _id: makeId(),
      projectId: b.projectId,
      title: b.title,
      summary: b.summary,
      story: b.story,
      goalAmount: b.goalAmount,
      currentAmount: 0,
      currency: b.currency ?? "ETB",
      dropsGoal: b.dropsGoal,
      startDate: b.startDate,
      endDate: b.endDate,
      status: "draft" as const,
      joinable: b.joinable ?? false,
      participants: [
        { _id: makeId(), userId, role: "creator", joinedAt: new Date().toISOString() },
      ],
      photos: b.photos ?? [],
      createdBy: userId,
      approvedBy: undefined,
      updatedBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    getDb().campaigns.push(campaign as never);
    return json(201, campaign);
  }

  // POST /campaigns/:id/submit
  if (segs[0] === "campaigns" && segs[1] && segs[2] === "submit" && m === "POST") {
    const id = seg(1);
    const c = getDb().campaigns.find((x) => x._id === id);
    if (!c) return notFound("Campaign not found");
    if (c.status !== "draft")
      return badRequest(`Cannot submit from status '${c.status}'`);
    c.status = "pending_approval";
    c.updatedAt = new Date().toISOString();
    return json(200, c);
  }

  // POST /campaigns/:id/approve
  if (
    segs[0] === "campaigns" &&
    segs[1] &&
    segs[2] === "approve" &&
    m === "POST"
  ) {
    const id = seg(1);
    const b = (body ?? {}) as { contentManagerId?: string };
    const c = getDb().campaigns.find((x) => x._id === id);
    if (!c) return notFound("Campaign not found");
    if (c.status !== "pending_approval")
      return badRequest(`Cannot approve from status '${c.status}'`);
    const token = readToken(headers);
    if (token !== "mock-meron") return unauthorized("Manager role required");
    c.status = "active";
    c.approvedBy = b.contentManagerId ?? "u-manager";
    c.contentManagerId = b.contentManagerId ?? "u-manager";
    c.updatedAt = new Date().toISOString();
    return json(200, c);
  }

  // POST /campaigns/:id/reject
  if (segs[0] === "campaigns" && segs[1] && segs[2] === "reject" && m === "POST") {
    const id = seg(1);
    const c = getDb().campaigns.find((x) => x._id === id);
    if (!c) return notFound("Campaign not found");
    if (c.status !== "pending_approval")
      return badRequest(`Cannot reject from status '${c.status}'`);
    c.status = "draft";
    c.updatedAt = new Date().toISOString();
    return json(200, c);
  }

  // POST /campaigns/:id/join
  if (segs[0] === "campaigns" && segs[1] && segs[2] === "join" && m === "POST") {
    const id = seg(1);
    const role = typeof query.role === "string" ? query.role : "fundraiser";
    const c = getDb().campaigns.find((x) => x._id === id);
    if (!c) return notFound("Campaign not found");
    if (c.status !== "active" || !c.joinable)
      return badRequest("Campaign is not joinable");
    const token = readToken(headers);
    const userId = token === "mock-meron" ? "u-donor2" : "u-anon";
    if (c.createdBy === userId) return badRequest("You already own this campaign");
    if (c.participants.some((p) => p.userId === userId))
      return badRequest("You already joined this campaign");
    c.participants.push({
      _id: makeId(),
      userId,
      role,
      joinedAt: new Date().toISOString(),
    });
    c.updatedAt = new Date().toISOString();
    return json(200, c);
  }

  // PATCH /campaigns/:id — edit
  if (segs[0] === "campaigns" && segs.length === 2 && m === "PATCH") {
    const id = seg(1);
    const c = getDb().campaigns.find((x) => x._id === id);
    if (!c) return notFound("Campaign not found");
    const token = readToken(headers);
    const userId = token === "mock-meron" ? "u-donor2" : "u-anon";
    if (c.createdBy !== userId) return unauthorized("Not the campaign owner");
    const b = (body ?? {}) as Record<string, unknown>;
    if ("projectId" in b) return badRequest("projectId is immutable");
    Object.assign(c, b, { updatedBy: userId, updatedAt: new Date().toISOString() });
    return json(200, c);
  }

  // DELETE /campaigns/:id — soft delete
  if (segs[0] === "campaigns" && segs.length === 2 && m === "DELETE") {
    const id = seg(1);
    const c = getDb().campaigns.find((x) => x._id === id);
    if (!c) return notFound("Campaign not found");
    const token = readToken(headers);
    const userId = token === "mock-meron" ? "u-donor2" : "u-anon";
    if (c.createdBy !== userId) return unauthorized("Not the campaign owner");
    (c as { isDeleted?: boolean }).isDeleted = true;
    c.updatedAt = new Date().toISOString();
    return json(200, c);
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
  // /certificates/:code (must come AFTER /certificates/me so that "me" isn't
  // treated as a share code).
  if (segs[0] === "certificates" && segs[1] === "me" && m === "GET") {
    const token = readToken(headers);
    const userId = token === "mock-meron" ? "u-donor2" : null;
    const type = typeof query.type === "string" ? query.type : undefined;
    const includeSuperseded =
      query.includeSuperseded === "true" || query.includeSuperseded === "1";
    let items = getDb().certificates.filter((c) => c.recipient.id === userId);
    if (type) items = items.filter((c) => c.type === type);
    if (!includeSuperseded) items = items.filter((c) => !c.supersededAt);
    const { page, limit } = readPage(query);
    return json(200, paginate(items, page, limit));
  }

  if (segs[0] === "certificates" && segs[1] === "generate" && m === "POST") {
    const b = (body ?? {}) as {
      type?: "fundraising" | "volunteer_time";
      campaignIds?: string[];
      from?: string;
      to?: string;
    };
    if (!b.type) return badRequest("type is required");
    const token = readToken(headers);
    const userId = token === "mock-meron" ? "u-donor2" : "u-anon";
    const userName = token === "mock-meron" ? "Meron Tadesse" : "Demo User";

    const db = getDb();
    const userDonations = db.donations.filter(
      (d) =>
        d.donorId === userId &&
        d.status === "completed" &&
        (b.campaignIds ? b.campaignIds.includes(d.campaignId ?? "") : true),
    );
    const totalAmount = userDonations.reduce((sum, d) => sum + d.amount, 0);
    const totalHours = 0;

    const totalUnits = b.type === "fundraising" ? totalAmount / 100 : totalHours;
    let badgeLevel: "bronze" | "silver" | "gold" | "champion" = "bronze";
    if (totalUnits >= 250_000) badgeLevel = "champion";
    else if (totalUnits >= 50_000) badgeLevel = "gold";
    else if (totalUnits >= 10_000) badgeLevel = "silver";
    else if (totalUnits < 1_000 && b.type === "fundraising") {
      return json(400, {
        statusCode: 400,
        message: "Below the bronze tier (1,000 ETB).",
        error: "Bad Request",
      });
    }

    const code = `DOW-${b.type === "fundraising" ? "FR" : "VT"}-${makeId().toUpperCase().slice(0, 8)}`;
    const cert = {
      id: makeId(),
      type: b.type,
      title:
        badgeLevel.charAt(0).toUpperCase() +
        badgeLevel.slice(1) +
        " " +
        (b.type === "fundraising" ? "Fundraising" : "Volunteer Time") +
        " Certificate",
      description: `Awarded to ${userName} for ${b.type === "fundraising" ? `raising ${(totalAmount / 100).toFixed(2)} ETB` : `${totalHours} hours of volunteer time`} on Drop of Water — ${badgeLevel.charAt(0).toUpperCase() + badgeLevel.slice(1)} tier.`,
      badgeLevel,
      recipient: { id: userId, name: userName },
      totalAmount: b.type === "fundraising" ? totalAmount : 0,
      totalHours: b.type === "volunteer_time" ? totalHours : 0,
      currency: b.type === "fundraising" ? "ETB" : null,
      relatedCampaignIds: b.campaignIds ?? [],
      certificateCode: code,
      isPublic: false,
      issuedAt: new Date().toISOString(),
      version: 1,
      supersededAt: null,
    };
    db.certificates.push(cert as never);
    return json(201, cert);
  }

  if (
    segs[0] === "certificates" &&
    segs[1] &&
    segs[1] !== "me" &&
    segs[1] !== "generate" &&
    segs[2] === "visibility" &&
    segs.length === 3 &&
    m === "PATCH"
  ) {
    const id = seg(1);
    const b = (body ?? {}) as { isPublic?: boolean };
    if (typeof b.isPublic !== "boolean") return badRequest("isPublic is required");
    const cert = getDb().certificates.find((c) => c.id === id);
    if (!cert) return notFound("Certificate not found");
    cert.isPublic = b.isPublic;
    return json(200, cert);
  }

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

  // ---- Donations: /donations/me ----
  if (segs[0] === "donations" && segs[1] === "me" && m === "GET") {
    const token = readToken(headers);
    const userId = token === "mock-meron" ? "u-donor2" : null;
    const statusFilter = typeof query.status === "string" ? query.status : undefined;
    let items = getDb().donations.filter((d) => d.donorId === userId);
    if (statusFilter) items = items.filter((d) => d.status === statusFilter);
    const { page, limit } = readPage(query);
    return json(200, paginate(items, page, limit));
  }

  // ---- Notifications: /notifications/me ----
  if (segs[0] === "notifications" && segs[1] === "me" && m === "GET") {
    return json(200, getDb().notifications);
  }

  // ---- Admin ----
  if (!readToken(headers)) return unauthorized("Missing Firebase token");

  // GET /admin/dashboard/summary
  if (segs[0] === "admin" && segs[1] === "dashboard" && segs[2] === "summary" && m === "GET") {
    const db = getDb();
    const byStatus = <T,>(items: T[], key: (t: T) => string): Record<string, number> => {
      const out: Record<string, number> = {};
      for (const it of items) {
        const k = key(it);
        out[k] = (out[k] ?? 0) + 1;
      }
      return out;
    };
    const projects = db.projects.filter((p) => !(p as { isDeleted?: boolean }).isDeleted);
    const campaigns = db.campaigns;
    const donations = db.donations;
    const impactUpdates = db.impactUpdates;
    const users = db.users;

    const totalGoalAmount = campaigns.reduce((sum, c) => sum + c.goalAmount, 0);
    const totalRaisedAmount = campaigns.reduce((sum, c) => sum + c.currentAmount, 0);
    const totalRaisedDonations = donations
      .filter((d) => d.status === "completed")
      .reduce((sum, d) => sum + d.amount, 0);
    const totalDrops = donations
      .filter((d) => d.status === "completed")
      .reduce((sum, d) => sum + (d.drops ?? 0), 0);
    const totalRefunded = donations
      .filter((d) => d.status === "refunded")
      .reduce((sum, d) => sum + d.amount, 0);
    const completedCount = donations.filter((d) => d.status === "completed").length;
    const avgDonation = completedCount > 0 ? Math.round(totalRaisedDonations / completedCount) : 0;
    const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
    const totalFunding = projects.reduce((sum, p) => sum + p.currentFunding, 0);
    const estimatedPeople = projects.reduce((sum, p) => sum + (p.estimatedPeopleServed ?? 0), 0);
    const beneficiaries = projects.reduce((sum, p) => sum + (p.beneficiaryCount ?? 0), 0);

    return json(200, {
      projects: {
        total: projects.length,
        byStatus: byStatus(projects, (p) => p.status),
        totalBudget,
        totalFunding,
        estimatedPeopleServed: estimatedPeople,
        beneficiaries,
      },
      campaigns: {
        total: campaigns.length,
        byStatus: byStatus(campaigns, (c) => c.status),
        pendingApproval: campaigns.filter((c) => c.status === "pending_approval").length,
        active: campaigns.filter((c) => c.status === "active").length,
        totalGoalAmount,
        totalRaisedAmount,
        goalCompletionPercent:
          totalGoalAmount > 0 ? Math.round((totalRaisedAmount / totalGoalAmount) * 1000) / 10 : 0,
      },
      donations: {
        total: donations.length,
        byStatus: byStatus(donations, (d) => d.status),
        pendingManualReview: donations.filter((d) => d.status === "manual_review").length,
        completedCount,
        totalRaised: totalRaisedDonations,
        totalDrops,
        averageDonation: avgDonation,
        totalRefunded,
      },
      impactUpdates: {
        total: impactUpdates.length,
        byStatus: byStatus(impactUpdates, (u) => u.status),
        pendingApproval: impactUpdates.filter((u) => u.status === "submitted").length,
        published: impactUpdates.filter((u) => u.status === "published").length,
      },
      users: {
        total: users.length,
        active: users.filter((u) => u.isActive).length,
      },
      generatedAt: new Date().toISOString(),
    });
  }

  // GET /admin/review-queue
  if (segs[0] === "admin" && segs[1] === "review-queue" && m === "GET") {
    const db = getDb();
    const { page, limit } = readPage(query);
    const donations = db.donations
      .filter((d) => d.status === "manual_review")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const updates = db.impactUpdates
      .filter((u) => u.status === "submitted")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return json(200, {
      donations: paginate(donations, page, limit),
      impactUpdates: paginate(updates, page, limit),
    });
  }

  // GET /admin/projects, /admin/campaigns, /admin/donations, /admin/impact-updates/pending
  if (segs[0] === "admin" && segs[1] === "donations" && segs.length === 2 && m === "GET") {
    const db = getDb();
    let items = db.donations.slice();
    const status = typeof query.status === "string" ? query.status : undefined;
    const paymentMethod =
      typeof query.paymentMethod === "string" ? query.paymentMethod : undefined;
    const campaignId = typeof query.campaignId === "string" ? query.campaignId : undefined;
    const projectId = typeof query.projectId === "string" ? query.projectId : undefined;
    const highValue = query.highValue === "true" || query.highValue === "1";
    const minAmount = query.minAmount ? Number(query.minAmount) : undefined;
    if (status) items = items.filter((d) => d.status === status);
    if (paymentMethod) items = items.filter((d) => d.paymentMethod === paymentMethod);
    if (campaignId) items = items.filter((d) => d.campaignId === campaignId);
    if (projectId) items = items.filter((d) => d.projectId === projectId);
    if (highValue) items = items.filter((d) => d.requiresManualReview);
    if (typeof minAmount === "number" && !Number.isNaN(minAmount)) {
      items = items.filter((d) => d.amount >= minAmount);
    }
    const { page, limit } = readPage(query);
    return json(200, paginate(items, page, limit));
  }

  if (segs[0] === "admin" && segs[1] === "projects" && segs.length === 2 && m === "GET") {
    const status = typeof query.status === "string" ? query.status : undefined;
    let items = getDb().projects.filter((p) => !(p as { isDeleted?: boolean }).isDeleted);
    if (status) items = items.filter((p) => p.status === status);
    const { page, limit } = readPage(query);
    return json(200, paginate(items, page, limit));
  }

  if (segs[0] === "admin" && segs[1] === "campaigns" && segs.length === 2 && m === "GET") {
    const status = typeof query.status === "string" ? query.status : undefined;
    const projectId = typeof query.projectId === "string" ? query.projectId : undefined;
    let items = getDb().campaigns.slice();
    if (status) items = items.filter((c) => c.status === status);
    if (projectId) items = items.filter((c) => c.projectId === projectId);
    const { page, limit } = readPage(query);
    return json(200, paginate(items, page, limit));
  }

  if (
    segs[0] === "admin" &&
    segs[1] === "impact-updates" &&
    segs[2] === "pending" &&
    m === "GET"
  ) {
    let items = getDb().impactUpdates.filter((u) => u.status === "submitted");
    items = items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const { page, limit } = readPage(query);
    return json(200, paginate(items, page, limit));
  }

  // PATCH /admin/donations/:id/review
  if (
    segs[0] === "admin" &&
    segs[1] === "donations" &&
    segs[2] &&
    segs[3] === "review" &&
    m === "PATCH"
  ) {
    const id = seg(2);
    const b = (body ?? {}) as { approve?: boolean; note?: string };
    if (typeof b.approve !== "boolean") return badRequest("approve is required");
    const d = getDb().donations.find((x) => x._id === id);
    if (!d) return notFound("Donation not found");
    if (d.status !== "manual_review") return badRequest("Donation is not pending review");
    const isCaptured = d.paidAt !== null;
    if (b.approve) {
      d.status = isCaptured ? "completed" : "pending";
    } else {
      d.status = isCaptured ? "refunded" : "failed";
    }
    d.updatedAt = new Date().toISOString();
    if (d.status === "completed") {
      const campaign = getDb().campaigns.find((c) => c._id === d.campaignId);
      if (campaign) {
        campaign.currentAmount = (campaign.currentAmount ?? 0) + d.amount;
        campaign.updatedAt = new Date().toISOString();
      }
      if (d.campaignId) {
        const project = getDb().projects.find((p) => p._id === campaign?.projectId);
        if (project) {
          project.currentFunding = (project.currentFunding ?? 0) + d.amount;
          project.updatedAt = new Date().toISOString();
        }
      }
    }
    return json(200, d);
  }

  // PATCH /admin/impact-updates/:id/approve
  if (
    segs[0] === "admin" &&
    segs[1] === "impact-updates" &&
    segs[2] &&
    segs[3] === "approve" &&
    m === "PATCH"
  ) {
    const id = seg(2);
    const b = (body ?? {}) as { publishedAt?: string };
    const u = getDb().impactUpdates.find((x) => x._id === id);
    if (!u) return notFound("Impact update not found");
    if (u.status !== "submitted") return badRequest("Update is not pending approval");
    u.status = "published";
    u.publishedAt = b.publishedAt ?? new Date().toISOString();
    u.updatedAt = new Date().toISOString();
    return json(200, u);
  }

  // PATCH /admin/impact-updates/:id/reject
  if (
    segs[0] === "admin" &&
    segs[1] === "impact-updates" &&
    segs[2] &&
    segs[3] === "reject" &&
    m === "PATCH"
  ) {
    const id = seg(2);
    const b = (body ?? {}) as { reason?: string };
    const u = getDb().impactUpdates.find((x) => x._id === id);
    if (!u) return notFound("Impact update not found");
    if (u.status !== "submitted") return badRequest("Update is not pending approval");
    u.status = "rejected";
    u.rejectionReason = b.reason ?? null;
    u.updatedAt = new Date().toISOString();
    return json(200, u);
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
