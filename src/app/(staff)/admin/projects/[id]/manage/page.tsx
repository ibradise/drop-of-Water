"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { use, useState } from "react";
import { CalendarDays, Image as ImageIcon, ListChecks, Plus, Receipt, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { projectsApi } from "@/lib/api/projects";
import { type ProjectStatus } from "@/lib/enums";
import { ApiError } from "@/lib/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { ProjectStatusBadge } from "@/components/ui/status-badges";
import { ProgressBar } from "@/components/progress-bar";
import { ConfirmDialog } from "@/components/confirm-dialog";

export default function AdminProjectManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <Inner id={id} />;
}

function Inner({ id }: { id: string }) {
  const qc = useQueryClient();
  const projectQ = useQuery({
    queryKey: ["projects", "get", id],
    queryFn: () => projectsApi.get(id),
    retry: (count, err) => !(err instanceof ApiError && err.statusCode === 404) && count < 2,
  });

  const addMilestone = useMutation({
    mutationFn: (body: { title: string; description?: string }) =>
      projectsApi.addMilestones(id, body),
    onSuccess: () => {
      toast.success("New milestone added to this project.");
      qc.invalidateQueries({ queryKey: ["projects", "get", id] });
      qc.invalidateQueries({ queryKey: ["projects", "list"] });
      qc.invalidateQueries({ queryKey: ["admin", "projects"] });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      setNewMilestone({ title: "", description: "" });
    },
    onError: (e) => {
      console.error("Add milestone failed:", e);
      toast.error("We couldn't add this milestone. Please check the title and try again.");
    },
  });
  const removeMilestone = useMutation({
    mutationFn: (mid: string) => projectsApi.removeMilestone(id, mid),
    onSuccess: () => {
      toast.success("Milestone removed from this project.");
      setRemoveMilestoneId(null);
      qc.invalidateQueries({ queryKey: ["projects", "get", id] });
      qc.invalidateQueries({ queryKey: ["projects", "list"] });
      qc.invalidateQueries({ queryKey: ["admin", "projects"] });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
    onError: (e) => {
      console.error("Remove milestone failed:", e);
      toast.error("We couldn't remove this milestone. Please try again.");
    },
  });

  const addCostItem = useMutation({
    mutationFn: (body: { item: string; amount: number }) =>
      projectsApi.addCostItems(id, body),
    onSuccess: () => {
      toast.success("New cost item added to the budget.");
      qc.invalidateQueries({ queryKey: ["projects", "get", id] });
      qc.invalidateQueries({ queryKey: ["projects", "list"] });
      qc.invalidateQueries({ queryKey: ["admin", "projects"] });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      setNewCostItem({ item: "", amount: 0 });
    },
    onError: (e) => {
      console.error("Add cost item failed:", e);
      toast.error("We couldn't add this cost item. Please check the name and amount and try again.");
    },
  });

  const addPhotos = useMutation({
    mutationFn: (urls: string[]) => projectsApi.addPhotos(id, urls),
    onSuccess: () => {
      toast.success("New photos added to this project.");
      qc.invalidateQueries({ queryKey: ["projects", "get", id] });
      qc.invalidateQueries({ queryKey: ["projects", "list"] });
      qc.invalidateQueries({ queryKey: ["admin", "projects"] });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      setNewPhotos("");
    },
    onError: (e) => {
      console.error("Add photos failed:", e);
      toast.error("We couldn't add these photos. Please check the URLs (one per line, starting with https://) and try again.");
    },
  });

  const addProofs = useMutation({
    mutationFn: (items: Array<{ type: string; url: string }>) =>
      projectsApi.addProofs(id, items),
    onSuccess: () => {
      toast.success("New impact evidence added to this project.");
      qc.invalidateQueries({ queryKey: ["projects", "get", id] });
      qc.invalidateQueries({ queryKey: ["projects", "list"] });
      qc.invalidateQueries({ queryKey: ["admin", "projects"] });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      setNewProofs("");
    },
    onError: (e) => {
      console.error("Add proofs failed:", e);
      toast.error("We couldn't add this proof. Use the format 'photo | https://…' (one per line) and try again.");
    },
  });

  const [newMilestone, setNewMilestone] = useState({ title: "", description: "" });
  const [newCostItem, setNewCostItem] = useState({ item: "", amount: 0 });
  const [newPhotos, setNewPhotos] = useState("");
  const [newProofs, setNewProofs] = useState("");
  const [removeMilestoneId, setRemoveMilestoneId] = useState<string | null>(null);

  if (projectQ.isLoading)
    return <div className="h-64 animate-pulse rounded-xl bg-slate-100" />;
  if (projectQ.isError) {
    const is404 = projectQ.error instanceof ApiError && projectQ.error.statusCode === 404;
    const isUnexpected = !(projectQ.error instanceof ApiError);
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {is404
              ? "Project not found"
              : isUnexpected
                ? "This looks different than expected"
                : "We couldn't load this project"}
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
          <Button variant="outline" onClick={() => projectQ.refetch()}>
            Retry
          </Button>
          <Link href="/admin/projects">
            <Button variant="outline">Back</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }
  const p = projectQ.data;
  if (!p) return null;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/projects/${p._id}`}
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        ← View public page
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ProjectStatusBadge status={p.status} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{p.title}</h1>
        <ProgressBar value={p.currentFunding} max={p.budget} />
        <div className="flex items-baseline gap-3 text-sm">
          <Money cents={p.currentFunding} currency={p.currency} className="text-sky-700" />
          <span className="text-slate-500">
            of <Money cents={p.budget} currency={p.currency} />
          </span>
        </div>
      </header>

      <StatusStepper id={p._id} status={p.status} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4" /> Milestones
          </CardTitle>
          <CardDescription>{p.milestones.length} total</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {p.milestones.length === 0 ? (
            <p className="text-sm text-slate-500">No milestones yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {p.milestones.map((m) => (
                <li
                  key={m._id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div>
                    <div className="font-medium text-slate-900">{m.title}</div>
                    {m.description ? (
                      <div className="text-xs text-slate-500">{m.description}</div>
                    ) : null}
                    <div className="mt-0.5 flex items-center gap-2 text-xs">
                      <Badge
                        tone={
                          m.status === "done"
                            ? "success"
                            : m.status === "in_progress"
                              ? "info"
                              : "neutral"
                        }
                        className="capitalize"
                      >
                        {m.status.replace(/_/g, " ")}
                      </Badge>
                      {m.completedAt ? (
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <CalendarDays className="h-3 w-3" />
                          {new Date(m.completedAt).toLocaleDateString()}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove milestone ${m.title}`}
                    onClick={() => {
                      if (m._id) setRemoveMilestoneId(m._id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newMilestone.title) return;
              addMilestone.mutate(newMilestone);
            }}
          >
            <input
              type="text"
              value={newMilestone.title}
              onChange={(e) => setNewMilestone((s) => ({ ...s, title: e.target.value }))}
              placeholder="Milestone title"
              aria-label="Milestone title"
              className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <input
              type="text"
              value={newMilestone.description}
              onChange={(e) =>
                setNewMilestone((s) => ({ ...s, description: e.target.value }))
              }
              placeholder="Description (optional)"
              aria-label="Milestone description (optional)"
              className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <Button type="submit" isLoading={addMilestone.isPending}>
              <Plus className="h-4 w-4" />
              Add milestone
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-4 w-4" /> Cost breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {p.costBreakdown.length === 0 ? (
            <p className="text-sm text-slate-500">No cost items yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {p.costBreakdown.map((c) => (
                <li
                  key={c._id ?? c.item}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="text-slate-700">{c.item}</span>
                  <Money cents={c.amount} currency={p.currency} />
                </li>
              ))}
            </ul>
          )}
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newCostItem.item || newCostItem.amount <= 0) return;
              addCostItem.mutate({
                item: newCostItem.item,
                amount: Math.round(newCostItem.amount * 100),
              });
            }}
          >
            <input
              type="text"
              value={newCostItem.item}
              onChange={(e) => setNewCostItem((s) => ({ ...s, item: e.target.value }))}
              placeholder="Item name"
              aria-label="Cost item name"
              className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <input
              type="number"
              min={1}
              step={1}
              value={newCostItem.amount || ""}
              onChange={(e) =>
                setNewCostItem((s) => ({ ...s, amount: Number(e.target.value) }))
              }
              placeholder="Amount (ETB)"
              aria-label="Cost item amount in ETB"
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:w-32"
            />
            <Button type="submit" isLoading={addCostItem.isPending}>
              <Plus className="h-4 w-4" />
              Add cost item
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="h-4 w-4" /> Photos
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {p.photos.length === 0 ? (
            <p className="text-sm text-slate-500">No photos yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {p.photos.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="aspect-video w-full rounded-md object-cover"
                />
              ))}
            </div>
          )}
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const urls = newPhotos.split("\n").map((s) => s.trim()).filter(Boolean);
              if (urls.length === 0) return;
              addPhotos.mutate(urls);
            }}
          >
            <textarea
              rows={3}
              value={newPhotos}
              onChange={(e) => setNewPhotos(e.target.value)}
              placeholder="Photo URLs, one per line"
              aria-label="Photo URLs, one per line"
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <Button type="submit" isLoading={addPhotos.isPending} className="self-end">
              <Plus className="h-4 w-4" />
              Add photos
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Proof of impact</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {p.proofOfImpact.length === 0 ? (
            <p className="text-sm text-slate-500">No proofs yet.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {p.proofOfImpact.map((proof) => (
                <li
                  key={proof._id ?? proof.url}
                  className="rounded-md border border-slate-200 bg-white p-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={proof.url}
                    alt={proof.type}
                    className="aspect-video w-full rounded object-cover"
                  />
                  <div className="mt-1 text-xs capitalize text-slate-600">
                    {proof.type}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const items = newProofs
                .split("\n")
                .map((line) => {
                  const [type, ...rest] = line.split("|");
                  return { type: (type ?? "").trim(), url: rest.join("|").trim() };
                })
                .filter((it) => it.type && it.url);
              if (items.length === 0) return;
              addProofs.mutate(items);
            }}
          >
            <textarea
              rows={3}
              value={newProofs}
              onChange={(e) => setNewProofs(e.target.value)}
              placeholder="type | url (one per line, e.g. 'photo | https://…')"
              aria-label="Proofs, one per line as type | url"
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <Button type="submit" isLoading={addProofs.isPending} className="self-end">
              <Plus className="h-4 w-4" />
              Add proofs
            </Button>
          </form>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={removeMilestoneId !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveMilestoneId(null);
        }}
        onConfirm={() => {
          if (removeMilestoneId) removeMilestone.mutate(removeMilestoneId);
        }}
        title="Remove this milestone?"
        description="This removes the milestone from the project right away. You can add it back manually, but its history will be lost."
        confirmLabel="Yes, remove"
        cancelLabel="Keep"
        danger
        isPending={removeMilestone.isPending}
      />
    </div>
  );
}

