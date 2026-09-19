"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { projectsApi } from "@/lib/api/projects";
import { campaignsApi } from "@/lib/api/campaigns";
import { impactUpdatesApi } from "@/lib/api/impact-updates";
import { Money } from "@/components/ui/money";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CampaignStatusBadge, ProjectStatusBadge } from "@/components/ui/status-badges";
import { ProgressBar } from "@/components/progress-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ApiError } from "@/lib/api/client";
import { useRouter } from "next/navigation";

export function ProjectDetail({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [photoIndex, setPhotoIndex] = useState(0);

  const projectQ = useQuery({
    queryKey: ["projects", "get", projectId],
    queryFn: () => projectsApi.get(projectId),
    retry: (count, err) => !(err instanceof ApiError && err.statusCode === 404) && count < 2,
  });

  const campaignsQ = useQuery({
    queryKey: ["campaigns", "byProject", projectId],
    queryFn: () => campaignsApi.byProject(projectId, { page: 1, limit: 10 }),
    enabled: projectQ.isSuccess,
  });

  const impactQ = useQuery({
    queryKey: ["impact-updates", "byProject", projectId],
    queryFn: () => impactUpdatesApi.forProject(projectId, { page: 1, limit: 20 }),
    enabled: projectQ.isSuccess,
  });

  if (projectQ.isLoading) return <ProjectDetailSkeleton />;

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
          <Button variant="outline" onClick={() => router.push("/projects")}>
            Back to projects
          </Button>
        </CardContent>
      </Card>
    );
  }

  const project = projectQ.data;
  const campaigns = campaignsQ.data?.data ?? [];
  const updates = impactQ.data?.data ?? [];

  if (!project) return null;

  return (
    <div className="flex flex-col gap-10">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <span aria-hidden>←</span> All projects
      </Link>

      {project.photos.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
          <div className="overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200/60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={project.photos[photoIndex]}
              alt={project.title}
              className="aspect-[16/9] w-full object-cover"
            />
            {project.photos.length > 1 ? (
              <div className="flex gap-2 p-3">
                {project.photos.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setPhotoIndex(i)}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      i === photoIndex ? "bg-slate-900" : "bg-slate-200 hover:bg-slate-300"
                    }`}
                    aria-label={`Show photo ${i + 1}`}
                  />
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <ProjectStatusBadge status={project.status} />
              {project.location ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs text-slate-600">
                  <MapPin className="h-3 w-3" />
                  {project.gpsCoordinates ??
                    `${project.location.lat.toFixed(2)}° N, ${project.location.lng.toFixed(2)}° E`}
                </span>
              ) : null}
            </div>
            <h1 className="text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {project.title}
            </h1>
            {project.shortDescription ? (
              <p className="text-lg text-slate-600">{project.shortDescription}</p>
            ) : null}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Stat
                label="Budget"
                value={<Money cents={project.budget} currency={project.currency} />}
              />
              <Stat
                label="Funded"
                value={
                  <Money
                    cents={project.currentFunding}
                    currency={project.currency}
                    emphasis="lg"
                  />
                }
                accent
              />
              {project.beneficiaryCount != null ? (
                <Stat
                  label="Beneficiaries"
                  value={project.beneficiaryCount.toLocaleString()}
                  icon={<Users className="h-3.5 w-3.5" />}
                />
              ) : null}
              {project.estimatedPeopleServed != null ? (
                <Stat
                  label="People served"
                  value={project.estimatedPeopleServed.toLocaleString()}
                  icon={<Users className="h-3.5 w-3.5" />}
                />
              ) : null}
            </div>
            <div>
              <div className="mb-1.5 flex items-baseline justify-between text-sm">
                <span className="font-semibold text-slate-900">
                  {project.budget > 0
                    ? Math.round((project.currentFunding / project.budget) * 100)
                    : 0}
                  % funded
                </span>
                <span className="text-xs text-slate-500">
                  <Money cents={project.currentFunding} currency={project.currency} /> of{" "}
                  <Money cents={project.budget} currency={project.currency} />
                </span>
              </div>
              <ProgressBar value={project.currentFunding} max={project.budget} />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <ProjectStatusBadge status={project.status} />
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {project.title}
          </h1>
        </div>
      )}

      {project.fullDescription ? (
        <section className="prose prose-slate max-w-none">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            About this project
          </h2>
          <p className="whitespace-pre-line text-slate-700">{project.fullDescription}</p>
        </section>
      ) : null}

      {project.costBreakdown.length > 0 ? (
        <section>
          <h2 className="mb-3 text-xl font-semibold tracking-tight text-slate-900">
            Cost breakdown
          </h2>
          <Card>
            <ul className="divide-y divide-slate-100">
              {project.costBreakdown.map((c) => (
                <li
                  key={c._id ?? c.item}
                  className="flex items-center justify-between gap-4 px-5 py-3 text-sm"
                >
                  <span className="text-slate-700">{c.item}</span>
                  <Money cents={c.amount} currency={project.currency} />
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      {project.milestones.length > 0 ? (
        <section>
          <h2 className="mb-3 text-xl font-semibold tracking-tight text-slate-900">
            Milestones
          </h2>
          <ol className="relative space-y-4 border-l-2 border-slate-200 pl-6">
            {project.milestones.map((m) => (
              <li key={m._id ?? m.title} className="relative">
                <span
                  className={`absolute -left-[33px] top-1 h-3 w-3 rounded-full border-2 border-white ${
                    m.status === "done"
                      ? "bg-emerald-500"
                      : m.status === "in_progress"
                        ? "bg-sky-500"
                        : "bg-slate-300"
                  }`}
                />
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900">{m.title}</h3>
                    <Badge
                      tone={
                        m.status === "done"
                          ? "success"
                          : m.status === "in_progress"
                            ? "info"
                            : "neutral"
                      }
                    >
                      {m.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  {m.description ? (
                    <p className="text-sm text-slate-600">{m.description}</p>
                  ) : null}
                  {m.completedAt ? (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <CalendarDays className="h-3 w-3" />
                      Completed {new Date(m.completedAt).toLocaleDateString()}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {project.proofOfImpact.length > 0 ? (
        <section>
          <h2 className="mb-3 text-xl font-semibold text-slate-900">Proof of impact</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {project.proofOfImpact.map((p) => (
              <Card key={p._id ?? p.url} className="overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.type} className="aspect-video w-full object-cover" />
                <CardContent className="p-4 text-sm capitalize text-slate-600">
                  {p.type}
                  {p.date ? ` · ${new Date(p.date).toLocaleDateString()}` : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-xl font-semibold text-slate-900">Campaigns</h2>
        {campaignsQ.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }, (_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : campaignsQ.isError ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-slate-500">Couldn&apos;t load campaigns.</p>
            <Button variant="outline" size="sm" onClick={() => campaignsQ.refetch()}>
              Retry
            </Button>
          </div>
        ) : campaigns.length === 0 ? (
          <p className="text-sm text-slate-500">
            No campaigns yet for this project. Check back soon.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {campaigns.map((c) => (
              <Card key={c._id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CampaignStatusBadge status={c.status} />
                  </div>
                  <CardTitle className="line-clamp-2">{c.title}</CardTitle>
                  {c.summary ? (
                    <CardDescription className="line-clamp-2">{c.summary}</CardDescription>
                  ) : null}
                </CardHeader>
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
                  <Link href={`/campaigns/${c._id}`}>
                    <Button variant="outline" size="sm" className="w-full">
                      View campaign
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {updates.length > 0 ? (
        <section>
          <h2 className="mb-3 text-xl font-semibold text-slate-900">Latest from the field</h2>
          <div className="flex flex-col gap-4">
            {updates.map((u) => (
              <Card key={u._id}>
                <CardHeader>
                  <CardTitle className="line-clamp-2">{u.title}</CardTitle>
                  <CardDescription>
                    {u.publishedAt ? new Date(u.publishedAt).toLocaleDateString() : null}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-3 whitespace-pre-line text-sm text-slate-700">
                    {u.content}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border bg-white px-3 py-2.5 ${
        accent
          ? "border-sky-200 bg-sky-50/40"
          : "border-slate-200"
      }`}
    >
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
        {icon}
        {value}
      </div>
    </div>
  );
}

function ProjectDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-6 w-32 animate-pulse rounded bg-slate-100" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="aspect-[16/9] animate-pulse rounded-2xl bg-slate-100" />
        <div className="flex flex-col gap-3">
          <div className="h-5 w-24 animate-pulse rounded bg-slate-100" />
          <div className="h-9 w-3/4 animate-pulse rounded bg-slate-100" />
          <div className="h-5 w-full animate-pulse rounded bg-slate-100" />
          <div className="h-5 w-2/3 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
