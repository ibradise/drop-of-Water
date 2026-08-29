import { http, HttpResponse, passthrough } from "msw";
import { getDb } from "./db";

type Query = Record<string, string | string[] | undefined>;

function paginate<T>(items: T[], page: number, limit: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const data = items.slice(start, start + limit);
  return {
    data,
    meta: { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
  };
}

function readToken(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1] : null;
}

function readPage(query: Query): { page: number; limit: number } {
  const page = Math.max(1, Number(query.page) || 1);
  const rawLimit = Number(query.limit) || 10;
  const limit = Math.min(100, Math.max(1, rawLimit));
  return { page, limit };
}

function filterDeleted<T>(items: T[]): T[] {
  return (items as Array<{ isDeleted?: boolean }>).filter((x) => !x.isDeleted) as T[];
}

export const handlers = [
  http.all("/api/mock/*", ({ request }) => {
    const url = new URL(request.url);
    if (url.pathname === "/api/mock" || url.pathname === "/api/mock/") {
      return HttpResponse.json({ ok: true, mock: true });
    }
    return passthrough();
  }),

  http.get("/api/mock/projects", ({ request }) => {
    const db = getDb();
    const q = Object.fromEntries(new URL(request.url).searchParams);
    const status = typeof q.status === "string" ? q.status : undefined;
    const { page, limit } = readPage(q);
    let items = filterDeleted(db.projects);
    if (status) items = items.filter((p) => p.status === status);
    return HttpResponse.json(paginate(items, page, limit));
  }),

  http.get("/api/mock/projects/fundable", ({ request }) => {
    const db = getDb();
    const q = Object.fromEntries(new URL(request.url).searchParams);
    const { page, limit } = readPage(q);
    const items = filterDeleted(db.projects).filter((p) => p.status === "fundable");
    return HttpResponse.json(paginate(items, page, limit));
  }),

  http.get("/api/mock/projects/:id", ({ params }) => {
    const db = getDb();
    const project = db.projects.find(
      (p) => p._id === params.id && !(p as { isDeleted?: boolean }).isDeleted,
    );
    if (!project) {
      return HttpResponse.json(
        { statusCode: 404, message: "Project not found", error: "Not Found" },
        { status: 404 },
      );
    }
    return HttpResponse.json(project);
  }),

  http.get("/api/mock/campaigns", ({ request }) => {
    const db = getDb();
    const q = Object.fromEntries(new URL(request.url).searchParams);
    const status = typeof q.status === "string" ? q.status : undefined;
    const projectId = typeof q.projectId === "string" ? q.projectId : undefined;
    const includeSponsorships = q.includeSponsorships === "true" || q.includeSponsorships === "1";
    const { page, limit } = readPage(q);
    let items = db.campaigns.filter((c) => c.status !== "draft");
    if (status) items = items.filter((c) => c.status === status);
    if (projectId) items = items.filter((c) => c.projectId === projectId);
    if (includeSponsorships) {
      items = items.map((c) => ({
        ...c,
        sponsorships: db.sponsorships.filter(
          (s) => s.campaignId === c._id && s.isActive && !s.isDeleted,
        ),
      }));
    }
    return HttpResponse.json(paginate(items, page, limit));
  }),

  http.get("/api/mock/campaigns/active", ({ request }) => {
    const db = getDb();
    const q = Object.fromEntries(new URL(request.url).searchParams);
    const includeSponsorships = q.includeSponsorships === "true" || q.includeSponsorships === "1";
    const { page, limit } = readPage(q);
    let items = db.campaigns.filter((c) => c.status === "active");
    if (includeSponsorships) {
      items = items.map((c) => ({
        ...c,
        sponsorships: db.sponsorships.filter(
          (s) => s.campaignId === c._id && s.isActive && !s.isDeleted,
        ),
      }));
    }
    return HttpResponse.json(paginate(items, page, limit));
  }),

  http.get("/api/mock/campaigns/project/:projectId", ({ params, request }) => {
    const db = getDb();
    const q = Object.fromEntries(new URL(request.url).searchParams);
    const { page, limit } = readPage(q);
    const items = db.campaigns.filter(
      (c) => c.projectId === params.projectId && c.status !== "draft",
    );
    return HttpResponse.json(paginate(items, page, limit));
  }),

  http.get("/api/mock/campaigns/:id", ({ params, request }) => {
    const db = getDb();
    const q = Object.fromEntries(new URL(request.url).searchParams);
    const includeSponsorships = q.includeSponsorships === "true" || q.includeSponsorships === "1";
    const c = db.campaigns.find((x) => x._id === params.id);
    if (!c) {
      return HttpResponse.json(
        { statusCode: 404, message: "Campaign not found", error: "Not Found" },
        { status: 404 },
      );
    }
    if (includeSponsorships) {
      return HttpResponse.json({
        ...c,
        sponsorships: db.sponsorships.filter(
          (s) => s.campaignId === c._id && s.isActive && !s.isDeleted,
        ),
      });
    }
    return HttpResponse.json(c);
  }),

  http.get("/api/mock/campaigns/:campaignId/sponsorships", ({ params, request }) => {
    const db = getDb();
    const q = Object.fromEntries(new URL(request.url).searchParams);
    const { page, limit } = readPage(q);
    const items = db.sponsorships.filter(
      (s) => s.campaignId === params.campaignId && s.isActive && !s.isDeleted,
    );
    return HttpResponse.json(paginate(items, page, limit));
  }),

  http.post("/api/mock/donations", async ({ request }) => {
    const body = (await request.json()) as {
      campaignId?: string;
      amount: number;
      paymentMethod: string;
      message?: string;
      isAnonymous?: boolean;
    };
    const db = getDb();
    const donation = {
      _id: `mock-${Date.now()}`,
      campaignId: body.campaignId ?? null,
      donorId: null,
      donorSnapshot: { name: "Guest Giver" },
      amount: body.amount,
      currency: "ETB",
      paymentMethod: body.paymentMethod,
      transactionId: `dow-mock-${Date.now()}`,
      paidAt: null,
      status: "pending" as const,
      requiresManualReview: body.amount >= 500_000,
      message: body.message,
      isAnonymous: body.isAnonymous ?? false,
      createdBy: "guest",
      updatedBy: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.donations.push(donation as never);
    return HttpResponse.json(
      {
        donation,
        checkout: {
          checkoutUrl: `https://example.com/mock-checkout/${donation.transactionId}`,
          transactionRef: donation.transactionId,
          gateway: body.paymentMethod,
        },
      },
      { status: 201 },
    );
  }),

  http.get("/api/mock/donations/campaign/:campaignId", ({ params, request }) => {
    const db = getDb();
    const q = Object.fromEntries(new URL(request.url).searchParams);
    const { page, limit } = readPage(q);
    const items = db.donations
      .filter(
        (d) =>
          d.campaignId === params.campaignId && d.status === "completed" && !d.isAnonymous,
      )
      .map((d) => ({
        ...d,
        donorSnapshot: d.isAnonymous ? { name: "Anonymous" } : d.donorSnapshot,
      }));
    return HttpResponse.json(paginate(items, page, limit));
  }),

  http.get("/api/mock/impact-updates/project/:projectId", ({ params, request }) => {
    const db = getDb();
    const q = Object.fromEntries(new URL(request.url).searchParams);
    const { page, limit } = readPage(q);
    const items = db.impactUpdates.filter(
      (i) => i.projectId === params.projectId && i.status === "published",
    );
    return HttpResponse.json(paginate(items, page, limit));
  }),

  http.get("/api/mock/impact-updates/campaign/:campaignId", ({ params, request }) => {
    const db = getDb();
    const q = Object.fromEntries(new URL(request.url).searchParams);
    const { page, limit } = readPage(q);
    const items = db.impactUpdates.filter(
      (i) => i.campaignId === params.campaignId && i.status === "published",
    );
    return HttpResponse.json(paginate(items, page, limit));
  }),

  http.get("/api/mock/certificates/:code", ({ params, request }) => {
    const db = getDb();
    const cert = db.certificates.find((c) => c.certificateCode === params.code);
    if (!cert) {
      return HttpResponse.json(
        { statusCode: 404, message: "Certificate not found", error: "Not Found" },
        { status: 404 },
      );
    }
    if (cert.isPublic) {
      const { recipient, ...rest } = cert;
      return HttpResponse.json({ ...rest, recipient: { name: recipient.name } });
    }
    const token = readToken(request);
    if (!token) {
      return HttpResponse.json(
        { statusCode: 404, message: "Certificate not found", error: "Not Found" },
        { status: 404 },
      );
    }
    return HttpResponse.json(cert);
  }),

  http.get("/api/mock/users/me", () => {
    return HttpResponse.json(
      { statusCode: 401, message: "No DoW account for this Firebase user", error: "Unauthorized" },
      { status: 401 },
    );
  }),
];
