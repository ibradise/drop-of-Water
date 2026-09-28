"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { adminApi } from "@/lib/api/admin";
import { sponsorshipsApi } from "@/lib/api/sponsorships";
import { ApiError } from "@/lib/api/client";
import {
  type Sponsorship,
} from "@/lib/schemas/sponsorship";
import { SPONSORSHIP_TYPES } from "@/lib/enums";
import { Card, CardContent, EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { ConfirmDialog } from "@/components/confirm-dialog";

const formSchema = z.object({
  corporateName: z.string().min(1, "Name is required").max(200),
  logoUrl: z.string().optional(),
  amountWhole: z.number().min(0).optional(),
  currency: z.string().length(3),
  message: z.string().max(500).optional(),
  type: z.enum(SPONSORSHIP_TYPES),
});

type FormValues = z.infer<typeof formSchema>;

function toPayload(v: FormValues) {
  return {
    corporateName: v.corporateName,
    logoUrl: v.logoUrl || undefined,
    amount: v.amountWhole != null ? Math.round(v.amountWhole * 100) : undefined,
    currency: v.currency,
    message: v.message || undefined,
    type: v.type,
  };
}

export default function AdminSponsorshipsPage() {
  const qc = useQueryClient();
  const [campaignId, setCampaignId] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const campaignsQ = useQuery({
    queryKey: ["admin", "campaigns", "picker"],
    queryFn: () => adminApi.campaigns({ page: 1, limit: 100 }),
  });

  const sponsorsQ = useQuery({
    queryKey: ["admin", "sponsorships", campaignId],
    queryFn: () => sponsorshipsApi.listForCampaign(campaignId, { page: 1, limit: 100 }),
    enabled: campaignId.length > 0,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "sponsorships"] });
    qc.invalidateQueries({ queryKey: ["campaigns"] });
    qc.invalidateQueries({ queryKey: ["admin", "campaigns"] });
    qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
  };

  const create = useMutation({
    mutationFn: (v: FormValues) => sponsorshipsApi.create(campaignId, toPayload(v)),
    onSuccess: () => {
      toast.success("Sponsor added to this campaign.");
      setShowCreate(false);
      refresh();
    },
    onError: (err) => {
      console.error("Create sponsor failed:", err);
      toast.error("We couldn't add this sponsor. Please check your entries and try again.");
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => sponsorshipsApi.remove(id),
    onSuccess: () => {
      toast.success("Sponsor removed from this campaign.");
      setDeleteId(null);
      refresh();
    },
    onError: (err) => {
      console.error("Remove sponsor failed:", err);
      toast.error("We couldn't remove this sponsor. Please try again.");
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      sponsorshipsApi.update(id, { isActive }),
    onSuccess: (_, { isActive }) => {
      toast.success(
        isActive
          ? "Sponsor is visible on the campaign page again."
          : "Sponsor hidden from the campaign page. You can re-activate it anytime.",
      );
      refresh();
    },
    onError: (err) => {
      console.error("Toggle sponsor failed:", err);
      toast.error("We couldn't change this sponsor. Please try again.");
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Sponsors</h2>
          <p className="text-sm text-slate-500">
            Corporate backers per campaign. Hiding keeps the record; deleting removes it.
          </p>
        </div>
        {campaignId ? (
          <Button size="sm" onClick={() => setShowCreate((s) => !s)}>
            <Plus className="h-4 w-4" />
            New sponsor
          </Button>
        ) : null}
      </header>

      <Card>
        <CardContent className="flex flex-col gap-2">
          <label
            htmlFor="sponsor-campaign"
            className="text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            Campaign
          </label>
          {campaignsQ.isLoading ? (
            <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
          ) : campaignsQ.isError ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-slate-600">We couldn&apos;t load campaigns.</p>
              <Button variant="outline" size="sm" onClick={() => campaignsQ.refetch()}>
                Retry
              </Button>
            </div>
          ) : (
            <select
              id="sponsor-campaign"
              value={campaignId}
              onChange={(e) => {
                setCampaignId(e.target.value);
                setShowCreate(false);
                setEditingId(null);
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            >
              <option value="">Pick a campaign…</option>
              {campaignsQ.data?.data.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title} ({c.status.replace(/_/g, " ")})
                </option>
              ))}
            </select>
          )}
        </CardContent>
      </Card>

      {!campaignId ? (
        <EmptyState
          title="Pick a campaign"
          description="Sponsors belong to a campaign. Choose one above to list, add, or edit its backers."
        />
      ) : showCreate ? (
        <Card>
          <CardContent>
            <SponsorForm
              key="new"
              submitLabel="Add sponsor"
              isPending={create.isPending}
              onSubmit={(v) => create.mutate(v)}
              onCancel={() => setShowCreate(false)}
            />
          </CardContent>
        </Card>
      ) : sponsorsQ.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : sponsorsQ.isError ? (
        <EmptyState
          title="We couldn't load sponsors"
          description="Something went wrong on our side. Please try again. If it keeps failing, contact support."
          action={
            <Button variant="outline" onClick={() => sponsorsQ.refetch()}>
              Retry
            </Button>
          }
        />
      ) : (sponsorsQ.data?.data ?? []).length === 0 ? (
        <EmptyState
          title="No sponsors yet"
          description="Add the first corporate backer for this campaign."
          action={
            <Button variant="outline" onClick={() => setShowCreate(true)}>
              New sponsor
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {(sponsorsQ.data?.data ?? []).map((s) => (
            <Card key={s._id}>
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {s.corporateName}
                    </span>
                    <Badge tone="neutral" className="capitalize">
                      {s.type.replace(/_/g, " ")}
                    </Badge>
                    {s.isActive ? (
                      <Badge tone="success">visible</Badge>
                    ) : (
                      <Badge tone="neutral">hidden</Badge>
                    )}
                    {s.amount != null ? (
                      <Money cents={s.amount} currency={s.currency} className="text-sm" />
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        toggleActive.mutate({ id: s._id, isActive: !s.isActive })
                      }
                      isLoading={toggleActive.isPending && toggleActive.variables?.id === s._id}
                    >
                      {s.isActive ? "Hide" : "Show"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(editingId === s._id ? null : s._id)}
                      aria-label={`Edit ${s.corporateName}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => setDeleteId(s._id)}
                      aria-label={`Remove ${s.corporateName}`}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
                {s.message ? (
                  <p className="text-sm text-slate-600">{s.message}</p>
                ) : null}
                {editingId === s._id ? (
                  <SponsorEditor sponsor={s} onDone={() => { setEditingId(null); refresh(); }} />
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        onConfirm={() => {
          if (deleteId) remove.mutate(deleteId);
        }}
        title="Remove this sponsor?"
        description="This permanently removes the backer from the campaign. To keep the record but hide it from the page, use Hide instead."
        confirmLabel="Yes, remove"
        danger
        isPending={remove.isPending}
      />
    </div>
  );
}

function SponsorForm({
  initial,
  submitLabel,
  isPending,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<FormValues>;
  submitLabel: string;
  isPending: boolean;
  onSubmit: (v: FormValues) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      corporateName: initial?.corporateName ?? "",
      logoUrl: initial?.logoUrl ?? "",
      amountWhole: initial?.amountWhole,
      currency: initial?.currency ?? "USD",
      message: initial?.message ?? "",
      type: initial?.type ?? "general",
    },
  });

  const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="sp-name" className="mb-1 block text-sm font-medium text-slate-700">
            Corporate name <span className="text-rose-500">*</span>
          </label>
          <input id="sp-name" type="text" {...register("corporateName")} className={inputCls} />
          {errors.corporateName ? (
            <p className="mt-1 text-xs text-rose-600">{errors.corporateName.message}</p>
          ) : null}
        </div>
        <div>
          <label htmlFor="sp-logo" className="mb-1 block text-sm font-medium text-slate-700">
            Logo URL
          </label>
          <input id="sp-logo" type="text" placeholder="https://…" {...register("logoUrl")} className={inputCls} />
          {errors.logoUrl ? (
            <p className="mt-1 text-xs text-rose-600">Enter a full link starting with https://</p>
          ) : null}
        </div>
        <div>
          <label htmlFor="sp-amount" className="mb-1 block text-sm font-medium text-slate-700">
            Pledge amount (whole units, optional)
          </label>
          <input
            id="sp-amount"
            type="number"
            min={0}
            step={1}
            {...register("amountWhole", { valueAsNumber: true })}
            className={inputCls}
          />
          {errors.amountWhole ? (
            <p className="mt-1 text-xs text-rose-600">Enter 0 or more.</p>
          ) : null}
        </div>
        <div>
          <label htmlFor="sp-currency" className="mb-1 block text-sm font-medium text-slate-700">
            Currency
          </label>
          <select id="sp-currency" {...register("currency")} className={inputCls}>
            <option value="USD">USD</option>
            <option value="ETB">ETB</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
        <div>
          <label htmlFor="sp-type" className="mb-1 block text-sm font-medium text-slate-700">
            Type
          </label>
          <select id="sp-type" {...register("type")} className={inputCls}>
            {SPONSORSHIP_TYPES.map((t) => (
              <option key={t} value={t} className="capitalize">
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sp-message" className="mb-1 block text-sm font-medium text-slate-700">
            Message
          </label>
          <input id="sp-message" type="text" maxLength={500} {...register("message")} className={inputCls} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isPending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function SponsorEditor({ sponsor, onDone }: { sponsor: Sponsorship; onDone: () => void }) {
  const update = useMutation({
    mutationFn: (v: FormValues) => sponsorshipsApi.update(sponsor._id, toPayload(v)),
    onSuccess: () => {
      toast.success(`Changes to ${sponsor.corporateName} have been saved.`);
      onDone();
    },
    onError: (err) => {
      console.error("Update sponsor failed:", err);
      toast.error(
        err instanceof ApiError
          ? err.messages[0]
          : "We couldn't save changes to this sponsor. Please try again.",
      );
    },
  });

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
      <SponsorForm
        key={sponsor._id}
        initial={{
          corporateName: sponsor.corporateName,
          logoUrl: sponsor.logoUrl ?? "",
          amountWhole: sponsor.amount != null ? sponsor.amount / 100 : undefined,
          currency: sponsor.currency,
          message: sponsor.message ?? "",
          type: sponsor.type,
        }}
        submitLabel="Save changes"
        isPending={update.isPending}
        onSubmit={(v) => update.mutate(v)}
        onCancel={onDone}
      />
    </div>
  );
}
