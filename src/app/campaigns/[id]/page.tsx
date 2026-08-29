import type { Metadata } from "next";
import { CampaignDetail } from "@/components/campaign-detail";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Campaign ${id} — Drop of Water`,
    description: "Campaign details, sponsors, and the latest from the field.",
  };
}

export default async function CampaignPage({ params }: { params: Params }) {
  const { id } = await params;
  return <CampaignDetail campaignId={id} />;
}
