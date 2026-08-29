import type { Metadata } from "next";
import { CampaignsList } from "@/components/campaigns-list";
import { CAMPAIGN_STATUSES, type CampaignStatus } from "@/lib/enums";

export const metadata: Metadata = {
  title: "Campaigns — Drop of Water",
  description: "Browse active fundraising campaigns for water-infrastructure projects.",
};

type SearchParams = Promise<{ status?: string | string[] }>;

export default async function CampaignsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const initialStatus = (CAMPAIGN_STATUSES as readonly string[]).includes(raw ?? "")
    ? (raw as CampaignStatus)
    : null;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Campaigns</h1>
        <p className="max-w-2xl text-slate-600">
          Active fundraisers by students, chapters, volunteers, and corporate partners. Pick one
          to read the story, see sponsors, and donate.
        </p>
      </header>
      <CampaignsList initialStatus={initialStatus} />
    </div>
  );
}
