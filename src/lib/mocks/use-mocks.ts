"use client";

import { useEffect, useState } from "react";

type State = { ready: boolean; enabled: boolean; error: string | null };

let startPromise: Promise<boolean> | null = null;

export function useMocks(): State {
  const shouldMock = process.env.NEXT_PUBLIC_API_MOCK === "true";
  const [state, setState] = useState<State>({
    ready: !shouldMock,
    enabled: false,
    error: null,
  });

  useEffect(() => {
    if (!shouldMock) return;
    if (startPromise) {
      // Worker is already being started (or has started) in this tab.
      startPromise.then((ok) =>
        setState({ ready: true, enabled: ok, error: ok ? null : "MSW start failed" }),
      );
      return;
    }
    startPromise = (async () => {
      const mod = await import("@/lib/mocks/browser");
      try {
        await mod.worker.start({
          onUnhandledRequest: "bypass",
          serviceWorker: { url: "/mockServiceWorker.js" },
          quiet: true,
        });
        return true;
      } catch (err) {
        console.error("Failed to start MSW", err);
        return false;
      }
    })();
    startPromise.then((ok) =>
      setState({
        ready: true,
        enabled: ok,
        error: ok ? null : "MSW failed to start (see console)",
      }),
    );
  }, [shouldMock]);

  return state;
}
