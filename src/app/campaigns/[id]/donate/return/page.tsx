import type { Metadata } from "next";
import { Suspense } from "react";
import { DonateReturn } from "@/components/donate-return";

type Params = Promise<{ id: string }>;

export const metadata: Metadata = {
  title: "Processing your donation — Drop of Water",
  description: "Waiting for the payment gateway to settle your gift.",
};

export default async function DonateReturnPage({ params }: { params: Params }) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Loading…</div>}>
      <DonateReturn campaignId={id} />
    </Suspense>
  );
}
