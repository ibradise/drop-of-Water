"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, ChevronDown, ChevronRight, ChevronUp, Filter, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/api/admin";
import { campaignsApi } from "@/lib/api/campaigns";
import { Card, CardContent, EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pager } from "@/components/pager";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { formatDate } from "@/lib/format-date";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { CampaignStatusBadge } from "@/components/ui/status-badges";
import { CAMPAIGN_STATUSES, type CampaignStatus } from "@/lib/enums";
import { useStaffCapabilities } from "@/lib/staff-capabilities";

export default function AdminCampaignsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Loading…</div>}>
      <AdminCampaignsInner />
    </Suspense>
  );
}

function AdminCampaignsInner() {
  const search = useSearchParams();
  const caps = useStaffCapabilities();
  const rawStatus = search.get("status");
  const initialStatus = (CAMPAIGN_STATUSES as readonly string[]).includes(rawStatus ?? "")
    ? (rawStatus as CampaignStatus)
    : null;
  const [status, setStatus] = useState<CampaignStatus | null>(initialStatus);
  const [page, setPage] = useState(1);
  const limit = 20;
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["admin", "campaigns", { status, page }],
    queryFn: () =>
      adminApi.campaigns({
        page,
        limit,
        status: status ?? undefined,
      }),
  });

  const applyFilter = (next: CampaignStatus | null) => {
    setStatus(next);
    setPage(1);
  };

  const approve = useMutation({
    mutationFn: (id: string) => campaignsApi.approve(id),
    onSuccess: () => {
      toast.success("This campaign is now live and visible to everyone.");
      qc.invalidateQueries({ queryKey: ["admin", "campaigns"] });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      qc.invalidateQueries({ queryKey: ["admin", "review-queue"] });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      setConfirmAction(null);
    },
    onError: (err) => {
      console.error("Approve campaign failed:", err);
      toast.error("We couldn't approve this campaign. Please try again.");
    },
  });

  const reject = useMutation({
    mutationFn: (id: string) => campaignsApi.reject(id),
    onSuccess: () => {
      toast.success("This campaign was sent back to draft. The creator can edit and resubmit it.");
      qc.invalidateQueries({ queryKey: ["admin", "campaigns"] });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      qc.invalidateQueries({ queryKey: ["admin", "review-queue"] });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      setConfirmAction(null);
    },
    onError: (err) => {
      console.error("Reject campaign failed:", err);
      toast.error("We couldn't send this campaign back to draft. Please try again.");
    },
  });
  const [confirmAction, setConfirmAction] = useState<
    null | { id: string; title: string; approve: boolean }
  >(null);
  const [managingId, setManagingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "campaigns"] });
    qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    qc.invalidateQueries({ queryKey: ["admin", "review-queue"] });
    qc.invalidateQueries({ queryKey: ["campaigns"] });
  };

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      campaignsApi.update(id, body as never),
    onSuccess: () => {
      toast.success("Campaign changes have been saved.");
      setManagingId(null);
      refresh();
    },
    onError: (err) => {
      console.error("Update campaign failed:", err);
      toast.error("We couldn't save these changes. Please try again.");
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => campaignsApi.remove(id),
    onSuccess: () => {
      toast.success("Campaign removed from listings.");
      setDeleteId(null);
      refresh();
    },
    onError: (err) => {
      console.error("Delete campaign failed:", err);
      toast.error("We couldn't delete this campaign. Please try again.");
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Campaigns</h2>
        <p className="text-sm text-slate-500">
          All fundraising campaigns. Pending ones can be approved or rejected.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
            <Filter className="h-3 w-3" /> Filters
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip active={status === null} onClick={() => applyFilter(null)}>
              All
            </FilterChip>
            {CAMPAIGN_STATUSES.map((s) => (
              <FilterChip key={s} active={status === s} onClick={() => applyFilter(s)}>
                {s.replace(/_/g, " ")}
              </FilterChip>
            ))}
          </div>
        </CardContent>
      </Card>

      {q.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : q.isError ? (
        <EmptyState
          title="We couldn't load campaigns"
          description="Something went wrong on our side. Please try again. If it keeps failing, contact support."
          action={
            <Button variant="outline" onClick={() => q.refetch()}>
              Retry
            </Button>
          }
        />
      ) : !q.data ? null : q.data.data.length === 0 ? (
        <EmptyState
          title="No campaigns match the filter"
          description="Try clearing or changing your filter."
          action={
            <Button variant="outline" onClick={() => applyFilter(null)}>
              Clear filter
            </Button>
          }
        />
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {q.data.data.map((c) => (
              <li key={c._id} className="flex items-center justify-between gap-3 px-5 py-3">
                <Link
                  href={`/campaigns/${c._id}`}
                  className="min-w-0 flex-1"
                >
                  <div className="flex items-center gap-2">
                    <CampaignStatusBadge status={c.status} />
                    {c.joinable ? <Badge tone="neutral">joinable</Badge> : null}
                  </div>
                  <div className="mt-1 truncate text-sm font-medium text-slate-900">
                    {c.title}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    <Money cents={c.currentAmount} currency={c.currency} /> of{" "}
                    <Money cents={c.goalAmount} currency={c.currency} />
                    {c.startDate ? ` · started ${formatDate(c.startDate)}` : null}
                  </div>
                </Link>

                <div className="flex items-center gap-1.5 shrink-0">
                  {c.status === "pending_approval" && caps.isCampaignManager ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setConfirmAction({ id: c._id, title: c.title, approve: true })
                        }
                        isLoading={approve.isPending && approve.variables === c._id}
                        className="text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setConfirmAction({ id: c._id, title: c.title, approve: false })
                        }
                        isLoading={reject.isPending && reject.variables === c._id}
                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </>
                  ) : null}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setManagingId(managingId === c._id ? null : c._id)}
                      aria-label={`Manage ${c.title}`}
                    >
                      {managingId === c._id ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => setDeleteId(c._id)}
                      aria-label={`Delete ${c.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
                {managingId === c._id ? (
                  <CampaignManagePanel
                    campaign={c}
                    onSave={(body) => update.mutate({ id: c._id, body })}
                    isPending={update.isPending}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      )}
      {q.data && q.data.data.length > 0 ? (
        <Pager
          page={q.data.meta.page}
          limit={q.data.meta.limit}
          total={q.data.meta.total}
          hasPrevPage={q.data.meta.hasPrevPage}
          hasNextPage={q.data.meta.hasNextPage}
          onPage={setPage}
        />
      ) : null}

      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
        onConfirm={() => {
          if (!confirmAction) return;
          if (confirmAction.approve) approve.mutate(confirmAction.id);
          else reject.mutate(confirmAction.id);
        }}
        title={confirmAction?.approve ? "Approve this campaign?" : "Reject this campaign?"}
        description={
          confirmAction
            ? `"${confirmAction.title}" will be ${
                confirmAction.approve
                  ? "activated and shown publicly."
                  : "sent back to draft."
              }`
            : undefined
        }
        confirmLabel={confirmAction?.approve ? "Approve" : "Reject"}
        danger={!confirmAction?.approve}
        isPending={approve.isPending || reject.isPending}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        onConfirm={() => {
          if (deleteId) remove.mutate(deleteId);
        }}
        title="Delete this campaign?"
        description="It disappears from all listings. Donations already made are kept for records."
        confirmLabel="Yes, delete"
        danger
        isPending={remove.isPending}
      />
    </div>
  );
}

const STATUS_ACTIONS: Record<CampaignStatus, Array<{ to: CampaignStatus; label: string }>> = {
  draft: [],
  pending_approval: [],
  active: [{ to: "paused", label: "Pause" }],
  paused: [{ to: "active", label: "Resume" }],
  completed: [],
  cancelled: [],
};

function CampaignManagePanel({
  campaign,
  onSave,
  isPending,
}: {
  campaign: {
    _id: string;
    title: string;
    summary?: string;
    goalAmount: number;
    currency: string;
    joinable: boolean;
    startDate?: string | null;
    endDate?: string | null;
    status: CampaignStatus;
  };
  onSave: (body: Record<string, unknown>) => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState(campaign.title);
  const [summary, setSummary] = useState(campaign.summary ?? "");
  const [goalWhole, setGoalWhole] = useState(String(campaign.goalAmount / 100));
  const [joinable, setJoinable] = useState(campaign.joinable);
  const [startDate, setStartDate] = useState(campaign.startDate?.slice(0, 10) ?? "");
  const [endDate, setEndDate] = useState(campaign.endDate?.slice(0, 10) ?? "");

  const statusActions = STATUS_ACTIONS[campaign.status as CampaignStatus] ?? [];
  const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30";

  return (
    <div className="flex flex-col gap-4 border-t border-slate-100 px-5 py-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="cm-title" className="mb-1 block text-sm font-medium text-slate-700">
            Title
          </label>
          <input id="cm-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label htmlFor="cm-goal" className="mb-1 block text-sm font-medium text-slate-700">
            Goal ({campaign.currency})
          </label>
          <input
            id="cm-goal"
            type="number"
            min={1}
            step={1}
            value={goalWhole}
            onChange={(e) => setGoalWhole(e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="cm-summary" className="mb-1 block text-sm font-medium text-slate-700">
            Summary
          </label>
          <input id="cm-summary" type="text" maxLength={500} value={summary} onChange={(e) => setSummary(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label htmlFor="cm-start" className="mb-1 block text-sm font-medium text-slate-700">
            Start date
          </label>
          <input id="cm-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label htmlFor="cm-end" className="mb-1 block text-sm font-medium text-slate-700">
            End date
          </label>
          <input id="cm-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={joinable}
          onChange={(e) => setJoinable(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-slate-300 accent-sky-600"
        />
        Open to co-fundraisers
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={() =>
            onSave({
              title,
              summary: summary || undefined,
              goalAmount: Math.round(Number(goalWhole) * 100),
              joinable,
              startDate: startDate || undefined,
              endDate: endDate || undefined,
            })
          }
          isLoading={isPending}
        >
          <Pencil className="h-3.5 w-3.5" />
          Save changes
        </Button>
        {statusActions.map((a) => (
          <Button
            key={a.to}
            size="sm"
            variant="outline"
            onClick={() => onSave({ status: a.to })}
            isLoading={isPending}
          >
            {a.label}
          </Button>
        ))}
        {campaign.status === "active" || campaign.status === "paused" ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSave({ status: "completed" })}
            isLoading={isPending}
          >
            Mark completed
          </Button>
        ) : null}
        {campaign.status !== "cancelled" && campaign.status !== "completed" ? (
          <Button
            size="sm"
            variant="outline"
            className="border-rose-300 text-rose-700 hover:bg-rose-50"
            onClick={() => onSave({ status: "cancelled" })}
            isLoading={isPending}
          >
            Cancel campaign
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
        active
          ? "border-sky-500 bg-sky-500 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
      }`}
    >
      {children}
    </button>
  );
}