"use client";

import Link from "next/link";
import { Droplets } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { hasAnyRole, ROLE_GROUPS } from "@/lib/enums";
import pkg from "../../package.json";

export function SiteFooter() {
  const { state } = useAuth();
  const isAuthed = state.status === "authenticated";
  const isCreator =
    isAuthed && hasAnyRole(state.user.roles, ROLE_GROUPS.campaignCreators);

  return (
    <footer className="mt-24 border-t border-slate-200/60 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-600 text-white">
                <Droplets className="h-4 w-4" />
              </span>
              <span className="text-base font-bold tracking-tight text-slate-900">
                Drop <span className="gradient-text">of Water</span>
              </span>
            </Link>
            <p className="max-w-xs text-sm text-slate-500">
              Crowdfunding for water-infrastructure projects across Ethiopia.
              Fund wells, sponsor campaigns, see your impact.
            </p>
          </div>
          <FooterCol
            title="Browse"
            links={[
              { href: "/projects", label: "Projects" },
              { href: "/campaigns", label: "Campaigns" },
              { href: "/certificates", label: "Certificates" },
            ]}
          />
          {isAuthed ? (
            <FooterCol
              title="Your account"
              links={[
                { href: "/me", label: "Profile" },
                { href: "/me/donations", label: "My donations" },
                { href: "/me/certificates", label: "My certificates" },
                { href: "/me/campaigns", label: "My campaigns" },
              ]}
            />
          ) : null}
          <FooterCol
            title="Get involved"
            links={[
              ...(!isAuthed
                ? [
                    { href: "/sign-up", label: "Create an account" },
                    { href: "/sign-in", label: "Sign in" },
                  ]
                : []),
              ...(!isAuthed || isCreator
                ? [{ href: "/me/campaigns/new", label: "Start a campaign" }]
                : []),
            ]}
          />
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-slate-100 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center">
          <p>&copy; {new Date().getFullYear()} Drop of Water. Clean water, funded together.</p>
          <p className="font-mono">v{pkg.version}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h4>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-sm text-slate-700 transition-colors hover:text-sky-700"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
