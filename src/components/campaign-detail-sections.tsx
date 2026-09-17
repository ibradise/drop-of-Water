import { CalendarDays, MapPin, Sparkles, Users } from "lucide-react";
import type { Campaign } from "@/lib/schemas/campaign";
import { Card, CardContent } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { CampaignStatusBadge } from "@/components/ui/status-badges";
import { ProgressBar } from "@/components/progress-bar";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function CampaignHero({ campaign }: { campaign: Campaign }) {
  const end = campaign.endDate ? new Date(campaign.endDate) : null;
  const now = new Date();
  const daysLeft = end ? Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000)) : null;
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[3fr_2fr]">
      <div className="overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200/60">
        {campaign.photos[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={campaign.photos[0]}
            alt={campaign.title}
            className="aspect-[16/9] w-full object-cover"
          />
        ) : (
          <div className="aspect-[16/9] w-full bg-gradient-to-br from-emerald-200 via-sky-100 to-cyan-100" />
        )}
      </div>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <CampaignStatusBadge status={campaign.status} />
          {daysLeft != null && campaign.status === "active" ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs text-slate-700">
              <CalendarDays className="h-3 w-3" />
              {daysLeft} day{daysLeft === 1 ? "" : "s"} left
            </span>
          ) : null}
        </div>
        <h1 className="text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {campaign.title}
        </h1>
        {campaign.summary ? (
          <p className="text-lg text-slate-600">{campaign.summary}</p>
        ) : null}
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold text-slate-900">
              <Money cents={campaign.currentAmount} currency={campaign.currency} emphasis="lg" />
            </span>
            <span className="text-xs text-slate-500">
              of <Money cents={campaign.goalAmount} currency={campaign.currency} />
            </span>
          </div>
          <ProgressBar value={campaign.currentAmount} max={campaign.goalAmount} />
          <p className="text-xs text-slate-500">
            {Math.round((campaign.currentAmount / Math.max(1, campaign.goalAmount)) * 100)}% raised
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-1">
          {campaign.status === "active" ? (
            <Link href={`/campaigns/${campaign._id}/donate`}>
              <Button size="lg" className="w-full">
                <Sparkles className="h-4 w-4" />
                Donate to this campaign
              </Button>
            </Link>
          ) : (
            <div className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-center text-sm text-slate-600">
              This campaign isn&apos;t accepting donations right now.
            </div>
          )}
          <Link href={`/projects/${campaign.projectId}`}>
            <Button size="lg" variant="outline" className="w-full">
              <MapPin className="h-4 w-4" />
              View project
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function CampaignStory({ campaign }: { campaign: Campaign }) {
  if (!campaign.story) return null;
  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold tracking-tight text-slate-900">
        The story
      </h2>
      <Card>
        <CardContent className="prose prose-slate max-w-none whitespace-pre-line text-slate-700">
          {campaign.story}
        </CardContent>
      </Card>
    </section>
  );
}

export function CampaignSponsors({
  sponsors,
}: {
  sponsors: Array<{
    _id: string;
    corporateName: string;
    logoUrl?: string;
    message?: string;
    amount?: number;
    currency: string;
    type: string;
  }>;
}) {
  if (sponsors.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold tracking-tight text-slate-900">
        Sponsors
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {sponsors.map((s) => (
          <Card key={s._id}>
            <CardContent className="flex flex-col gap-2 p-5">
              <div className="flex items-center gap-3">
                {s.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.logoUrl}
                    alt={s.corporateName}
                    className="h-10 w-auto rounded bg-white object-contain p-1 ring-1 ring-slate-200"
                  />
                ) : (
                  <div className="h-10 w-10 rounded bg-slate-100" />
                )}
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-slate-900">
                    {s.corporateName}
                  </h3>
                  <p className="text-xs capitalize text-slate-500">
                    {s.type.replace(/_/g, " ")}
                  </p>
                </div>
              </div>
              {s.message ? (
                <p className="text-sm text-slate-600">{s.message}</p>
              ) : null}
              {s.amount != null ? (
                <div className="border-t border-slate-100 pt-2 text-sm font-semibold text-sky-700">
                  <Money cents={s.amount} currency={s.currency} />
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function CampaignDonors({
  donations,
  currency,
  totalCount,
  isLoading = false,
  isError = false,
  onRetry,
}: {
  donations: Array<{
    _id: string;
    donorSnapshot?: { name?: string; email?: string };
    amount: number;
    currency: string;
    createdAt: string;
  }>;
  currency: string;
  totalCount: number;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}) {
  if (isLoading) {
    return (
      <section>
        <h2 className="mb-3 text-xl font-semibold tracking-tight text-slate-900">
          Recent donors
        </h2>
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </section>
    );
  }
  if (isError) {
    return (
      <section>
        <h2 className="mb-3 text-xl font-semibold tracking-tight text-slate-900">
          Recent donors
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-slate-500">Couldn&apos;t load donors.</p>
          {onRetry ? (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
        </div>
      </section>
    );
  }
  if (donations.length === 0) {
    return (
      <section>
        <h2 className="mb-3 text-xl font-semibold tracking-tight text-slate-900">
          Recent donors
        </h2>
        <p className="text-sm text-slate-500">No donations yet. Be the first to give.</p>
      </section>
    );
  }
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          Recent donors
        </h2>
        <span className="text-xs text-slate-500">
          Showing {donations.length} of {totalCount}
        </span>
      </div>
      <Card>
        <ul className="divide-y divide-slate-100">
          {donations.map((d) => (
            <li
              key={d._id}
              className="flex items-center justify-between gap-4 px-5 py-3 text-sm"
            >
              <div className="flex flex-col">
                <span className="font-medium text-slate-900">
                  {d.donorSnapshot?.name ?? "Anonymous"}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(d.createdAt).toLocaleDateString()}
                </span>
              </div>
              <Money cents={d.amount} currency={d.currency || currency} />
            </li>
          ))}
        </ul>
      </Card>
      {totalCount > donations.length ? (
        <p className="mt-2 text-xs text-slate-500">
          {totalCount - donations.length} more donor
          {totalCount - donations.length === 1 ? "" : "s"} — see them in your account.
        </p>
      ) : null}
    </section>
  );
}

export function CampaignParticipants({ participants }: { participants: Campaign["participants"] }) {
  if (participants.length === 0) return null;
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <Users className="h-4 w-4" />
          {participants.length} fundraiser{participants.length === 1 ? "" : "s"} on this campaign
        </div>
        <ul className="flex flex-wrap gap-2">
          {participants.map((p) => (
            <li
              key={p._id}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs capitalize text-slate-700"
            >
              {p.role.replace(/_/g, " ")}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
