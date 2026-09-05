import type { Metadata } from "next";
import { ProjectsList } from "@/components/projects-list";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/enums";

export const metadata: Metadata = {
  title: "Projects — Drop of Water",
  description: "Browse water-infrastructure projects that need your support.",
};

type SearchParams = Promise<{ status?: string | string[] }>;

export default async function ProjectsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const initialStatus = (PROJECT_STATUSES as readonly string[]).includes(raw ?? "")
    ? (raw as ProjectStatus)
    : null;

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-sky-700">
          All projects
        </span>
        <h1 className="text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Real wells. Real water. Real communities.
        </h1>
        <p className="max-w-2xl text-slate-600">
          Every project is a real water-infrastructure initiative on the
          ground — wells, boreholes, and spring protection. Pick one to see
          its story, milestones, and proof of impact.
        </p>
      </header>
      <ProjectsList initialStatus={initialStatus} />
    </div>
  );
}
