import { http, passthrough } from "msw";
import { dispatchMock } from "./routes";

// List of route patterns. The MSW worker uses these for service-worker
// interception (fallback if the in-process mock is not available).
const ROUTES: string[] = [
  "GET /users/me",
  "POST /users",
  "PATCH /users/me",
  "GET /projects",
  "GET /projects/fundable",
  "GET /projects/:id",
  "GET /campaigns",
  "GET /campaigns/active",
  "GET /campaigns/project/:projectId",
  "GET /campaigns/:id",
  "GET /campaigns/:campaignId/sponsorships",
  "POST /donations",
  "GET /donations/campaign/:campaignId",
  "GET /impact-updates/project/:projectId",
  "GET /impact-updates/campaign/:campaignId",
  "GET /certificates/:code",
  "POST /notifications/device-tokens",
  "DELETE /notifications/device-tokens",
];

export const handlers = ROUTES.map((route) => {
  const [method, pattern] = route.split(" ");
  return http[method.toLowerCase() as "get" | "post" | "patch" | "delete"](
    pattern,
    async ({ request, params }) => {
      const url = new URL(request.url);
      const query: Record<string, string> = {};
      url.searchParams.forEach((v, k) => {
        query[k] = v;
      });
      const headers: Record<string, string> = {};
      request.headers.forEach((v, k) => {
        headers[k] = v;
      });
      let body: unknown = undefined;
      if (method !== "GET" && method !== "DELETE") {
        try {
          body = await request.clone().json();
        } catch {
          /* no body */
        }
      }
      // Reconstruct the matched path from the pattern + params.
      const path = pattern
        .split("/")
        .map((seg) => {
          if (seg.startsWith(":")) return params[seg.slice(1)] ?? "";
          return seg;
        })
        .join("/");
      const res = await dispatchMock({
        method,
        path: "/" + path,
        params: params as Record<string, string>,
        query,
        body,
        headers,
      });
      if (!res) return passthrough();
      return res;
    },
  );
});
