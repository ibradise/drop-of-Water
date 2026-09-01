import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";
import { dispatchMock, matchPath } from "./routes";

// MSW worker — still installed for compatibility, but in mock mode the
// API client bypasses it and calls `dispatchMock` directly (in-process).
// This is more reliable than the service-worker approach: no registration
// required, no scope, no stale-worker state.
export const worker = setupWorker(...handlers);

export type InProcessResult = { status: number; body: unknown };

export async function runInProcessMock(
  method: string,
  url: string,
  init?: { body?: unknown; headers?: Record<string, string> },
): Promise<InProcessResult | null> {
  const u = new URL(url, "http://placeholder.local");
  const path = u.pathname;
  // We don't know the route pattern from the URL alone, so try common ones
  // for each segment. The dispatcher matches by literal segments + params.
  const candidates = candidatePatterns(path);
  for (const pattern of candidates) {
    const params = matchPath(pattern, path);
    if (!params) continue;
    const query: Record<string, string> = {};
    u.searchParams.forEach((v, k) => {
      query[k] = v;
    });
    const res = await dispatchMock({
      method: method.toUpperCase(),
      path: pattern,
      params,
      query,
      body: init?.body,
      headers: init?.headers ?? {},
    });
    if (res) {
      const text = await res.text();
      let body: unknown = null;
      if (text.length > 0) {
        try {
          body = JSON.parse(text);
        } catch {
          body = text;
        }
      }
      return { status: res.status, body };
    }
  }
  return null;
}

const ROUTE_PATTERNS: string[] = [
  "/users/me",
  "/users",
  "/projects",
  "/projects/fundable",
  "/projects/:id",
  "/campaigns",
  "/campaigns/active",
  "/campaigns/project/:projectId",
  "/campaigns/:id",
  "/campaigns/:id/submit",
  "/campaigns/:id/approve",
  "/campaigns/:id/reject",
  "/campaigns/:id/join",
  "/campaigns/:campaignId/sponsorships",
  "/donations",
  "/donations/campaign/:campaignId",
  "/donations/me",
  "/impact-updates",
  "/impact-updates/pending",
  "/impact-updates/project/:projectId",
  "/impact-updates/campaign/:campaignId",
  "/impact-updates/:id",
  "/certificates/me",
  "/certificates/generate",
  "/certificates/:id/visibility",
  "/certificates/:code",
  "/notifications/me",
  "/notifications/device-tokens",
];

function candidatePatterns(path: string): string[] {
  const segs = path.split("/").filter(Boolean);
  const out: string[] = [];
  for (const pattern of ROUTE_PATTERNS) {
    const ps = pattern.split("/").filter(Boolean);
    if (ps.length !== segs.length) continue;
    let ok = true;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      const s = segs[i];
      if (p.startsWith(":")) continue;
      if (p !== s) {
        ok = false;
        break;
      }
    }
    if (ok) out.push(pattern);
  }
  return out;
}
