"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { CalendarDays, ChevronRight, FileText, Heart } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/api/admin";
import { Card, CardContent, EmptyState } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Money } from "@/components/ui/money";

export default function AdminReviewQueuePage() {
  const qc = useQueryClient();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const queueQ = useQuery({
    queryKey: ["admin", "review-queue", { page: 1 }],
    queryFn: () => adminApi.reviewQueue({ page: 1, limit: 50 }),
  });

  const approveUpdate = useMutation({
    mutationFn: (id: string) => adminApi.approveImpactUpdate(id, {}),
    onSuccess: () => {
      toast.success("This update is now published and visible in public feeds.");
      qc.invalidateQueries({ queryKey: ["admin", "review-queue"] });
      qc.invalidateQueries({ queryKey: ["impact-updates"] });
    },
    onError: (err) => {
      console.error("Approve impact update failed:", err);
      toast.error("We couldn't publish this update. Please try again.");
    },
  });
  const rejectUpdate = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.rejectImpactUpdate(id, { reason }),
    onSuccess: () => {
      toast.success("This update was rejected. The contributor has been notified.");
      setRejectId(null);
      qc.invalidateQueries({ queryKey: ["admin", "review-queue"] });
      qc.invalidateQueries({ queryKey: ["impact-updates"] });
    },
    onError: (err) => {
      console.error("Reject impact update failed:", err);
      toast.error("We couldn't reject this update. Please try again.");
    },
  });

  if (queueQ.isLoading) return <div className="h-64 animate-pulse rounded-xl bg-slate-100" />;
  if (queueQ.isError)
    return (
      <EmptyState
        title="We couldn't load the review queue"
        description="Something went wrong on our side. Please try again. If it keeps failing, contact support."
        action={
          <Button variant="outline" onClick={() => queueQ.refetch()}>
            Retry
          </Button>
        }
      />
    );
  if (!queueQ.data) return null;
  const donations = queueQ.data.donations.data;
  const updates = queueQ.data.impactUpdates.data;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Heart className="h-4 w-4" />
            Donations awaiting review
          </h2>
          <Link
            href="/admin/donations"
            className="text-xs text-sky-700 hover:underline"
          >
            All donations
          </Link>
        </div>
        {donations.length === 0 ? (
          <EmptyState
            title="No donations awaiting review"
            description="New gifts that need a human look will appear here."
          />
        ) : (
          <ul className="space-y-2">
            {donations.map((d) => (
              <li key={d._id}>
                <Link
                  href={`/admin/donations/${d._id}/review?from=/admin/review-queue`}
                  className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <Card className="transition-shadow hover:shadow-md">
                    <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Badge tone="warning">manual review</Badge>
                          {d.requiresManualReview ? (
                            <Badge tone="warning">high-value</Badge>
                          ) : null}
                        </div>
                        <div className="text-sm font-medium text-slate-900">
                          {d.donorSnapshot?.name ?? "Anonymous"} ·{" "}
                          <span className="text-slate-500 capitalize">{d.paymentMethod}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <CalendarDays className="h-3 w-3" />
                          {new Date(d.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Money cents={d.amount} currency={d.currency} className="text-base" />
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <FileText className="h-4 w-4" />
            Impact updates awaiting review
          </h2>
          <Link
            href="/admin/impact-updates/pending"
            className="text-xs text-sky-700 hover:underline"
          >
            All pending
          </Link>
        </div>
        {updates.length === 0 ? (
          <EmptyState
            title="No updates awaiting review"
            description="Field updates submitted by contributors will appear here."
          />
        ) : (
          <ul className="space-y-2">
            {updates.map((u) => (
              <li key={u._id}>
                <Card>
                  <CardContent className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Badge tone="info">submitted</Badge>
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{u.title}</div>
                    <p className="line-clamp-2 whitespace-pre-line text-xs text-slate-600">
                      {u.content}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(u.createdAt).toLocaleString()}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => approveUpdate.mutate(u._id)}
                        isLoading={approveUpdate.isPending && approveUpdate.variables === u._id}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-rose-300 text-rose-700 hover:bg-rose-50"
                        onClick={() => setRejectId(u._id)}
                        isLoading={rejectUpdate.isPending && rejectUpdate.variables?.id === u._id}
                      >
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={rejectId !== null}
        onOpenChange={(open) => {
          if (!open) setRejectId(null);
        }}
        onConfirm={(reason) => {
          if (rejectId) rejectUpdate.mutate({ id: rejectId, reason });
        }}
        title="Reject this update?"
        description="The contributor is notified and the update stays out of public feeds."
        confirmLabel="Reject"
        danger
        reasonLabel="Reason (optional)"
        reasonPlaceholder="What should the contributor fix?"
        reasonMaxLength={1000}
        isPending={rejectUpdate.isPending}
      />
    </div>
  );
}
