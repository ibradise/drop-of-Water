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
    <Suspense
      fallback={
        <div className="mx-auto flex max-w-xl flex-col gap-6">
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      }
    >
      <DonateReturn campaignId={id} />
    </Suspense>
  );
}
