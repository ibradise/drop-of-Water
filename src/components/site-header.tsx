"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { hasAnyRole, ROLE_GROUPS } from "@/lib/enums";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { Droplets, LogOut, Menu, ShieldCheck, User as UserIcon, X } from "lucide-react";

const NAV = [
  { href: "/projects", label: "Projects" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/certificates", label: "Certificates" },
] as const;

export function SiteHeader() {
  const { state, signOut } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isStaff =
    state.status === "authenticated" &&
    hasAnyRole(state.user.roles, ROLE_GROUPS.adminDashboard);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-6 sm:px-8">
        <div className="flex items-center gap-10">
          <Link
            href="/"
            className="group flex items-center gap-2.5 text-base font-bold tracking-tight text-slate-900"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-sm shadow-sky-500/30 transition-transform group-hover:scale-105">
              <Droplets className="h-5 w-5" />
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
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:hidden"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          {state.status === "authenticated" ? (
            <>
              {isStaff ? (
                <Link
                  href="/admin"
                  aria-label="Admin dashboard"
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    pathname === "/admin" || pathname.startsWith("/admin/")
                      ? "border-sky-200 bg-sky-50 text-sky-700"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900",
                  )}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              ) : null}
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
      {menuOpen ? (
        <nav
          aria-label="Mobile navigation"
          className="border-t border-slate-200/60 px-4 py-3 sm:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {NAV.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-sky-50 font-medium text-sky-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            {isStaff ? (
              <Link
                href="/admin"
                onClick={closeMenu}
                className={cn(
                  "rounded-md px-3 py-2 text-sm transition-colors",
                  pathname === "/admin" || pathname.startsWith("/admin/")
                    ? "bg-sky-50 font-medium text-sky-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                Admin dashboard
              </Link>
            ) : null}
            {state.status === "authenticated" ? (
              <Link
                href="/me"
                onClick={closeMenu}
                className="rounded-md px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                My account
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  onClick={closeMenu}
                  className="rounded-md px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  onClick={closeMenu}
                  className="rounded-md px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
