"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight, Award, Heart, Pencil, ShieldCheck, Sparkles, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { hasAnyRole, ROLE_GROUPS } from "@/lib/enums";
import { usersApi } from "@/lib/api/users";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNow } from "@/lib/use-now";

const ACTIONS = [
  { href: "/me/edit", label: "Edit your profile", icon: Pencil },
  { href: "/me/donations", label: "See your donation history", icon: Heart },
  { href: "/me/certificates", label: "Generate or share a certificate", icon: Award },
  { href: "/me/campaigns", label: "Run your own campaign", icon: Sparkles },
  { href: "/me/notifications", label: "Notifications and device tokens", icon: ArrowRight },
];

export default function MePage() {
  const { state } = useAuth();
  const meQ = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => usersApi.me(),
    enabled: state.status === "authenticated",
  });
  useNow();

  if (state.status !== "authenticated") {
    return <div className="text-sm text-slate-500">Loading…</div>;
  }
  const u = state.user;
  const initials = u.name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <Card className="flex-1 overflow-hidden">
        <div className="relative h-24 bg-gradient-to-br from-sky-500 via-cyan-500 to-cyan-600" />
        <CardContent className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-5">
          <div className="grid h-20 w-20 -translate-y-12 place-items-center rounded-2xl border-4 border-white bg-gradient-to-br from-sky-500 to-cyan-600 text-xl font-bold text-white shadow-md sm:-translate-y-10">
            {initials || <UserIcon className="h-7 w-7" />}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">{u.name}</h2>
            <p className="text-sm text-slate-500">{u.email}</p>
            {u.entityType ? (
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-sky-700">
                {u.entityType}
              </p>
            ) : null}
          </div>
        </CardContent>
        <div className="border-t border-slate-100 px-6 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {u.phoneNumber ? (
              <Field label="Phone" value={u.phoneNumber} />
            ) : null}
            <div className="sm:col-span-2">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Roles
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {u.roles.map((r) => (
                  <Badge key={r} tone="info" className="capitalize">
                    {r.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </div>
            {u.profile ? (
              <>
                {u.profile.location ? (
                  <Field label="Location" value={u.profile.location} />
                ) : null}
                {u.profile.organizationName ? (
                  <Field label="Organization" value={u.profile.organizationName} />
                ) : null}
                {u.profile.bio ? (
                  <div className="sm:col-span-2">
                    <Field label="Bio" value={u.profile.bio} />
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </Card>

      <Card className="lg:w-80">
        <CardHeader>
          <CardTitle className="text-base">What you can do</CardTitle>
          <CardDescription>Quick links to your most-used tools.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {ACTIONS.map((a) => (
            <Link key={a.href} href={a.href}>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <a.icon className="h-4 w-4 text-slate-500" />
                  {a.label}
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          ))}
          {hasAnyRole(u.roles, ROLE_GROUPS.adminDashboard) ? (
            <Link href="/admin">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-slate-500" />
                  Staff tools (admin)
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          ) : null}
        </CardContent>
      </Card>

      {meQ.isError ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-sm text-slate-600">
            We couldn&apos;t refresh your profile. Please try again.
          </p>
          <Button variant="outline" size="sm" onClick={() => meQ.refetch()}>
            Retry
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 text-sm text-slate-900">{value}</div>
    </div>
  );
}
