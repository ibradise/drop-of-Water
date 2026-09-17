"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Check, ChevronRight, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/api/admin";
import { campaignsApi } from "@/lib/api/campaigns";
import { Card, CardContent, EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { CampaignStatusBadge } from "@/components/ui/status-badges";
import { CAMPAIGN_STATUSES, type CampaignStatus } from "@/lib/enums";

export default function AdminCampaignsPage() {
  const [status, setStatus] = useState<CampaignStatus | null>(null);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["admin", "campaigns", { status }],
    queryFn: () =>
      adminApi.campaigns({
        page: 1,
        limit: 50,
        status: status ?? undefined,
      }),
  });

  const approve = useMutation({
    mutationFn: (id: string) => campaignsApi.approve(id),
    onSuccess: () => {
      toast.success("Campaign approved.");
      qc.invalidateQueries({ queryKey: ["admin", "campaigns"] });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      qc.invalidateQueries({ queryKey: ["admin", "review-queue"] });
    },
    onError: () => toast.error("Couldn't approve campaign."),
  });

  const reject = useMutation({
    mutationFn: (id: string) => campaignsApi.reject(id),
    onSuccess: () => {
      toast.success("Campaign rejected.");
      qc.invalidateQueries({ queryKey: ["admin", "campaigns"] });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      qc.invalidateQueries({ queryKey: ["admin", "review-queue"] });
    },
    onError: () => toast.error("Couldn't reject campaign."),
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Campaigns</h2>
        <p className="text-sm text-slate-500">
          All fundraising campaigns. Pending ones can be approved or rejected.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
            <Filter className="h-3 w-3" /> Filters
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip active={status === null} onClick={() => setStatus(null)}>
              All
            </FilterChip>
            {CAMPAIGN_STATUSES.map((s) => (
              <FilterChip key={s} active={status === s} onClick={() => setStatus(s)}>
                {s.replace(/_/g, " ")}
              </FilterChip>
            ))}
          </div>
        </CardContent>
      </Card>

      {q.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : q.isError ? (
        <EmptyState
          title="Couldn't load campaigns"
          action={
            <Button variant="outline" onClick={() => q.refetch()}>
              Retry
            </Button>
          }
        />
      ) : !q.data ? null : q.data.data.length === 0 ? (
        <EmptyState title="No campaigns match the filter" />
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {q.data.data.map((c) => (
              <li key={c._id} className="flex items-center justify-between gap-3 px-5 py-3">
                <Link
                  href={`/campaigns/${c._id}`}
                  className="min-w-0 flex-1"
                >
                  <div className="flex items-center gap-2">
                    <CampaignStatusBadge status={c.status} />
                    {c.joinable ? <Badge tone="neutral">joinable</Badge> : null}
                  </div>
                  <div className="mt-1 truncate text-sm font-medium text-slate-900">
                    {c.title}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    <Money cents={c.currentAmount} currency={c.currency} /> of{" "}
                    <Money cents={c.goalAmount} currency={c.currency} />
                    {c.startDate ? ` · started ${new Date(c.startDate).toLocaleDateString()}` : null}
                  </div>
                </Link>

                <div className="flex items-center gap-1.5 shrink-0">
                  {c.status === "pending_approval" ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => approve.mutate(c._id)}
                        isLoading={approve.isPending && approve.variables === c._id}
                        className="text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => reject.mutate(c._id)}
                        isLoading={reject.isPending && reject.variables === c._id}
                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </>
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
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