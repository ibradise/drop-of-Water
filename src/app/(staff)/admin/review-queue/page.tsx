"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { CalendarDays, ChevronRight, Clock, FileText, Heart } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/api/admin";
import { Card, CardContent, EmptyState } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";

export default function AdminReviewQueuePage() {
  const qc = useQueryClient();
  const queueQ = useQuery({
    queryKey: ["admin", "review-queue", { page: 1 }],
    queryFn: () => adminApi.reviewQueue({ page: 1, limit: 50 }),
  });

  const approveUpdate = useMutation({
    mutationFn: (id: string) => adminApi.approveImpactUpdate(id, {}),
    onSuccess: () => {
      toast.success("Published.");
      qc.invalidateQueries({ queryKey: ["admin", "review-queue"] });
    },
    onError: () => toast.error("Couldn't approve."),
  });
  const rejectUpdate = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.rejectImpactUpdate(id, { reason }),
    onSuccess: () => {
      toast.success("Rejected.");
      qc.invalidateQueries({ queryKey: ["admin", "review-queue"] });
    },
    onError: () => toast.error("Couldn't reject."),
  });

  if (queueQ.isLoading) return <div className="h-64 animate-pulse rounded-xl bg-slate-100" />;
  if (queueQ.isError) return <EmptyState title="Couldn't load the review queue" />;
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
          <Card>
            <CardContent className="flex items-center gap-2 py-6 text-sm text-slate-500">
              <Clock className="h-4 w-4" />
              No donations are awaiting review.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2">
            {donations.map((d) => (
              <li key={d._id}>
                <Link
                  href={`/admin/donations/${d._id}/review`}
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
          <Card>
            <CardContent className="flex items-center gap-2 py-6 text-sm text-slate-500">
              <Clock className="h-4 w-4" />
              No impact updates are awaiting review.
            </CardContent>
          </Card>
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
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => approveUpdate.mutate(u._id)}
                        isLoading={approveUpdate.isPending}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-rose-300 text-rose-700 hover:bg-rose-50"
                        onClick={() => {
                          const reason =
                            window.prompt("Rejection reason (optional, ≤1000 chars):", "") ?? "";
                          rejectUpdate.mutate({ id: u._id, reason });
                        }}
                        isLoading={rejectUpdate.isPending}
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
    </div>
  );
}
