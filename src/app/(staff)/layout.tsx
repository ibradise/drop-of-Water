"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth/context";
import { hasAnyRole, type Role } from "@/lib/enums";
import { cn } from "@/lib/cn";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ADMIN_ROLES: Role[] = ["program_director", "finance_admin", "system_admin"];

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/review-queue", label: "Review queue" },
  { href: "/admin/donations", label: "Donations" },
  { href: "/admin/impact-updates/pending", label: "Pending updates" },
];

export default function StaffLayout({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (state.status === "loading") return;
    if (state.status === "unauthenticated") {
      router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`);
    } else if (state.status === "needs-onboarding") {
      router.replace("/onboarding");
    } else if (!hasAnyRole(state.user.roles, ADMIN_ROLES)) {
      // No redirect — show a "no access" screen below.
    }
  }, [state, router, pathname]);

  if (state.status === "loading") {
    return <div className="text-sm text-slate-500">Loading…</div>;
  }
  if (state.status === "unauthenticated" || state.status === "needs-onboarding") {
    return <div className="text-sm text-slate-500">Redirecting…</div>;
  }
  if (!hasAnyRole(state.user.roles, ADMIN_ROLES)) {
    return (
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Staff access required</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-700">
            <p>
              The admin tools require a <code>program_director</code>,{" "}
              <code>finance_admin</code>, or <code>system_admin</code> role.
            </p>
            <p className="text-slate-500">
              Ask a system admin to grant you a role from the user admin screen.
            </p>
            <div className="mt-2 flex gap-2">
              <Link href="/me">
                <Button variant="outline">Back to my account</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Admin</h1>
        <p className="text-slate-600">
          Signed in as {state.user.name} · staff tools
        </p>
      </header>
      <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 text-sm">
        {TABS.map((t) => {
          const active =
            t.href === "/admin" ? pathname === "/admin" : pathname.startsWith(t.href);
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
