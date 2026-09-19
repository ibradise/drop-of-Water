"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useEffect } from "react";
import Link from "next/link";
import { campaignsApi } from "@/lib/api/campaigns";
import { projectsApi } from "@/lib/api/projects";
import { type CreateCampaignInput } from "@/lib/schemas/campaign";
import { useAuth } from "@/lib/auth/context";
import { hasAnyRole, type Role } from "@/lib/enums";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { ProgressBar } from "@/components/progress-bar";

const CREATOR_ROLES: Role[] = [
  "campaign_creator",
  "chapter_leader",
  "content_contributor",
  "content_manager",
  "digital_coordinator",
  "program_director",
  "system_admin",
];

// The form works in whole units, not smallest-unit. The schema validates shape;
// we convert to smallest-unit on submit.
const formSchema = z
  .object({
    projectId: z.string().min(1, "Pick a project to back"),
    title: z.string().min(1, "Title is required").max(200),
    summary: z.string().max(500).optional(),
    story: z.string().optional(),
    goalAmount: z
      .number({ message: "Enter a valid goal" })
      .min(1, "Goal must be at least 1 ETB"),
    dropsGoal: z.number().int().min(0).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    joinable: z.boolean(),
    photosText: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.endDate && v.startDate && v.endDate < v.startDate) {
      ctx.addIssue({
        path: ["endDate"],
        code: z.ZodIssueCode.custom,
        message: "End date must be on or after the start date",
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

export default function NewCampaignPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { state } = useAuth();

  useEffect(() => {
    if (state.status === "unauthenticated") {
      router.replace("/sign-in?next=/me/campaigns/new");
    }
  }, [state, router]);

  const projectsQ = useQuery({
    queryKey: ["projects", "fundable"],
    queryFn: () => projectsApi.fundable({ page: 1, limit: 50 }),
    enabled: state.status === "authenticated",
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectId: "",
      title: "",
      summary: "",
      story: "",
      goalAmount: 10_000,
      dropsGoal: 100,
      startDate: "",
      endDate: "",
      joinable: true,
      photosText: "",
    },
  });

  const projectId = watch("projectId");
  const goalAmount = watch("goalAmount");

  const create = useMutation({
    mutationFn: (values: FormValues) => {
      const photos =
        values.photosText
          ?.split("\n")
          .map((s) => s.trim())
          .filter((s) => s.length > 0) ?? [];
      const payload: CreateCampaignInput = {
        projectId: values.projectId,
        title: values.title,
        summary: values.summary || undefined,
        story: values.story || undefined,
        goalAmount: Math.round(values.goalAmount * 100),
        currency: "ETB",
        dropsGoal: values.dropsGoal,
        startDate: values.startDate || undefined,
        endDate: values.endDate || undefined,
        joinable: values.joinable,
        photos: photos.length > 0 ? photos : undefined,
      };
      return campaignsApi.create(payload);
    },
    onSuccess: (campaign) => {
      toast.success("Campaign created as a draft. Submit it for approval when you're ready.");
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      router.push(`/me/campaigns/${campaign._id}/manage`);
    },
    onError: (err) => {
      console.error("Create campaign failed:", err);
      toast.error(
        "We couldn't create your campaign. Please check your entries and try again. If it keeps failing, contact support.",
      );
    },
  });

  if (state.status !== "authenticated") {
    return <div className="text-sm text-slate-500">Loading…</div>;
  }

  const isCreator = hasAnyRole(state.user.roles, CREATOR_ROLES);
  if (!isCreator) {
    return (
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Creator role required</CardTitle>
            <CardDescription>
              You need a campaign-creator role to start a campaign. Ask a program director or
              content manager to add the role to your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/me/campaigns">
              <Button variant="outline">Back to my campaigns</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fundable = projectsQ.data?.data ?? [];
  const selectedProject = fundable.find((p) => p._id === projectId);

  const onSubmit = handleSubmit((values) => {
    create.mutate(values);
  });

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/me/campaigns"
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        ← Back to my campaigns
      </Link>

      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Start a new campaign
        </h1>
        <p className="text-slate-600">
          Pick a project to back, set your goal, and write your story. You can edit
          everything before submitting for approval.
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Which project are you backing?</CardTitle>
            <CardDescription>
              Only fundable projects are listed. Once a project is funded, no new
              campaigns can be created against it.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {projectsQ.isLoading ? (
              <div className="h-10 animate-pulse rounded bg-slate-100" />
            ) : projectsQ.isError ? (
              <EmptyState
                title="Couldn't load fundable projects"
                description="Something went wrong talking to the API."
                action={
                  <Button variant="outline" onClick={() => projectsQ.refetch()}>
                    Retry
                  </Button>
                }
              />
            ) : fundable.length === 0 ? (
              <EmptyState
                title="No fundable projects"
                description="There are no projects in 'fundable' status right now."
              />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {fundable.map((p) => (
                  <label
                    key={p._id}
                    className={`flex cursor-pointer flex-col gap-1 rounded-md border p-3 text-sm transition-colors ${
                      projectId === p._id
                        ? "border-sky-500 bg-sky-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        value={p._id}
                        {...register("projectId")}
                        className="h-3.5 w-3.5 accent-sky-600"
                      />
                      <span className="font-medium text-slate-900">{p.title}</span>
                    </div>
                    {p.shortDescription ? (
                      <span className="line-clamp-2 pl-5 text-xs text-slate-500">
                        {p.shortDescription}
                      </span>
                    ) : null}
                  </label>
                ))}
              </div>
            )}
            {errors.projectId ? (
              <p className="text-xs text-rose-600">{errors.projectId.message}</p>
            ) : null}

            {selectedProject ? (
              <div className="mt-2 rounded-md border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="font-medium text-slate-700">Project budget</span>
                  <span>
                    <Money cents={selectedProject.currentFunding} currency={selectedProject.currency} /> of{" "}
                    <Money cents={selectedProject.budget} currency={selectedProject.currency} />
                  </span>
                </div>
                <ProgressBar
                  value={selectedProject.currentFunding}
                  max={selectedProject.budget}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your story</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3">
            <div>
              <label htmlFor="title" className="mb-1 block text-sm font-medium text-slate-700">
                Title <span className="text-rose-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                placeholder="e.g. Help us dig a well in Debre Berhan"
                {...register("title")}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              />
              {errors.title ? (
                <p className="mt-1 text-xs text-rose-600">{errors.title.message}</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="summary" className="mb-1 block text-sm font-medium text-slate-700">
                Short summary
              </label>
              <input
                id="summary"
                type="text"
                placeholder="One line that shows up on the campaign card"
                {...register("summary")}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              />
            </div>
            <div>
              <label htmlFor="story" className="mb-1 block text-sm font-medium text-slate-700">
                Story (markdown)
              </label>
              <textarea
                id="story"
                rows={5}
                placeholder="Tell donors why this campaign matters. Markdown is OK."
                {...register("story")}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Goal and timeline</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="goalAmount" className="mb-1 block text-sm font-medium text-slate-700">
                Goal (ETB) <span className="text-rose-500">*</span>
              </label>
              <input
                id="goalAmount"
                type="number"
                min={1}
                step={1}
                {...register("goalAmount", { valueAsNumber: true })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              />
              {errors.goalAmount ? (
                <p className="mt-1 text-xs text-rose-600">{errors.goalAmount.message}</p>
              ) : !goalAmount || goalAmount < 1 ? (
                <p className="mt-1 text-xs text-slate-500">
                  Enter a goal of at least 1 ETB to continue.
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="dropsGoal" className="mb-1 block text-sm font-medium text-slate-700">
                Drops goal (gamified)
              </label>
              <input
                id="dropsGoal"
                type="number"
                min={0}
                step={1}
                {...register("dropsGoal", { valueAsNumber: true })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              />
            </div>
            <div>
              <label htmlFor="startDate" className="mb-1 block text-sm font-medium text-slate-700">
                Start date
              </label>
              <input
                id="startDate"
                type="date"
                {...register("startDate")}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="mb-1 block text-sm font-medium text-slate-700">
                End date
              </label>
              <input
                id="endDate"
                type="date"
                {...register("endDate")}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              />
              {errors.endDate ? (
                <p className="mt-1 text-xs text-rose-600">{errors.endDate.message}</p>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="photosText" className="mb-1 block text-sm font-medium text-slate-700">
                Photo URLs (one per line)
              </label>
              <textarea
                id="photosText"
                rows={3}
                placeholder={"https://…\nhttps://…"}
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

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/me/campaigns")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="lg"
            isLoading={create.isPending}
            disabled={!goalAmount || goalAmount < 1}
          >
            Create draft
          </Button>
        </div>
      </form>
    </div>
  );
}
