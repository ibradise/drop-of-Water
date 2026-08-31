"use client";

import { useMocks } from "@/lib/mocks/use-mocks";

export function MockBoot({ children }: { children: React.ReactNode }) {
  const { ready, enabled, error } = useMocks();

  if (ready) return <>{children}</>;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" />
      <p className="text-sm text-slate-600">Booting the API mock…</p>
      <p className="text-xs text-slate-400">
        {error ? (
          <span className="text-rose-600">{error}</span>
        ) : (
          <span>
            mock={String(process.env.NEXT_PUBLIC_API_MOCK)} · ready={String(ready)} · enabled=
            {String(enabled)}
          </span>
        )}
      </p>
    </div>
  );
}
