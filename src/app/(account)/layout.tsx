"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth/context";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/me", label: "Profile" },
  { href: "/me/edit", label: "Edit profile" },
  { href: "/me/donations", label: "My donations" },
  { href: "/me/certificates", label: "My certificates" },
  { href: "/me/campaigns", label: "My campaigns" },
  { href: "/me/notifications", label: "Notifications" },
] as const;

export default function AccountLayout({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (state.status === "loading") return;
    if (state.status === "unauthenticated") {
      router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`);
    } else if (state.status === "needs-onboarding") {
      router.replace(`/onboarding?next=${encodeURIComponent(pathname)}`);
    }
  }, [state, router, pathname]);

  if (state.status !== "authenticated") {
    return <div className="text-sm text-slate-500">Loading…</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">My account</h1>
        <p className="text-slate-600">Signed in as {state.user.name}.</p>
      </header>
      <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 text-sm">
        {TABS.map((t) => {
          const active =
            t.href === "/me"
              ? pathname === "/me"
              : pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "rounded-md px-3 py-1.5 transition-colors",
                active
                  ? "bg-sky-50 font-medium text-sky-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      <section>{children}</section>
    </div>
  );
}
