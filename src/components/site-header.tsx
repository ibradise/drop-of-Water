"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { state, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-lg font-semibold text-sky-700">
            Drop of Water
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-slate-600 sm:flex">
            <Link href="/projects" className="hover:text-slate-900">
              Projects
            </Link>
            <Link href="/campaigns" className="hover:text-slate-900">
              Campaigns
            </Link>
            <Link href="/certificates" className="hover:text-slate-900">
              Certificates
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {state.status === "authenticated" ? (
            <>
              <Link href="/me" className="text-sm text-slate-700 hover:text-slate-900">
                {state.user.name}
              </Link>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                Sign out
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
