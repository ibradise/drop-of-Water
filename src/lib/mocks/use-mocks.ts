"use client";

import { useEffect, useState } from "react";

export function useMocks(): { ready: boolean; enabled: boolean } {
  const shouldMock = process.env.NEXT_PUBLIC_API_MOCK === "true";
  const [state, setState] = useState<{ ready: boolean; enabled: boolean }>({
    ready: !shouldMock,
    enabled: false,
  });

  useEffect(() => {
    if (!shouldMock) return;
    let cancelled = false;
    (async () => {
      const mod = await import("@/lib/mocks/browser");
      await mod.worker.start({
        onUnhandledRequest: "bypass",
        serviceWorker: { url: "/mockServiceWorker.js" },
      });
      if (!cancelled) setState({ ready: true, enabled: true });
    })().catch((err) => {
      console.error("Failed to start MSW", err);
      if (!cancelled) setState({ ready: true, enabled: false });
    });
    return () => {
      cancelled = true;
    };
  }, [shouldMock]);

  return state;
}
