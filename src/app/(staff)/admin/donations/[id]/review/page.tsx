"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/api/admin";
import { donationsApi } from "@/lib/api/donations";
import { ApiError } from "@/lib/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DonationStatusBadge } from "@/components/ui/status-badges";
import { Money } from "@/components/ui/money";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Suspense, use, useState } from "react";

export default function AdminDonationReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={<div className="h-64 animate-pulse rounded-xl bg-slate-100" />}
    >
      <ReviewInner params={params} />
    </Suspense>
  );
}

function ReviewInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const search = useSearchParams();
  const from =
    search.get("from") === "/admin/review-queue"
      ? "/admin/review-queue"
      : "/admin/donations";
  const qc = useQueryClient();
  const donationQ = useQuery({
    queryKey: ["donations", "get", id],
    queryFn: () => donationsApi.get(id),
    retry: (count, err) => !(err instanceof ApiError && err.statusCode === 404) && count < 2,
  });

  const review = useMutation({
    mutationFn: ({ approve, note }: { approve: boolean; note?: string }) =>
      adminApi.reviewDonation(id, { approve, note }),
    onSuccess: (_, { approve }) => {
      toast.success(
        approve
          ? "Donation approved and credited toward the campaign total."
          : "Donation rejected and marked for refund. Remember to issue the gateway refund manually.",
      );
      qc.invalidateQueries({ queryKey: ["admin", "donations"] });
      qc.invalidateQueries({ queryKey: ["admin", "review-queue"] });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      qc.invalidateQueries({ queryKey: ["donations"] });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      setDecision(null);
      router.push(from);
    },
    onError: (err) => {
      console.error("Record donation decision failed:", err);
      toast.error("We couldn't record your decision. Please try again.");
    },
  });
  const [decision, setDecision] = useState<null | { approve: boolean }>(null);

  if (donationQ.isLoading) {
    return <div className="h-64 animate-pulse rounded-xl bg-slate-100" />;
  }
  if (donationQ.isError) {
    const is404 = donationQ.error instanceof ApiError && donationQ.error.statusCode === 404;
    const isUnexpected = !(donationQ.error instanceof ApiError);
    return (
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>
              {is404
                ? "We couldn't find this donation"
                : isUnexpected
                  ? "This looks different than expected"
                  : "We couldn't load this donation"}
            </CardTitle>
            <CardDescription>
              {is404
                ? "It may have been removed or the link is wrong. Try going back to the donations list."
                : isUnexpected
                  ? "Please refresh the page to try again. If it keeps happening, contact support."
                  : "Something went wrong on our side. Please try again. If it keeps happening, contact support."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => donationQ.refetch()}>
              Retry
            </Button>
            <Link href={from}>
              <Button variant="outline">
                {from === "/admin/review-queue" ? "Back to review queue" : "Back to donations"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const d = donationQ.data;
  if (!d) return null;

  const reviewable = d.status === "manual_review";

  const isCaptured = d.paidAt !== null;
  const approveLabel = isCaptured ? "Approve and credit" : "Approve (awaiting capture)";
  const rejectLabel = isCaptured ? "Reject and refund" : "Reject and mark failed";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link
        href={from}
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        ← {from === "/admin/review-queue" ? "Back to review queue" : "Back to donations"}
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <DonationStatusBadge status={d.status} />
          {d.requiresManualReview ? <Badge tone="warning">high-value</Badge> : null}
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          {d.donorSnapshot?.name ?? "Anonymous"} ·{" "}
          <span className="text-slate-500 capitalize">{d.paymentMethod}</span>
        </h1>
        <div className="text-2xl font-semibold text-sky-700">
          <Money cents={d.amount} currency={d.currency} />
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What this decision does</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-slate-700">
          {isCaptured ? (
            <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-amber-900">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <p>
                <strong>Funds already captured.</strong> The donor has been charged.{" "}
                <strong>Approve</strong> credits the campaign and project totals.{" "}
                <strong>Reject</strong> records a refund owed to the donor (the
                actual gateway refund is still manual).
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-md bg-sky-50 p-3 text-sky-900">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <p>
                <strong>Funds not yet captured.</strong> <strong>Approve</strong>{" "}
                returns the donation to the pending queue, awaiting gateway
                confirmation. <strong>Reject</strong> marks it failed and
                reverses no totals.
              </p>
            </div>
          )}
          {d.message ? (
            <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
              <span className="text-xs uppercase tracking-wide text-slate-500">
                Donor message
              </span>
              <p className="mt-1 whitespace-pre-line">{d.message}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <Link href={from}>
          <Button variant="ghost">Cancel</Button>
        </Link>
        <Button
          variant="outline"
          className="border-rose-300 text-rose-700 hover:bg-rose-50"
          onClick={() => setDecision({ approve: false })}
          disabled={!reviewable}
        >
          <XCircle className="h-4 w-4" />
          {rejectLabel}
        </Button>
        <Button
          onClick={() => setDecision({ approve: true })}
          disabled={!reviewable}
        >
          <CheckCircle2 className="h-4 w-4" />
          {approveLabel}
        </Button>
      </div>
      {!reviewable ? (
        <p className="text-xs text-slate-500">
          This donation is {d.status.replace(/_/g, " ")} — only gifts awaiting
          review can be decided here.
        </p>
      ) : null}

      <ConfirmDialog
        open={decision !== null}
        onOpenChange={(open) => {
          if (!open) setDecision(null);
        }}
        onConfirm={(note) => {
          if (decision) review.mutate({ approve: decision.approve, note: note || undefined });
        }}
        title={decision?.approve ? approveLabel : rejectLabel}
        description={
          decision?.approve
            ? isCaptured
              ? "This credits the campaign and project totals."
              : "This returns the donation to the pending queue."
            : isCaptured
              ? "This records a refund owed to the donor. The gateway refund itself stays manual."
              : "This marks the donation failed and reverses no totals."
        }
        confirmLabel={decision?.approve ? "Approve" : "Reject"}
        danger={!decision?.approve}
        reasonLabel="Note for the record (optional)"
        reasonPlaceholder="Why was this decision made?"
        reasonMaxLength={500}
        isPending={review.isPending}
      />
    </div>
  );
}
