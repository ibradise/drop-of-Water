"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { use, useState } from "react";

export default function AdminDonationReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ReviewInner id={id} />;
}

function ReviewInner({ id }: { id: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const donationQ = useQuery({
    queryKey: ["donations", "get", id],
    queryFn: () => adminApi.donations({ page: 1, limit: 50 }).then((r) => {
      const found = r.data.find((d) => d._id === id);
      if (!found) throw new ApiError(404, "Donation not found", null);
      return found;
    }),
  });

  const review = useMutation({
    mutationFn: ({ approve, note }: { approve: boolean; note?: string }) =>
      adminApi.reviewDonation(id, { approve, note }),
    onSuccess: (_, { approve }) => {
      toast.success(approve ? "Donation approved." : "Donation rejected.");
      qc.invalidateQueries({ queryKey: ["admin", "donations"] });
      qc.invalidateQueries({ queryKey: ["admin", "review-queue"] });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      qc.invalidateQueries({ queryKey: ["donations"] });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      setDecision(null);
      router.push("/admin/donations");
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.messages[0] : "Couldn't record the decision.";
      toast.error(msg);
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
                ? "Couldn't load this donation"
                : isUnexpected
                  ? "Data looked unexpected"
                  : "Couldn't load this donation"}
            </CardTitle>
            <CardDescription>
              {is404
                ? "It may have been deleted, or it sits beyond the first page of results."
                : isUnexpected
                  ? "Please refresh; if it keeps happening, contact support."
                  : "Something went wrong talking to the API."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => donationQ.refetch()}>
              Retry
            </Button>
            <Link href="/admin/donations">
              <Button variant="outline">Back to donations</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const d = donationQ.data;
  if (!d) return null;

  const isCaptured = d.paidAt !== null;
  const approveLabel = isCaptured ? "Approve and credit" : "Approve (awaiting capture)";
  const rejectLabel = isCaptured ? "Reject and refund" : "Reject and mark failed";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link
        href="/admin/donations"
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        ← Back to donations
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Badge
            tone={
              d.status === "manual_review"
                ? "warning"
                : d.status === "completed"
                  ? "success"
                  : d.status === "refunded" || d.status === "failed"
                    ? "danger"
                    : "info"
            }
            className="capitalize"
          >
            {d.status.replace(/_/g, " ")}
          </Badge>
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
        <Link href="/admin/donations">
          <Button variant="ghost">Cancel</Button>
        </Link>
        <Button
          variant="outline"
          className="border-rose-300 text-rose-700 hover:bg-rose-50"
          onClick={() => setDecision({ approve: false })}
        >
          <XCircle className="h-4 w-4" />
          {rejectLabel}
        </Button>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => setDecision({ approve: true })}
        >
          <CheckCircle2 className="h-4 w-4" />
          {approveLabel}
        </Button>
      </div>

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
