"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Hourglass, SearchX, XCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { donationsApi } from "@/lib/api/donations";
import type { Donation } from "@/lib/schemas/donation";
import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { HIGH_VALUE_DONATION_THRESHOLD } from "@/lib/enums";
import { useNow } from "@/lib/use-now";

type Status =
  | "pending"
  | "completed"
  | "manual_review"
  | "failed"
  | "not_found"
  | "invalid"
  | "timeout";

function statusFromParams(raw: string | null): Status {
  if (raw === "success" || raw === "pending") return "pending";
  if (raw === "manual" || raw === "manual_review") return "manual_review";
  if (raw === "failed" || raw === "cancelled") return "failed";
  if (raw === "completed") return "completed";
  return "pending";
}

function matchDonation(
  txRef: string,
  donations: Donation[] | undefined,
): Donation | undefined {
  if (txRef.length === 0 || !donations) return undefined;
  return donations.find((d) => d.transactionId && d.transactionId === txRef);
}

function settledFromMatch(initial: Status, match: Donation | undefined): Status {
  if (initial !== "pending" || !match) return initial;
  if (match.status === "completed") return "completed";
  if (match.status === "manual_review") return "manual_review";
  if (match.status === "failed") return "failed";
  return initial;
}

export function DonateReturn({ campaignId }: { campaignId: string }) {
  const search = useSearchParams();
  const { state } = useAuth();
  const isAuthed = state.status === "authenticated";
  const txRef = search.get("tx_ref") ?? "";
  const hasTxRef = txRef.length > 0;
  const initialStatus = statusFromParams(search.get("status"));
  const isManual = initialStatus === "manual_review";

  const stopPolling = (query: { state: { dataUpdateCount: number; data?: unknown } }) => {
    if (query.state.dataUpdateCount >= 20) return true;
    const match = matchDonation(txRef, (query.state.data as { data?: Donation[] } | undefined)?.data);
    return !!match && match.status !== "pending";
  };

  const [mountedAt] = useState(() => Date.now());
  const now = useNow(2000);

  const pollQ = useQuery({
    queryKey: ["donations", "campaign", campaignId, "poll"],
    queryFn: () => donationsApi.forCampaign(campaignId, { page: 1, limit: 50 }),
    refetchInterval: (query) => (stopPolling(query) ? false : 2_000),
    enabled: !isManual && initialStatus === "pending" && hasTxRef,
  });

  const mineQ = useQuery({
    queryKey: ["donations", "me", "poll"],
    queryFn: () => donationsApi.mine({ page: 1, limit: 50 }),
    refetchInterval: (query) => (stopPolling(query) ? false : 2_000),
    enabled: isAuthed && !isManual && initialStatus === "pending" && hasTxRef,
  });

  const match =
    matchDonation(txRef, mineQ.data?.data) ?? matchDonation(txRef, pollQ.data?.data);
  const settled = settledFromMatch(initialStatus, match);

  // Never assert settlement without evidence: a bare ?status=completed link
  // (typed or forwarded) with no transaction reference proves nothing.
  const showInvalid = !hasTxRef && initialStatus === "completed";
  // Give the gateway ~40s (the ticker re-renders and re-checks this).
  const timedOut = hasTxRef && settled === "pending" && now - mountedAt > 40_000;
  const display: Status = showInvalid ? "invalid" : timedOut ? "timeout" : settled;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <Link
        href={`/campaigns/${campaignId}`}
        className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <span aria-hidden>←</span> Back to campaign
      </Link>

      <ReturnPanel status={display} amount={search.get("amount")} txRef={txRef} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What happens next?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700">
          {display === "completed" ? (
            <p>
              Your gift has been confirmed by the payment gateway. It now counts
              toward the campaign total and will appear in your donor history.
            </p>
          ) : display === "manual_review" ? (
            <p>
              Your payment has been captured. Our finance team will review the
              gift and confirm it shortly. You will be notified when the review
              is complete.
            </p>
          ) : display === "failed" ? (
            <p>
              The gateway reported the payment as failed. No funds were
              captured. You can try again or pick a different payment method.
            </p>
          ) : display === "invalid" ? (
            <p>
              This link doesn&apos;t identify a payment, so there&apos;s nothing
              to confirm. If you just paid, please wait a moment and check your
              donation history.
            </p>
          ) : display === "timeout" ? (
            <p>
              We couldn&apos;t confirm your gift yet — gateways sometimes take a
              few minutes. Your money is safe: check your donation history or
              try again.
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
        {display === "failed" || display === "timeout" || display === "invalid" ? (
          <Link href={`/campaigns/${campaignId}/donate`}>
            <Button>Try again</Button>
          </Link>
        ) : null}
        {isAuthed && (display === "timeout" || display === "invalid") ? (
          <Link href="/me/donations">
            <Button variant="outline">My donations</Button>
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
  if (status === "invalid") {
    return (
      <Panel
        tone="warning"
        icon={<SearchX className="h-6 w-6" />}
        title="We couldn't verify this payment"
        body="This link doesn't identify a gift. If you just donated, give it a minute, then check your donation history or try again."
      />
    );
  }
  if (status === "timeout") {
    return (
      <Panel
        tone="warning"
        icon={<Hourglass className="h-6 w-6" />}
        title="Still confirming…"
        body="The gateway hasn't confirmed yet. Please don't pay twice — check your donation history in a few minutes."
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
      extra={<p className="break-all text-xs text-slate-500">Reference: {txRef || "—"}</p>}
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
