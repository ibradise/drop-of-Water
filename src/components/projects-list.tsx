"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Frown, Search } from "lucide-react";
import { projectsApi } from "@/lib/api/projects";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/enums";
import type { Project } from "@/lib/schemas/project";
import { ProjectCard } from "@/components/project-card";
import { StatusFilter } from "@/components/status-filter";
import { EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ProjectsList({ initialStatus }: { initialStatus: ProjectStatus | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<ProjectStatus | null>(initialStatus);
  const [page, setPage] = useState(1);
  const limit = 12;

  const query = useQuery({
    queryKey: ["projects", "list", { status, page }],
    queryFn: () => projectsApi.list({ status: status ?? undefined, page, limit }),
  });

  const items = query.data?.data ?? [];
  const meta = query.data?.meta;

  const onStatusChange = (next: ProjectStatus | null) => {
    setStatus(next);
    setPage(1);
    const params = new URLSearchParams();
    if (next) params.set("status", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const showEmpty = useMemo(
    () => !query.isLoading && !query.isError && items.length === 0,
    [query.isLoading, query.isError, items.length],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <StatusFilter value={status} onChange={onStatusChange} options={PROJECT_STATUSES} />
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {meta ? (
            <span>
              {meta.total} project{meta.total === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
      </div>

      {query.isError ? (
        <EmptyState
          icon={<Frown className="h-8 w-8" />}
          title="We couldn't load projects"
          description="Something went wrong on our side. Please try again. If it keeps failing, contact support."
          action={
            <Button variant="outline" onClick={() => query.refetch()}>
              Retry
            </Button>
          }
        />
      ) : showEmpty ? (
        <EmptyState
          icon={<Search className="h-8 w-8" />}
          title="No projects found"
          description={
            status
              ? `There are no ${status.replace(/_/g, " ")} projects right now.`
              : "There are no projects to show yet."
          }
          action={
            status ? (
              <Button variant="outline" onClick={() => onStatusChange(null)}>
                Clear filter
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(query.isLoading ? Array.from({ length: 6 }, () => null) : items).map(
              (project: Project | null, i) =>
                project ? (
                  <ProjectCard key={project._id} project={project} />
                ) : (
                  <SkeletonCard key={i} />
                ),
            )}
          </div>
          {meta ? (
            <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-sm text-slate-600">
              <span>
                {meta.total === 0
                  ? "No results"
                  : `Showing ${(meta.page - 1) * meta.limit + 1}–${Math.min(
                      meta.total,
                      meta.page * meta.limit,
                    )} of ${meta.total}`}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!meta.hasPrevPage || query.isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!meta.hasNextPage || query.isFetching}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
      <div className="aspect-[16/9] animate-pulse bg-slate-100" />
      <div className="flex flex-col gap-2 p-6">
        <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
        <div className="h-5 w-3/4 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
        <div className="mt-2 h-1.5 w-full animate-pulse rounded-full bg-slate-100" />
      </div>
    </div>
  );
}
