"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { Send, Trash2, UserPlus, Users } from "lucide-react";
import { campaignsApi } from "@/lib/api/campaigns";
import { projectsApi } from "@/lib/api/projects";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/context";
import { type UpdateCampaignInput } from "@/lib/schemas/campaign";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { formatDate } from "@/lib/format-date";
import { CampaignStatusBadge } from "@/components/ui/status-badges";
import { ProgressBar } from "@/components/progress-bar";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";

const formSchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().max(500).optional(),
  story: z.string().optional(),
  goalAmount: z.number().min(1),
  dropsGoal: z.number().int().min(0).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  joinable: z.boolean(),
  status: z.string().optional(),
  contentManagerId: z.string().optional(),
  photosText: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function ManageCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ManageInner params={params} />;
}

function ManageInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ManageCampaign id={id} />;
}

function ManageCampaign({ id }: { id: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { state } = useAuth();
  const [joinRole, setJoinRole] = useState("co_fundraiser");
  const [editing, setEditing] = useState(false);

  const campaignQ = useQuery({
    queryKey: ["campaigns", "get", id],
    queryFn: () => campaignsApi.get(id),
    enabled: state.status === "authenticated",
  });

  const projectQ = useQuery({
    queryKey: ["projects", "get", campaignQ.data?.projectId],
    queryFn: () => projectsApi.get(campaignQ.data!.projectId),
    enabled: campaignQ.isSuccess,
  });

  useEffect(() => {
    if (state.status === "unauthenticated") {
      router.replace(`/sign-in?next=/me/campaigns/${id}/manage`);
    } else if (state.status === "needs-onboarding") {
      router.replace(`/onboarding?next=/me/campaigns/${id}/manage`);
    }
  }, [state, router, id]);

  if (state.status !== "authenticated") {
    return <div className="text-sm text-slate-500">Loading…</div>;
  }
  const me = state.user;
  const userId = me.id;

  if (campaignQ.isLoading) {
    return <div className="h-64 animate-pulse rounded-xl bg-slate-100" />;
  }
  if (campaignQ.isError) {
    const is404 = campaignQ.error instanceof ApiError && campaignQ.error.statusCode === 404;
    const isUnexpected = !(campaignQ.error instanceof ApiError);
    return (
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>
              {is404
                ? "Campaign not found"
                : isUnexpected
                  ? "This looks different than expected"
                  : "We couldn't load this campaign"}
            </CardTitle>
            <CardDescription>
              {is404
                ? "It may have been removed or the link is wrong."
                : isUnexpected
                  ? "Please refresh the page to try again. If it keeps happening, contact support."
                  : "Something went wrong on our side. Please try again. If it keeps happening, contact support."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => campaignQ.refetch()}>
              Retry
            </Button>
            <Link href="/me/campaigns">
              <Button variant="outline">Back to my campaigns</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const c = campaignQ.data;
  if (!c) return null;
  const isOwner = c.createdBy === userId;
  const isParticipant = c.participants.some((p) => p.userId === userId);
  const canEdit = isOwner && (c.status === "draft" || c.status === "pending_approval");
  const canSubmit = isOwner && c.status === "draft";
  const canJoin = !isOwner && !isParticipant && c.status === "active" && c.joinable;
  const canDelete = isOwner && (c.status === "draft" || c.status === "pending_approval");

  return (
    <div className="flex flex-col gap-6">
      <Link href="/me/campaigns" className="text-sm text-slate-500 hover:text-slate-700">
        ← Back to my campaigns
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <CampaignStatusBadge status={c.status} />
          {c.joinable ? <Badge tone="info">joinable</Badge> : null}
          {isOwner ? <Badge tone="success">owner</Badge> : null}
          {!isOwner && isParticipant ? <Badge tone="neutral">co-fundraiser</Badge> : null}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{c.title}</h1>
        {c.summary ? <p className="text-slate-600">{c.summary}</p> : null}
        {projectQ.data ? (
          <p className="text-sm text-slate-500">
            Backing:{" "}
            <Link
              href={`/projects/${projectQ.data._id}`}
              className="font-medium text-sky-700 hover:underline"
            >
              {projectQ.data.title}
            </Link>
          </p>
        ) : null}
      </header>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <ProgressBar value={c.currentAmount} max={c.goalAmount} />
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium text-slate-900">
              <Money cents={c.currentAmount} currency={c.currency} />
            </span>
            <span className="text-xs text-slate-500">
              of <Money cents={c.goalAmount} currency={c.currency} />
            </span>
          </div>
        </CardContent>
      </Card>

      {canSubmit ? (
        <SubmitPanel
          id={c._id}
          onSubmitted={() => {
            qc.invalidateQueries({ queryKey: ["campaigns", "get", id] });
            qc.invalidateQueries({ queryKey: ["campaigns", "mine"] });
            qc.invalidateQueries({ queryKey: ["admin", "campaigns"] });
            qc.invalidateQueries({ queryKey: ["admin", "review-queue"] });
            qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
          }}
        />
      ) : null}
      {canJoin ? (
        <JoinPanel
          id={c._id}
          role={joinRole}
          setRole={setJoinRole}
          onJoined={() => {
            qc.invalidateQueries({ queryKey: ["campaigns", "get", id] });
            qc.invalidateQueries({ queryKey: ["campaigns", "mine"] });
            qc.invalidateQueries({ queryKey: ["campaigns", "list"] });
          }}
        />
      ) : null}
      {canEdit ? (
        <EditPanel
          initial={{
            title: c.title,
            summary: c.summary ?? "",
            story: c.story ?? "",
            goalAmount: c.goalAmount / 100,
            dropsGoal: c.dropsGoal ?? 0,
            startDate: c.startDate?.slice(0, 10) ?? "",
            endDate: c.endDate?.slice(0, 10) ?? "",
            joinable: c.joinable,
            photosText: (c.photos ?? []).join("\n"),
          }}
          isOpen={editing}
          setOpen={setEditing}
          onSave={async (values) => {
            const photos = (values.photosText ?? "")
              .split("\n")
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
            const payload: UpdateCampaignInput = {
              title: values.title,
              summary: values.summary || undefined,
              story: values.story || undefined,
              goalAmount: Math.round(values.goalAmount * 100),
              dropsGoal: values.dropsGoal,
              startDate: values.startDate || undefined,
              endDate: values.endDate || undefined,
              joinable: values.joinable,
              photos: photos.length > 0 ? photos : undefined,
            };
            const updated = await campaignsApi.update(c._id, payload);
            toast.success("Your campaign changes have been saved.");
            qc.setQueryData(["campaigns", "get", c._id], updated);
            qc.invalidateQueries({ queryKey: ["campaigns"] });
            qc.invalidateQueries({ queryKey: ["admin", "campaigns"] });
            qc.invalidateQueries({ queryKey: ["admin", "review-queue"] });
            qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
            setEditing(false);
          }}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Participants</CardTitle>
          <CardDescription>
            <Users className="mr-1 inline h-3.5 w-3.5" />
            {c.participants.length} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-slate-100">
            {c.participants.map((p) => (
              <li
                key={p._id}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="break-all font-medium text-slate-900">
                    {p.userId === c.createdBy ? "You (creator)" : p.userId}
                  </span>
                  <span className="text-xs text-slate-500">
                    joined {formatDate(p.joinedAt)}
                  </span>
                </div>
                <Badge tone="neutral" className="capitalize">
                  {p.role.replace(/_/g, " ")}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {canDelete ? (
        <DeletePanel
          id={c._id}
          onDeleted={() => {
            qc.invalidateQueries({ queryKey: ["campaigns"] });
            qc.invalidateQueries({ queryKey: ["admin", "campaigns"] });
            qc.invalidateQueries({ queryKey: ["admin", "review-queue"] });
            qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
            router.push("/me/campaigns");
          }}
        />
      ) : null}
    </div>
  );
}

function SubmitPanel({
  id,
  onSubmitted,
}: {
  id: string;
  onSubmitted: () => void;
}) {
  const submit = useMutation({
    mutationFn: () => campaignsApi.submit(id),
    onSuccess: () => {
      toast.success("Your campaign was sent for review. We'll notify you once a manager approves it.");
      onSubmitted();
    },
    onError: (err) => {
      console.error("Submit campaign failed:", err);
      toast.error("We couldn't submit your campaign for approval. Please try again. If it keeps failing, contact support.");
    },
  });
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Ready to go live?</h3>
          <p className="text-xs text-slate-500">
            Submit your draft for review. A campaign manager will activate it.
          </p>
        </div>
        <Button onClick={() => submit.mutate()} isLoading={submit.isPending}>
          <Send className="h-4 w-4" />
          Submit for approval
        </Button>
      </CardContent>
    </Card>
  );
}

function JoinPanel({
  id,
  role,
  setRole,
  onJoined,
}: {
  id: string;
  role: string;
  setRole: (s: string) => void;
  onJoined: () => void;
}) {
  const join = useMutation({
    mutationFn: () => campaignsApi.join(id, role),
    onSuccess: () => {
      toast.success("You're now a co-fundraiser on this campaign. Share it to start raising together.");
      onJoined();
    },
    onError: (err) => {
      console.error("Join campaign failed:", err);
      toast.error("We couldn't add you to this campaign. Please try again.");
    },
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Join this campaign</CardTitle>
        <CardDescription>
          This campaign is open to co-fundraisers. Pick a role and join.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="joinRole" className="mb-1 block text-sm font-medium text-slate-700">
            Your role
          </label>
          <input
            id="joinRole"
            type="text"
            maxLength={50}
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            placeholder="co_fundraiser"
          />
        </div>
        <Button onClick={() => join.mutate()} isLoading={join.isPending}>
          <UserPlus className="h-4 w-4" />
          Join campaign
        </Button>
      </CardContent>
    </Card>
  );
}

function EditPanel({
  initial,
  isOpen,
  setOpen,
  onSave,
}: {
  initial: FormValues;
  isOpen: boolean;
  setOpen: (v: boolean) => void;
  onSave: (v: FormValues) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initial,
    values: initial,
  });

  if (!isOpen) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Need to change something?</h3>
            <p className="text-xs text-slate-500">You can edit title, story, goal, dates, and more.</p>
          </div>
          <Button variant="outline" onClick={() => setOpen(true)}>
            Edit campaign
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(async (v) => {
        await onSave(v);
      })}
      className="flex flex-col gap-3"
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Edit campaign</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
            <input
              type="text"
              {...register("title")}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
            {errors.title ? (
              <p className="mt-1 text-xs text-rose-600">{errors.title.message}</p>
            ) : null}
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Summary</label>
            <input
              type="text"
              {...register("summary")}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Story</label>
            <textarea
              rows={4}
              {...register("story")}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Goal (ETB)</label>
            <input
              type="number"
              min={1}
              step={1}
              {...register("goalAmount", { valueAsNumber: true })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
            {errors.goalAmount ? (
              <p className="mt-1 text-xs text-rose-600">{errors.goalAmount.message}</p>
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Drops goal</label>
            <input
              type="number"
              min={0}
              step={1}
              {...register("dropsGoal", { valueAsNumber: true })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Start date</label>
            <input
              type="date"
              {...register("startDate")}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">End date</label>
            <input
              type="date"
              {...register("endDate")}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Photo URLs (one per line)
            </label>
            <textarea
              rows={2}
              {...register("photosText")}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
            <input
              type="checkbox"
              {...register("joinable")}
              className="h-3.5 w-3.5 rounded border-slate-300 accent-sky-600"
            />
            Let others join as co-fundraisers
          </label>
        </CardContent>
      </Card>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            reset(initial);
            setOpen(false);
          }}
        >
          Cancel
        </Button>
        <Button type="submit">Save changes</Button>
      </div>
    </form>
  );
}

function DeletePanel({
  id,
  onDeleted,
}: {
  id: string;
  onDeleted: () => void;
}) {
  const remove = useMutation({
    mutationFn: () => campaignsApi.remove(id),
    onSuccess: () => {
      toast.success("This campaign has been deleted. You're back at your campaign list.");
      setConfirmOpen(false);
      onDeleted();
    },
    onError: (err) => {
      console.error("Delete campaign failed:", err);
      toast.error("We couldn't delete this campaign. Please try again. If it keeps failing, contact support.");
    },
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <Card className="border-rose-200 bg-rose-50/30">
      <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-rose-900">Delete this campaign</h3>
          <p className="text-xs text-rose-700">
            Soft delete. The campaign is removed from listings but kept in the database.
          </p>
        </div>
        <Button
          variant="danger"
          onClick={() => setConfirmOpen(true)}
          isLoading={remove.isPending}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </CardContent>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={() => remove.mutate()}
        title="Delete this campaign?"
        description="The campaign is removed from listings but kept in the database. This cannot be undone from the UI."
        confirmLabel="Delete"
        danger
        isPending={remove.isPending}
      />
    </Card>
  );
}
