"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { usersApi } from "@/lib/api/users";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function MePage() {
  const { state } = useAuth();
  const meQ = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => usersApi.me(),
    enabled: state.status === "authenticated",
  });

  if (state.status !== "authenticated") {
    return <div className="text-sm text-slate-500">Loading…</div>;
  }
  const u = state.user;

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account basics and DoW profile.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Row label="Name" value={u.name} />
          <Row label="Email" value={u.email} />
          {u.phoneNumber ? <Row label="Phone" value={u.phoneNumber} /> : null}
          {u.entityType ? (
            <Row label="I am a" value={u.entityType.charAt(0).toUpperCase() + u.entityType.slice(1)} />
          ) : null}
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Roles</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {u.roles.map((r) => (
                <Badge key={r} tone="info" className="capitalize">
                  {r.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </div>
          {u.profile ? (
            <div className="flex flex-col gap-2">
              {u.profile.location ? <Row label="Location" value={u.profile.location} /> : null}
              {u.profile.organizationName ? (
                <Row label="Organization" value={u.profile.organizationName} />
              ) : null}
              {u.profile.bio ? <Row label="Bio" value={u.profile.bio} /> : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What you can do</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <Link href="/me/donations">
            <Button variant="outline" className="w-full justify-start">
              See your donation history
            </Button>
          </Link>
          <Link href="/me/certificates">
            <Button variant="outline" className="w-full justify-start">
              Generate or share a certificate
            </Button>
          </Link>
          <Link href="/me/campaigns">
            <Button variant="outline" className="w-full justify-start">
              Run your own campaign
            </Button>
          </Link>
          <Link href="/me/notifications">
            <Button variant="outline" className="w-full justify-start">
              Notifications and device tokens
            </Button>
          </Link>
        </CardContent>
      </Card>

      {meQ.isError ? (
        <p className="text-xs text-rose-600">Failed to refresh profile.</p>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm text-slate-900">{value}</div>
    </div>
  );
}
