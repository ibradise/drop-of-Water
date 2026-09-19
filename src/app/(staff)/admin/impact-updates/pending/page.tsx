"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays } from "lucide-react";
import { adminApi } from "@/lib/api/admin";
import { Card, CardContent, EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";

export default function AdminPendingUpdatesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 20;

  const q = useQuery({
    queryKey: ["admin", "impact-updates", "pending", { page }],
    queryFn: () => adminApi.pendingImpactUpdates({ page, limit }),
  });

  const approve = useMutation({
    mutationFn: (id: string) => adminApi.approveImpactUpdate(id, {}),
    onSuccess: () => {
      toast.success("This update is now published and visible in public feeds.");
      qc.invalidateQueries({ queryKey: ["admin", "impact-updates"] });
      qc.invalidateQueries({ queryKey: ["admin", "review-queue"] });
      qc.invalidateQueries({ queryKey: ["impact-updates"] });
    },
    onError: (err) => {
      console.error("Approve impact update failed:", err);
      toast.error("We couldn't publish this update. Please try again.");
    },
  });
  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.rejectImpactUpdate(id, { reason }),
    onSuccess: () => {
      toast.success("This update was rejected. The contributor has been notified.");
      setRejectId(null);
      qc.invalidateQueries({ queryKey: ["admin", "impact-updates"] });
      qc.invalidateQueries({ queryKey: ["admin", "review-queue"] });
      qc.invalidateQueries({ queryKey: ["impact-updates"] });
    },
    onError: (err) => {
      console.error("Reject impact update failed:", err);
      toast.error("We couldn't reject this update. Please try again.");
    },
  });
  const [rejectId, setRejectId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">
          Impact updates awaiting approval
        </h2>
        <p className="text-sm text-slate-500">
          Contributors submit field updates; managers approve or reject.
        </p>
      </header>

      {q.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : q.isError ? (
        <EmptyState
          title="We couldn't load pending updates"
          description="Something went wrong on our side. Please try again. If it keeps failing, contact support."
          action={
            <Button variant="outline" onClick={() => q.refetch()}>
              Retry
            </Button>
          }
        />
      ) : !q.data ? null : q.data.data.length === 0 ? (
        <EmptyState title="No pending updates" description="The queue is clear." />
      ) : (
        <ul className="space-y-2">
          {q.data.data.map((u) => (
            <li key={u._id}>
              <Card>
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Badge tone="info">submitted</Badge>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">{u.title}</h3>
                  <p className="whitespace-pre-line text-xs text-slate-600">
                    {u.content}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <CalendarDays className="h-3 w-3" />
                    {new Date(u.createdAt).toLocaleString()}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => approve.mutate(u._id)}
                      isLoading={approve.isPending && approve.variables === u._id}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-rose-300 text-rose-700 hover:bg-rose-50"
                      onClick={() => setRejectId(u._id)}
                      isLoading={reject.isPending && reject.variables?.id === u._id}
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

      {q.data ? (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-sm text-slate-600">
          <span>
            {q.data.meta.total === 0
              ? "No results"
              : `Showing ${(q.data.meta.page - 1) * q.data.meta.limit + 1}–${Math.min(
                  q.data.meta.total,
                  q.data.meta.page * q.data.meta.limit,
                )} of ${q.data.meta.total}`}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!q.data.meta.hasPrevPage}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!q.data.meta.hasNextPage}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={rejectId !== null}
        onOpenChange={(open) => {
          if (!open) setRejectId(null);
        }}
        onConfirm={(reason) => {
          if (rejectId) reject.mutate({ id: rejectId, reason });
        }}
        title="Reject this update?"
        description="The contributor is notified and the update stays out of public feeds."
        confirmLabel="Reject"
        danger
        reasonLabel="Reason (optional)"
        reasonPlaceholder="What should the contributor fix?"
        reasonMaxLength={1000}
        isPending={reject.isPending}
      />
    </div>
  );
}
