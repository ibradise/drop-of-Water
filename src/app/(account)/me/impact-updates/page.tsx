"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, FileText, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { hasAnyRole, ROLE_GROUPS } from "@/lib/enums";
import { impactUpdatesApi } from "@/lib/api/impact-updates";
import { projectsApi } from "@/lib/api/projects";
import { campaignsApi } from "@/lib/api/campaigns";
import { ATTACHMENT_TYPES } from "@/lib/enums";
import { Card, CardContent, EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { formatDate } from "@/lib/format-date";

const formSchema = z.object({
  projectId: z.string().min(1, "Pick a project"),
  campaignId: z.string().optional(),
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().min(1, "Content is required"),
  attachmentType: z.enum(ATTACHMENT_TYPES),
  attachmentUrl: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function MeImpactUpdatesPage() {
  const qc = useQueryClient();
  const { state } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const isContributor =
    state.status === "authenticated" &&
    hasAnyRole(state.user.roles, ROLE_GROUPS.contentContributors);

  const projectsQ = useQuery({
    queryKey: ["projects", "list", "all"],
    queryFn: () => projectsApi.list({ page: 1, limit: 100 }),
    enabled: isContributor,
  });

  const myCampaignsQ = useQuery({
    queryKey: ["campaigns", "mine"],
    queryFn: async () => {
      const all = await campaignsApi.list({ page: 1, limit: 100 });
      const userId = state.status === "authenticated" ? state.user.id : null;
      return all.data.filter(
        (c) =>
          c.createdBy === userId ||
          c.participants.some((p) => p.userId === userId),
      );
    },
    enabled: isContributor,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["impact-updates"] });
  };

  const create = useMutation({
    mutationFn: (v: FormValues) =>
      impactUpdatesApi.create({
        projectId: v.projectId,
        campaignId: v.campaignId || undefined,
        title: v.title,
        content: v.content,
        attachments:
          v.attachmentUrl && v.attachmentUrl.trim()
            ? [{ type: v.attachmentType, url: v.attachmentUrl.trim() }]
            : undefined,
      }),
    onSuccess: () => {
      toast.success("Update saved as a draft. Submit it for review when you're ready.");
      setShowForm(false);
      refresh();
    },
    onError: (err) => {
      console.error("Create impact update failed:", err);
      toast.error("We couldn't save this update. Please check your entries and try again.");
    },
  });

  const submit = useMutation({
    mutationFn: (id: string) => impactUpdatesApi.submit(id),
    onSuccess: () => {
      toast.success("Your update was sent for review. We'll notify you once a manager approves it.");
      refresh();
    },
    onError: (err) => {
      console.error("Submit impact update failed:", err);
      toast.error("We couldn't submit this update. Please try again.");
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => impactUpdatesApi.remove(id),
    onSuccess: () => {
      toast.success("Update deleted.");
      setDeleteId(null);
      refresh();
    },
    onError: (err) => {
      console.error("Delete impact update failed:", err);
      toast.error("We couldn't delete this update. Please try again.");
    },
  });

  if (state.status !== "authenticated") {
    return <div className="text-sm text-slate-500">Loading…</div>;
  }

  if (!isContributor) {
    return (
      <div className="flex flex-col gap-6">
        <header>
          <h2 className="text-xl font-semibold text-slate-900">Field updates</h2>
          <p className="text-sm text-slate-500">
            Share progress from the ground with donors and the community.
          </p>
        </header>
        <EmptyState
          title="You need permission to write updates"
          description="Field updates are written by content contributors. Ask a program director or content manager to give you access."
        />
      </div>
    );
  }

  const projects = projectsQ.data?.data ?? [];
  const myCampaigns = myCampaignsQ.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Field updates</h2>
          <p className="text-sm text-slate-500">
            Write progress updates for projects you work on. Managers review and publish them.
          </p>
        </div>
        <Button size="sm" onClick={() => { setShowForm((s) => !s); setEditingId(null); }}>
          <Plus className="h-4 w-4" />
          New update
        </Button>
      </header>

      {showForm ? (
        <Card>
          <CardContent>
            <ImpactUpdateForm
              key={editingId ?? "new"}
              projects={projects}
              campaigns={myCampaigns}
              isPending={create.isPending}
              onSubmit={(v) => create.mutate(v)}
              onCancel={() => { setShowForm(false); setEditingId(null); }}
            />
          </CardContent>
        </Card>
      ) : null}

      <MyUpdateList
        onEdit={(id) => { setEditingId(id); setShowForm(true); }}
        onSubmit={(id) => submit.mutate(id)}
        onDelete={(id) => setDeleteId(id)}
        submitPending={submit.isPending}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        onConfirm={() => {
          if (deleteId) remove.mutate(deleteId);
        }}
        title="Delete this update?"
        description="It is removed from the project timeline. This cannot be undone."
        confirmLabel="Yes, delete"
        danger
        isPending={remove.isPending}
      />
    </div>
  );
}

function MyUpdateList({
  onEdit,
  onSubmit,
  onDelete,
  submitPending,
}: {
  onEdit: (id: string) => void;
  onSubmit: (id: string) => void;
  onDelete: (id: string) => void;
  submitPending: boolean;
}) {
  const { state } = useAuth();
  const userId = state.status === "authenticated" ? state.user.id : null;

  const q = useQuery({
    queryKey: ["impact-updates", "mine"],
    queryFn: async () => {
      const all = await impactUpdatesApi.list({ page: 1, limit: 100 });
      return all.data.filter((u) => u.authorId === userId);
    },
  });

  if (q.isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }
  if (q.isError) {
    return (
      <EmptyState
        title="We couldn't load your updates"
        description="Something went wrong on our side. Please try again. If it keeps failing, contact support."
        action={
          <Button variant="outline" onClick={() => q.refetch()}>
            Retry
          </Button>
        }
      />
    );
  }
  const items = q.data ?? [];
  if (items.length === 0) {
    return (
      <EmptyState
        title="No updates yet"
        description="Write your first field update and submit it for review."
      />
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {items.map((u) => (
        <Card key={u._id}>
          <CardContent className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                tone={
                  u.status === "published"
                    ? "success"
                    : u.status === "submitted"
                      ? "info"
                      : u.status === "rejected"
                        ? "danger"
                        : "neutral"
                }
              >
                {u.status}
              </Badge>
              <span className="text-sm font-semibold text-slate-900">{u.title}</span>
            </div>
            <p className="line-clamp-2 text-xs text-slate-600">{u.content}</p>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <CalendarDays className="h-3 w-3" />
              {formatDate(u.createdAt)}
            </div>
            {u.status === "rejected" && u.rejectionReason ? (
              <p className="text-xs text-rose-600">Rejected: {u.rejectionReason}</p>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-1">
              {(u.status === "draft" || u.status === "rejected") ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => onEdit(u._id)}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onSubmit(u._id)}
                    isLoading={submitPending}
                  >
                    <Send className="h-3.5 w-3.5" />
                    Submit for review
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => onDelete(u._id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ImpactUpdateForm({
  projects,
  campaigns,
  isPending,
  onSubmit,
  onCancel,
}: {
  projects: Array<{ _id: string; title: string }>;
  campaigns: Array<{ _id: string; title: string; projectId: string }>;
  isPending: boolean;
  onSubmit: (v: FormValues) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectId: "",
      campaignId: "",
      title: "",
      content: "",
      attachmentType: "image",
      attachmentUrl: "",
    },
  });

  const projectId = watch("projectId");
  const linkedCampaigns = campaigns.filter((c) => c.projectId === projectId);

  const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="iu-project" className="mb-1 block text-sm font-medium text-slate-700">
            Project <span className="text-rose-500">*</span>
          </label>
          <select
            id="iu-project"
            {...register("projectId")}
            className={inputCls}
          >
            <option value="">Pick a project…</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.title}
              </option>
            ))}
          </select>
          {errors.projectId ? (
            <p className="mt-1 text-xs text-rose-600">{errors.projectId.message}</p>
          ) : null}
        </div>
        <div>
          <label htmlFor="iu-campaign" className="mb-1 block text-sm font-medium text-slate-700">
            Campaign (optional)
          </label>
          <select
            id="iu-campaign"
            {...register("campaignId")}
            disabled={!projectId}
            className={inputCls}
          >
            <option value="">None</option>
            {linkedCampaigns.map((c) => (
              <option key={c._id} value={c._id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="iu-title" className="mb-1 block text-sm font-medium text-slate-700">
            Title <span className="text-rose-500">*</span>
          </label>
          <input id="iu-title" type="text" maxLength={200} {...register("title")} className={inputCls} />
          {errors.title ? (
            <p className="mt-1 text-xs text-rose-600">{errors.title.message}</p>
          ) : null}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="iu-content" className="mb-1 block text-sm font-medium text-slate-700">
            What happened? <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="iu-content"
            rows={6}
            placeholder="Describe the progress, the people involved, and what it means for the community."
            {...register("content")}
            className={inputCls}
          />
          {errors.content ? (
            <p className="mt-1 text-xs text-rose-600">{errors.content.message}</p>
          ) : null}
        </div>
        <div>
          <label htmlFor="iu-att-type" className="mb-1 block text-sm font-medium text-slate-700">
            Attachment type
          </label>
          <select
            id="iu-att-type"
            {...register("attachmentType")}
            onChange={(e) => setValue("attachmentType", e.target.value as FormValues["attachmentType"])}
            className={inputCls}
          >
            {ATTACHMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="iu-att-url" className="mb-1 block text-sm font-medium text-slate-700">
            Attachment URL (optional)
          </label>
          <input
            id="iu-att-url"
            type="text"
            placeholder="https://…"
            {...register("attachmentUrl")}
            className={inputCls}
          />
          {errors.attachmentUrl ? (
            <p className="mt-1 text-xs text-rose-600">Enter a full link starting with https://</p>
          ) : null}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isPending}>
          <FileText className="h-4 w-4" />
          Save draft
        </Button>
      </div>
    </form>
  );
}
