"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { donationsApi } from "@/lib/api/donations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { HIGH_VALUE_DONATION_THRESHOLD } from "@/lib/enums";

type Status = "pending" | "completed" | "manual_review" | "failed" | "not_found";

function statusFromParams(raw: string | null): Status {
  if (raw === "success" || raw === "pending") return "pending";
  if (raw === "manual" || raw === "manual_review") return "manual_review";
  if (raw === "failed" || raw === "cancelled") return "failed";
  if (raw === "completed") return "completed";
  return "pending";
}

export function DonateReturn({ campaignId }: { campaignId: string }) {
  const search = useSearchParams();
  const txRef = search.get("tx_ref") ?? "";
  const initialStatus = statusFromParams(search.get("status"));
  const isManual = initialStatus === "manual_review";

  const [settled] = useState<Status>(initialStatus);
  const [pollCount, setPollCount] = useState(0);

  useQuery({
    queryKey: ["donations", "campaign", campaignId, "poll"],
    queryFn: () => donationsApi.forCampaign(campaignId, { page: 1, limit: 50 }),
    refetchInterval: () => {
      if (pollCount > 20) return false;
      return 2_000;
    },
    enabled: !isManual && settled === "pending",
  });

  useEffect(() => {
    if (settled !== "pending") return;
    const id = setInterval(() => setPollCount((c) => c + 1), 2_000);
    return () => clearInterval(id);
  }, [settled]);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <Link
        href={`/campaigns/${campaignId}`}
        className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <span aria-hidden>←</span> Back to campaign
      </Link>

      <ReturnPanel status={settled} amount={search.get("amount")} txRef={txRef} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What happens next?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700">
          {settled === "completed" ? (
            <p>
              Your gift has been confirmed by the payment gateway. It now counts
              toward the campaign total and will appear in your donor history.
            </p>
          ) : settled === "manual_review" ? (
            <p>
              Your payment has been captured. Our finance team will review the
              gift and confirm it shortly. You will be notified when the review
              is complete.
            </p>
          ) : settled === "failed" ? (
            <p>
              The gateway reported the payment as failed. No funds were
              captured. You can try again or pick a different payment method.
            </p>
          ) : (
            <p>
              We are waiting for the payment gateway to confirm your gift. This
              usually takes a few seconds. Please don&rsquo;t close this tab.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link href={`/campaigns/${campaignId}`}>
          <Button variant="outline">Back to campaign</Button>
        </Link>
        {settled === "failed" ? (
          <Link href={`/campaigns/${campaignId}/donate`}>
            <Button>Try again</Button>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function ReturnPanel({
  status,
  amount,
  txRef,
}: {
  status: Status;
  amount: string | null;
  txRef: string;
}) {
  if (status === "completed") {
    return (
      <Panel
        tone="success"
        icon={<CheckCircle2 className="h-6 w-6" />}
        title="Donation confirmed"
        body="Thank you. Your gift has settled and is on its way to the field."
      />
    );
  }
  if (status === "manual_review") {
    return (
      <Panel
        tone="warning"
        icon={<AlertTriangle className="h-6 w-6" />}
        title="Payment received, being reviewed"
        body={`Gifts at or above ${(HIGH_VALUE_DONATION_THRESHOLD / 100).toLocaleString()} ETB are reviewed by our finance team after capture. You will be notified when confirmed.`}
      />
    );
  }
  if (status === "failed") {
    return (
      <Panel
        tone="danger"
        icon={<XCircle className="h-6 w-6" />}
        title="Payment failed"
        body="No funds were captured. Please try again or pick a different payment method."
      />
    );
  }
  return (
    <Panel
      tone="info"
      icon={<Loader2 className="h-6 w-6 animate-spin" />}
      title="Processing your donation…"
      body={
        amount ? (
          <span>
            We&rsquo;re confirming your gift of{" "}
            <Money cents={Math.round(Number(amount) * 100)} currency="ETB" />.
          </span>
        ) : (
          <span>Waiting for the gateway to settle the payment.</span>
        )
      }
      extra={<p className="text-xs text-slate-500">Reference: {txRef || "—"}</p>}
    />
  );
}

function Panel({
  tone,
  icon,
  title,
  body,
  extra,
}: {
  tone: "success" | "warning" | "danger" | "info";
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  extra?: React.ReactNode;
}) {
  const toneClasses: Record<typeof tone, string> = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    danger: "border-rose-200 bg-rose-50 text-rose-900",
    info: "border-sky-200 bg-sky-50 text-sky-900",
  };
  return (
    <div className={`rounded-2xl border p-6 ${toneClasses[tone]}`}>
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      </div>
      <div className="text-sm opacity-90">{body}</div>
      {extra ? <div className="mt-3">{extra}</div> : null}
    </div>
  );
}
