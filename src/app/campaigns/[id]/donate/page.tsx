import type { Metadata } from "next";
import { DonateFlow } from "@/components/donate-flow";

type Params = Promise<{ id: string }>;

export const metadata: Metadata = {
  title: "Donate — Drop of Water",
  description: "Make a donation to support a water-infrastructure campaign.",
};

export default async function DonatePage({ params }: { params: Params }) {
  const { id } = await params;
  return <DonateFlow campaignId={id} />;
}
