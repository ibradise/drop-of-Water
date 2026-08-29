"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Frown } from "lucide-react";
import { campaignsApi } from "@/lib/api/campaigns";
import { CAMPAIGN_STATUSES, type CampaignStatus } from "@/lib/enums";
import type { Campaign } from "@/lib/schemas/campaign";
import { CampaignCard } from "@/components/campaign-card";
import { StatusFilter } from "@/components/status-filter";
import { EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

  const onStatusChange = (next: CampaignStatus | null) => {
    setStatus(next);
    setPage(1);
    const params = new URLSearchParams();
    if (next) params.set("status", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const showEmpty = useMemo(
    () => !query.isLoading && !query.isError && items.length === 0,
    [query.isLoading, query.isError, items.length],
  );

  return (
    <div className="flex flex-col gap-6">
      <StatusFilter
        value={status}
        onChange={onStatusChange}
        options={CAMPAIGN_STATUSES}
      />

      {query.isError ? (
        <EmptyState
          icon={<Frown className="h-8 w-8" />}
          title="Couldn't load campaigns"
          description="Something went wrong talking to the API. Try again."
          action={
            <Button variant="outline" onClick={() => query.refetch()}>
              Retry
            </Button>
          }
        />
      ) : showEmpty ? (
        <EmptyState
          title="No campaigns found"
          description={
            status
              ? `No campaigns in "${status.replace(/_/g, " ")}" status.`
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
            {(query.isLoading ? Array.from({ length: 6 }, () => null) : items).map(
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
                {meta.total === 0
                  ? "No results"
                  : `Showing ${(meta.page - 1) * meta.limit + 1}–${Math.min(
                      meta.total,
                      meta.page * meta.limit,
                    )} of ${meta.total}`}
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
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="aspect-[16/9] animate-pulse bg-slate-100" />
      <div className="flex flex-col gap-2 p-5">
        <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
        <div className="h-5 w-3/4 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
        <div className="mt-2 h-1.5 w-full animate-pulse rounded-full bg-slate-100" />
      </div>
    </div>
  );
}
