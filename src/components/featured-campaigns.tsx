"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { campaignsApi } from "@/lib/api/campaigns";
import { CampaignCard } from "@/components/campaign-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";

export function FeaturedCampaigns() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["campaigns", "active", "featured"],
    queryFn: () => campaignsApi.active({ page: 1, limit: 3 }),
  });

  const items = data?.data ?? [];
  if (!isLoading && items.length === 0 && !isError) return null;

  if (isError) {
    return (
      <section className="flex flex-col gap-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Active campaigns
            </h2>
            <p className="text-slate-600">Real fundraisers, real wells, real impact.</p>
          </div>
          <Link href="/campaigns">
            <Button variant="outline" size="sm">
              All campaigns
            </Button>
          </Link>
        </div>
        <EmptyState
          title="We couldn't load campaigns"
          description="Something went wrong on our side. Please try again. If it keeps failing, contact support."
          action={
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Active campaigns
          </h2>
          <p className="text-slate-600">Real fundraisers, real wells, real impact.</p>
        </div>
        <Link href="/campaigns">
          <Button variant="outline" size="sm">
            All campaigns
          </Button>
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className="aspect-[16/9] animate-pulse rounded-xl bg-slate-100"
              />
            ))
          : items.map((c) => <CampaignCard key={c._id} campaign={c} />)}
      </div>
    </section>
  );
}