const NEXT_STATUS: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ["assessment", "archived"],
  assessment: ["draft", "fundable", "archived"],
  fundable: ["assessment", "funded", "archived"],
  funded: ["in_progress", "archived"],
  in_progress: ["completed", "archived"],
  completed: [],
  archived: [],
};

function StatusStepper({ id, status }: { id: string; status: ProjectStatus }) {
  const qc = useQueryClient();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const next = NEXT_STATUS[status] ?? [];

  const update = useMutation({
    mutationFn: (nextStatus: ProjectStatus) => projectsApi.update(id, { status: nextStatus }),
    onSuccess: (_, nextStatus) => {
      toast.success(
        nextStatus === "archived"
          ? "Project archived. It no longer appears in listings."
          : `Project moved to ${nextStatus.replace(/_/g, " ")}.`,
      );
      setArchiveOpen(false);
      qc.invalidateQueries({ queryKey: ["projects", "get", id] });
      qc.invalidateQueries({ queryKey: ["projects", "list"] });
      qc.invalidateQueries({ queryKey: ["admin", "projects"] });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
    onError: (e) => {
      console.error("Update project status failed:", e);
      toast.error("We couldn't change the project status. Please try again.");
    },
  });

  if (next.length === 0) return null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Project status</h3>
          <p className="text-xs text-slate-500">
            Move the project along its lifecycle. Archiving is terminal — the
            project disappears from listings.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {next.map((s) => (
            <Button
              key={s}
              size="sm"
              variant="outline"
              onClick={() => (s === "archived" ? setArchiveOpen(true) : update.mutate(s))}
              isLoading={update.isPending && update.variables === s}
              disabled={update.isPending}
            >
              <ArrowRight className="h-3.5 w-3.5" />
              {s.replace(/_/g, " ")}
            </Button>
          ))}
        </div>
      </CardContent>
      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        onConfirm={() => update.mutate("archived")}
        title="Archive this project?"
        description="Archiving is terminal. The project disappears from listings and no new campaigns can be created against it."
        confirmLabel="Yes, archive"
        danger
        isPending={update.isPending}
      />
    </Card>
  );
}
