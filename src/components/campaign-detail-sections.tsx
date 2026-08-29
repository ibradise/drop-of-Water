import { CalendarDays, MapPin } from "lucide-react";
import type { Campaign } from "@/lib/schemas/campaign";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { CampaignStatusBadge } from "@/components/ui/status-badges";
import { ProgressBar } from "@/components/progress-bar";
import { Button } from "@/components/ui/button";
import { useNow } from "@/lib/use-now";
import Link from "next/link";

export function CampaignHero({ campaign }: { campaign: Campaign }) {
  const end = campaign.endDate ? new Date(campaign.endDate) : null;
  const now = useNow();
  const daysLeft = end ? Math.max(0, Math.ceil((end.getTime() - now) / 86_400_000)) : null;
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
      <div className="overflow-hidden rounded-2xl bg-slate-100">
        {campaign.photos[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={campaign.photos[0]}
            alt={campaign.title}
            className="aspect-[16/9] w-full object-cover"
          />
        ) : (
          <div className="aspect-[16/9] w-full bg-gradient-to-br from-emerald-100 to-sky-200" />
        )}
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <CampaignStatusBadge status={campaign.status} />
          {daysLeft != null ? (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <CalendarDays className="h-3 w-3" />
              {daysLeft} day{daysLeft === 1 ? "" : "s"} left
            </span>
          ) : null}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {campaign.title}
        </h1>
        {campaign.summary ? (
          <p className="text-lg text-slate-600">{campaign.summary}</p>
        ) : null}
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold text-slate-900">
              <Money cents={campaign.currentAmount} currency={campaign.currency} />
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
          <Link href={`/campaigns/${campaign._id}/donate`}>
            <Button size="lg" className="w-full">
              Donate to this campaign
            </Button>
          </Link>
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
      <h2 className="mb-3 text-xl font-semibold text-slate-900">The story</h2>
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
      <h2 className="mb-3 text-xl font-semibold text-slate-900">Sponsors</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {sponsors.map((s) => (
          <Card key={s._id}>
            <CardHeader>
              <div className="flex items-center gap-3">
                {s.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.logoUrl}
                    alt={s.corporateName}
                    className="h-10 w-auto rounded bg-white object-contain p-1"
                  />
                ) : (
                  <div className="h-10 w-10 rounded bg-slate-100" />
                )}
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">{s.corporateName}</CardTitle>
                  <CardDescription className="capitalize">
                    {s.type.replace(/_/g, " ")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            {s.message ? <CardContent className="pt-0 text-sm text-slate-600">{s.message}</CardContent> : null}
            {s.amount != null ? (
              <CardContent className="border-t border-slate-100 pt-3">
                <Money cents={s.amount} currency={s.currency} />
              </CardContent>
            ) : null}
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
}) {
  if (donations.length === 0) {
    return (
      <section>
        <h2 className="mb-3 text-xl font-semibold text-slate-900">Recent donors</h2>
        <p className="text-sm text-slate-500">No donations yet. Be the first to give.</p>
      </section>
    );
  }
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Recent donors</h2>
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
