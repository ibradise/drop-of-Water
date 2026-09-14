import Link from "next/link";
import { CalendarDays, Droplets, Users } from "lucide-react";
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
  const percent =
    campaign.goalAmount > 0
      ? Math.min(100, Math.round((campaign.currentAmount / campaign.goalAmount) * 100))
      : 0;
  return (
    <Link
      href={`/campaigns/${campaign._id}`}
      className="group block focus:outline-none"
    >
      <Card className="h-full overflow-hidden">
        <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
          {campaign.photos[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={campaign.photos[0]}
              alt={campaign.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200/50">
              <Droplets className="h-10 w-10 text-slate-300" />
            </div>
          )}
          <div className="absolute left-3 top-3">
            <CampaignStatusBadge status={campaign.status} />
          </div>
          {daysLeft != null && campaign.status === "active" ? (
            <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur">
              <CalendarDays className="h-3 w-3" />
              {daysLeft} day{daysLeft === 1 ? "" : "s"} left
            </div>
          ) : null}
        </div>
        <CardHeader>
          <CardTitle className="line-clamp-2 group-hover:text-sky-700">
            {campaign.title}
          </CardTitle>
          {campaign.summary ? (
            <CardDescription className="line-clamp-2">
              {campaign.summary}
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <ProgressBar value={campaign.currentAmount} max={campaign.goalAmount} />
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold text-slate-900">
              <Money cents={campaign.currentAmount} currency={campaign.currency} />
            </span>
            <span className="text-xs text-slate-500">
              {percent}% of{" "}
              <Money cents={campaign.goalAmount} currency={campaign.currency} />
            </span>
          </div>
          {campaign.participants.length > 0 ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Users className="h-3.5 w-3.5" />
              {campaign.participants.length} fundraiser
              {campaign.participants.length === 1 ? "" : "s"}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}
