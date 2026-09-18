"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Frown, Search } from "lucide-react";
import { campaignsApi } from "@/lib/api/campaigns";
import { CAMPAIGN_STATUSES, type CampaignStatus } from "@/lib/enums";
import type { Campaign } from "@/lib/schemas/campaign";
import { CampaignCard } from "@/components/campaign-card";
import { StatusFilter } from "@/components/status-filter";
import { EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const PUBLIC_STATUS_OPTIONS = CAMPAIGN_STATUSES.filter(
  (s) => s !== "draft" && s !== "pending_approval",
);
const HIDDEN_PUBLIC_STATUSES: readonly CampaignStatus[] = ["draft", "pending_approval"];

export function CampaignsList({ initialStatus }: { initialStatus: CampaignStatus | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<CampaignStatus | null>(initialStatus);
  const [page, setPage] = useState(1);
  const limit = 12;

  const query = useQuery({
    queryKey: ["campaigns", "list", { status, page }],
    queryFn: () => campaignsApi.list({ status: status ?? undefined, page, limit }),
  });

  const items = query.data?.data ?? [];
  const meta = query.data?.meta;

  const visibleItems = items.filter((c) => !HIDDEN_PUBLIC_STATUSES.includes(c.status));
  const hiddenOnPage = items.length - visibleItems.length;
  const shownTotal = meta ? Math.max(0, meta.total - hiddenOnPage) : undefined;

  const onStatusChange = (next: CampaignStatus | null) => {
    setStatus(next);
    setPage(1);
    const params = new URLSearchParams();
    if (next) params.set("status", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const showEmpty = useMemo(
    () => !query.isLoading && !query.isError && visibleItems.length === 0,
    [query.isLoading, query.isError, visibleItems.length],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <StatusFilter value={status} onChange={onStatusChange} options={PUBLIC_STATUS_OPTIONS} />
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {shownTotal != null ? (
            <span>
              {shownTotal} campaign{shownTotal === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
      </div>

      {query.isError ? (
        <EmptyState
          icon={<Frown className="h-8 w-8" />}
          title="We couldn't load campaigns"
          description="Something went wrong on our side. Please try again. If it keeps failing, contact support."
          action={
            <Button variant="outline" onClick={() => query.refetch()}>
              Retry
            </Button>
          }
        />
      ) : showEmpty ? (
        <EmptyState
          icon={<Search className="h-8 w-8" />}
          title="No campaigns found"
          description={
            status
              ? `There are no ${status.replace(/_/g, " ")} campaigns right now.`
              : "There are no campaigns to show yet."
          }
          action={
            status ? (
              <Button variant="outline" onClick={() => onStatusChange(null)}>
                Clear filter
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(query.isLoading ? Array.from({ length: 6 }, () => null) : visibleItems).map(
              (campaign: Campaign | null, i) =>
                campaign ? (
                  <CampaignCard key={campaign._id} campaign={campaign} />
                ) : (
                  <CampaignSkeleton key={i} />
                ),
            )}
          </div>
          {meta ? (
            <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-sm text-slate-600">
              <span>
                {shownTotal === 0
                  ? "No results"
                  : `Showing ${(meta.page - 1) * meta.limit + 1}–${Math.min(
                      shownTotal ?? 0,
                      (meta.page - 1) * meta.limit + visibleItems.length,
                    )} of ${shownTotal ?? 0}`}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!meta.hasPrevPage || query.isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!meta.hasNextPage || query.isFetching}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function CampaignSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
      <div className="aspect-[16/9] animate-pulse bg-slate-100" />
      <div className="flex flex-col gap-2 p-6">
        <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
        <div className="h-5 w-3/4 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
        <div className="mt-2 h-1.5 w-full animate-pulse rounded-full bg-slate-100" />
      </div>
    </div>
  );
}
