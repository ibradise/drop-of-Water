"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Filter, Plus } from "lucide-react";
import { adminApi } from "@/lib/api/admin";
import { Card, CardContent, EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { ProjectStatusBadge } from "@/components/ui/status-badges";
import { ProgressBar } from "@/components/progress-bar";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/enums";

export default function AdminProjectsPage() {
  const [status, setStatus] = useState<ProjectStatus | null>(null);

  const q = useQuery({
    queryKey: ["admin", "projects", { status }],
    queryFn: () =>
      adminApi.projects({
        page: 1,
        limit: 50,
        status: status ?? undefined,
      }),
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Projects</h2>
          <p className="text-sm text-slate-500">
            All water-infrastructure projects across their lifecycle.
          </p>
        </div>
        <Link href="/admin/projects/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </Link>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
            <Filter className="h-3 w-3" /> Filters
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip active={status === null} onClick={() => setStatus(null)}>
              All
            </FilterChip>
            {PROJECT_STATUSES.map((s) => (
              <FilterChip key={s} active={status === s} onClick={() => setStatus(s)}>
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
          title="We couldn't load projects"
          description="Something went wrong on our side. Please try again. If it keeps failing, contact support."
          action={
            <Button variant="outline" onClick={() => q.refetch()}>
              Retry
            </Button>
          }
        />
      ) : !q.data ? null : q.data.data.length === 0 ? (
        <EmptyState
          title="No projects match the filter"
          description="Try clearing or changing your filter."
          action={
            <Button variant="outline" onClick={() => setStatus(null)}>
              Clear filter
            </Button>
          }
        />
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {q.data.data.map((p) => (
              <li key={p._id}>
                <Link
                  href={`/admin/projects/${p._id}/manage`}
                  className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <ProjectStatusBadge status={p.status} />
                    </div>
                    <div className="mt-1 truncate text-sm font-medium text-slate-900">
                      {p.title}
                    </div>
                    <div className="mt-2 max-w-sm">
                      <ProgressBar value={p.currentFunding} max={p.budget} />
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      <Money cents={p.currentFunding} currency={p.currency} /> of{" "}
                      <Money cents={p.budget} currency={p.currency} />
                      {typeof p.estimatedPeopleServed === "number" &&
                      p.estimatedPeopleServed > 0
                        ? ` · ~${p.estimatedPeopleServed.toLocaleString()} people served`
                        : null}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
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