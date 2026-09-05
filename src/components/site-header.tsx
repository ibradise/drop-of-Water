"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { Droplets, LogOut, User as UserIcon } from "lucide-react";

const NAV = [
  { href: "/projects", label: "Projects" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/certificates", label: "Certificates" },
] as const;

export function SiteHeader() {
  const { state, signOut } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="group flex items-center gap-2 text-base font-bold tracking-tight text-slate-900"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-sm shadow-sky-500/30 transition-transform group-hover:scale-105">
              <Droplets className="h-4 w-4" />
            </span>
            <span>
              Drop <span className="gradient-text">of Water</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 text-sm text-slate-600 sm:flex">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-3 py-1.5 transition-colors",
                    active
                      ? "bg-sky-50 font-medium text-sky-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {state.status === "authenticated" ? (
            <>
              <Link
                href="/me"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-600 text-white">
                  <UserIcon className="h-3 w-3" />
                </span>
                {state.user.name}
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                aria-label="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </>
          ) : state.status === "needs-onboarding" ? (
            <Link href="/onboarding">
              <Button size="sm">Complete profile</Button>
            </Link>
          ) : (
            <>
              <Link href="/sign-in">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
