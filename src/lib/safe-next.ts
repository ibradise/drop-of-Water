export function getSafeNext(raw: string | null | undefined, fallback = "/me"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return fallback;
  return raw;
}
