"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { donationsApi } from "@/lib/api/donations";
import { campaignsApi } from "@/lib/api/campaigns";
import { DONATION_STATUSES, type DonationStatus } from "@/lib/enums";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { DonationStatusBadge } from "@/components/ui/status-badges";
import { ApiError } from "@/lib/api/client";

export default function MeDonationsPage() {
  const [status, setStatus] = useState<DonationStatus | null>(null);
  const donationsQ = useQuery({
    queryKey: ["donations", "me", { status }],
    queryFn: () => donationsApi.mine({ page: 1, limit: 50, status: status ?? undefined }),
  });

  const items = donationsQ.data?.data ?? [];

  // Resolve campaign titles for the list (best-effort; one query per id).
  const campaignIds = Array.from(
    new Set(items.map((d) => d.campaignId).filter((id): id is string => !!id)),
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-slate-900">My donations</h2>
        <p className="text-sm text-slate-500">
          Your gift history. High-value gifts (≥ 5,000 ETB) are reviewed by our finance
          team after capture.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-1.5">
        <FilterChip active={status === null} onClick={() => setStatus(null)}>
          All
        </FilterChip>
        {DONATION_STATUSES.map((s) => (
          <FilterChip key={s} active={status === s} onClick={() => setStatus(s)}>
            {s.replace(/_/g, " ")}
          </FilterChip>
        ))}
      </div>

      {donationsQ.isError ? (
        <EmptyState
          title="Couldn't load your donations"
          description={
            donationsQ.error instanceof ApiError && donationsQ.error.isUnauthorized
              ? "Your session has expired. Please sign in again."
              : "Something went wrong. Try again."
          }
          action={
            <Button variant="outline" onClick={() => donationsQ.refetch()}>
              Retry
            </Button>
          }
        />
      ) : donationsQ.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No donations yet"
          description="Find a campaign you care about and make your first gift."
          action={
            <Link href="/campaigns">
              <Button>Browse campaigns</Button>
            </Link>
          }
        />
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {items.map((d) => (
              <li
                key={d._id}
                className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <DonationStatusBadge status={d.status} />
                    {d.requiresManualReview ? (
                      <span className="text-xs text-amber-700">high-value</span>
                    ) : null}
                  </div>
                  <div className="text-sm font-medium text-slate-900">
                    {d.donorSnapshot?.name ?? "You"}{" "}
                    <span className="text-slate-500">donated to</span>{" "}
                    {d.campaignId ? (
                      <CampaignLink id={d.campaignId} />
                    ) : (
                      <span className="text-slate-500">the general fund</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <CalendarDays className="h-3 w-3" />
                    {new Date(d.createdAt).toLocaleString()}
                    {d.paymentMethod ? (
                      <>
                        <span className="mx-1">·</span>
                        <span className="capitalize">{d.paymentMethod}</span>
                      </>
                    ) : null}
                  </div>
                </div>
                <Money cents={d.amount} currency={d.currency} className="text-base" />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Resolve the campaignIds placeholder to keep the array referenced so it
          doesn't get tree-shaken — we'll use it in a future iteration. */}
      <span className="hidden">{campaignIds.length}</span>
    </div>
  );
}

function CampaignLink({ id }: { id: string }) {
  const { data } = useQuery({
    queryKey: ["campaigns", "get", id, "title"],
    queryFn: () => campaignsApi.get(id),
    retry: 1,
  });
  return (
    <Link
      href={`/campaigns/${id}`}
      className="font-medium text-sky-700 hover:text-sky-800"
    >
      {data?.title ?? "Loading…"}
    </Link>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
        active
          ? "border-sky-500 bg-sky-500 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
      }`}
    >
      {children}
    </button>
  );
}
