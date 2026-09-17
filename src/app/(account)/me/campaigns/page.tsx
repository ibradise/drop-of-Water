"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { CalendarDays, Plus, Users } from "lucide-react";
import { campaignsApi } from "@/lib/api/campaigns";
import { projectsApi } from "@/lib/api/projects";
import { CAMPAIGN_STATUSES, type CampaignStatus, type Role } from "@/lib/enums";
import { Card, CardContent, EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { CampaignStatusBadge } from "@/components/ui/status-badges";
import { ProgressBar } from "@/components/progress-bar";
import { useAuth } from "@/lib/auth/context";
import { hasAnyRole } from "@/lib/enums";

const CREATOR_ROLES: Role[] = [
  "campaign_creator",
  "chapter_leader",
  "content_contributor",
  "content_manager",
  "digital_coordinator",
  "program_director",
  "system_admin",
];

export default function MyCampaignsPage() {
  const { state } = useAuth();
  const [status, setStatus] = useState<CampaignStatus | null>(null);
  const meQ = useQuery({
    queryKey: ["campaigns", "mine", state.status === "authenticated" ? state.user.id : null],
    queryFn: async () => {
      // Pull a large page; client-filter for "mine" since the public endpoint
      // doesn't have a ?createdBy= filter. Real backend would add one.
      const all = await campaignsApi.list({ page: 1, limit: 100 });
      const userId = state.status === "authenticated" ? state.user.id : null;
      const mine = all.data.filter(
        (c) =>
          c.createdBy === userId ||
          c.participants.some((p) => p.userId === userId),
      );
      return mine;
    },
    enabled: state.status === "authenticated",
  });

  if (state.status !== "authenticated") {
    return <div className="text-sm text-slate-500">Loading…</div>;
  }

  const all = meQ.data ?? [];
  const filtered = status ? all.filter((c) => c.status === status) : all;
  const isCreator = hasAnyRole(state.user.roles, CREATOR_ROLES);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-slate-900">My campaigns</h2>
          <p className="text-sm text-slate-500">
            Campaigns you created or joined as a co-fundraiser.
          </p>
        </div>
        {isCreator ? (
          <Link href="/me/campaigns/new">
            <Button>
              <Plus className="h-4 w-4" />
              New campaign
            </Button>
          </Link>
        ) : null}
      </header>

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

      {meQ.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : meQ.isError ? (
        <EmptyState
          title="Couldn't load your campaigns"
          action={
            <Button variant="outline" onClick={() => meQ.refetch()}>
              Retry
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No campaigns yet"
          description={
            isCreator
              ? "Create your first campaign to start raising money for a fundable project."
              : "Ask a creator to invite you, or become a creator yourself."
          }
          action={
            isCreator ? (
              <Link href="/me/campaigns/new">
                <Button>Create your first campaign</Button>
              </Link>
            ) : null
          }
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((c) => (
            <li key={c._id}>
              <Link
                href={`/me/campaigns/${c._id}/manage`}
                className="block focus:outline-none focus:ring-2 focus:ring-sky-500 rounded-xl"
              >
                <CampaignRow campaignId={c.projectId} campaign={c} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CampaignRow({
  campaignId,
  campaign,
}: {
  campaignId: string;
  campaign: import("@/lib/schemas/campaign").Campaign;
}) {
  const projectQ = useQuery({
    queryKey: ["projects", "get", campaignId, "title"],
    queryFn: () => projectsApi.get(campaignId),
    retry: 1,
    staleTime: 60_000,
  });
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <CampaignStatusBadge status={campaign.status} />
            {campaign.createdBy ===
            (typeof window !== "undefined" ? "" : "") ? null : null}
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            {campaign.title}
          </h3>
          {projectQ.data ? (
            <p className="text-xs text-slate-500">
              Backing:{" "}
              <span className="font-medium text-slate-700">
                {projectQ.data.title}
              </span>
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {campaign.participants.length} participant
              {campaign.participants.length === 1 ? "" : "s"}
            </span>
            {campaign.endDate ? (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                ends {new Date(campaign.endDate).toLocaleDateString()}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:w-56">
          <ProgressBar value={campaign.currentAmount} max={campaign.goalAmount} />
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium text-slate-900">
              <Money cents={campaign.currentAmount} currency={campaign.currency} />
            </span>
            <span className="text-xs text-slate-500">
              of <Money cents={campaign.goalAmount} currency={campaign.currency} />
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
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
