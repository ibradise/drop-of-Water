import Link from "next/link";
import { CalendarDays, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { CampaignStatusBadge } from "@/components/ui/status-badges";
import { ProgressBar } from "@/components/progress-bar";
import { useNow } from "@/lib/use-now";
import type { Campaign } from "@/lib/schemas/campaign";

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const end = campaign.endDate ? new Date(campaign.endDate) : null;
  const now = useNow();
  const daysLeft = end ? Math.max(0, Math.ceil((end.getTime() - now) / 86_400_000)) : null;
  return (
    <Link href={`/campaigns/${campaign._id}`} className="group block">
      <Card className="h-full transition-shadow group-hover:shadow-md">
        {campaign.photos[0] ? (
          <div className="aspect-[16/9] overflow-hidden rounded-t-xl bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={campaign.photos[0]}
              alt={campaign.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
            />
          </div>
        ) : (
          <div className="aspect-[16/9] rounded-t-xl bg-gradient-to-br from-emerald-100 to-sky-200" />
        )}
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CampaignStatusBadge status={campaign.status} />
            {daysLeft != null ? (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <CalendarDays className="h-3 w-3" />
                {daysLeft} day{daysLeft === 1 ? "" : "s"} left
              </span>
            ) : null}
          </div>
          <CardTitle className="line-clamp-2 group-hover:text-sky-700">{campaign.title}</CardTitle>
          {campaign.summary ? (
            <CardDescription className="line-clamp-2">{campaign.summary}</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <ProgressBar value={campaign.currentAmount} max={campaign.goalAmount} />
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium text-slate-900">
              <Money cents={campaign.currentAmount} currency={campaign.currency} />
            </span>
            <span className="text-xs text-slate-500">
              of <Money cents={campaign.goalAmount} currency={campaign.currency} />
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            {campaign.participants.length > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" />
                {campaign.participants.length} fundraiser
                {campaign.participants.length === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
