export class ApiError extends Error {
  readonly statusCode: number;
  readonly messages: string[];
  readonly error?: string;
  readonly payload?: unknown;

  constructor(statusCode: number, message: string | string[], payload?: unknown) {
    const messages = Array.isArray(message) ? message : [message];
    super(messages.join(", "));
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.messages = messages;
    this.payload = payload;
    if (payload && typeof payload === "object" && "error" in payload) {
      this.error = String((payload as { error: unknown }).error);
    }
  }

  get isUnauthorized(): boolean {
    return this.statusCode === 401;
  }
  get isForbidden(): boolean {
    return this.statusCode === 403;
  }
  get isNotFound(): boolean {
    return this.statusCode === 404;
  }
  get isConflict(): boolean {
    return this.statusCode === 409;
  }
  get isValidation(): boolean {
    return this.statusCode === 400;
  }
}

type TokenProvider = () => Promise<string | null>;

let tokenProvider: TokenProvider | null = null;

export function setTokenProvider(provider: TokenProvider | null): void {
  tokenProvider = provider;
}

const DEFAULT_BASE_URL = "http://localhost:3000";

function getBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.length > 0) return envUrl.replace(/\/$/, "");
  return DEFAULT_BASE_URL;
}

function isMockMode(): boolean {
  return process.env.NEXT_PUBLIC_API_MOCK === "true";
}

function buildUrl(path: string, query?: Record<string, unknown>): string {
  const base = getBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${cleanPath}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, String(v));
    } else if (typeof value === "boolean") {
      params.append(key, value ? "true" : "false");
    } else {
      params.append(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  query?: Record<string, unknown>;
  skipAuth?: boolean;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { body, query, skipAuth, headers, ...rest } = options;
  const url = buildUrl(path, query);

  // In mock mode we run the handler in-process. This bypasses fetch + MSW
  // entirely, so it works without a service worker registration and survives
  // any stale-worker state.
  if (isMockMode()) {
    return runInProcessMockRequest<T>(path, url, options);
  }

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(headers as Record<string, string> | undefined),
  };
  if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
  }

  if (!skipAuth && tokenProvider) {
    const token = await tokenProvider();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: rest.cache ?? "no-store",
  });
  const text = await res.text();
  let payload: unknown = undefined;
  if (text.length > 0) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    const message =
      (payload &&
        typeof payload === "object" &&
        "message" in payload &&
        (payload as { message: unknown }).message) ||
      res.statusText ||
      "Request failed";
    throw new ApiError(res.status, message as string | string[], payload);
  }

  return payload as T;
}

async function runInProcessMockRequest<T>(
  path: string,
  url: string,
  options: ApiFetchOptions,
): Promise<T> {
  const { body, skipAuth, headers } = options;
  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(headers as Record<string, string> | undefined),
  };
  if (body !== undefined) finalHeaders["Content-Type"] = "application/json";
  if (!skipAuth && tokenProvider) {
    const token = await tokenProvider();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }
  // Dynamic import keeps MSW out of the initial server bundle.
  const { runInProcessMock } = await import("@/lib/mocks/browser");
  const result = await runInProcessMock(options.method ?? "GET", url, {
    body,
    headers: finalHeaders,
  });
  if (!result) {
    throw new ApiError(404, `No mock handler for ${options.method ?? "GET"} ${path}`, null);
  }
  if (result.status < 200 || result.status >= 300) {
    const payload = result.body;
    const message =
      (payload &&
        typeof payload === "object" &&
        "message" in payload &&
        (payload as { message: unknown }).message) ||
      "Mock request failed";
    throw new ApiError(result.status, message as string | string[], payload);
  }
  // The handler may return 204 with no body; return undefined for that case.
  if (result.status === 204) return undefined as T;
  return result.body as T;
}

export const api = {
  get: <T>(path: string, opts?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...opts, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, opts?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...opts, method: "PATCH", body }),
  put: <T>(path: string, body?: unknown, opts?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...opts, method: "PUT", body }),
  delete: <T>(path: string, opts?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...opts, method: "DELETE" }),
};
