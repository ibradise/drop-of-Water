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
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Projects</h1>
        <p className="max-w-2xl text-slate-600">
          Every project is a real water-infrastructure initiative on the ground — wells, boreholes,
          and spring protection. Pick one to see its story, milestones, and proof of impact.
        </p>
      </header>
      <ProjectsList initialStatus={initialStatus} />
    </div>
  );
}
