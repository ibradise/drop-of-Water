import Link from "next/link";
import { Droplets, MapPin, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { ProjectStatusBadge } from "@/components/ui/status-badges";
import { ProgressBar } from "@/components/progress-bar";
import type { Project } from "@/lib/schemas/project";

export function ProjectCard({ project }: { project: Project }) {
  const percent =
    project.budget > 0
      ? Math.min(100, Math.round((project.currentFunding / project.budget) * 100))
      : 0;
  return (
    <Link
      href={`/projects/${project._id}`}
      className="group block focus:outline-none"
    >
      <Card className="h-full overflow-hidden">
        <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
          {project.photos[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.photos[0]}
              alt={project.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200/50">
              <Droplets className="h-10 w-10 text-slate-300" />
            </div>
          )}
          <div className="absolute left-3 top-3">
            <ProjectStatusBadge status={project.status} />
          </div>
        </div>
        <CardHeader>
          <CardTitle className="line-clamp-2 group-hover:text-sky-700">
            {project.title}
          </CardTitle>
          {project.shortDescription ? (
            <CardDescription className="line-clamp-2">
              {project.shortDescription}
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div>
            <div className="mb-1.5 flex items-baseline justify-between text-sm">
              <span className="font-semibold text-slate-900">
                <Money cents={project.currentFunding} currency={project.currency} />
              </span>
              <span className="text-xs text-slate-500">
                {percent}% of{" "}
                <Money cents={project.budget} currency={project.currency} />
              </span>
            </div>
            <ProgressBar value={project.currentFunding} max={project.budget} />
          </div>
          {project.estimatedPeopleServed ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Users className="h-3.5 w-3.5" />
              {project.estimatedPeopleServed.toLocaleString()} people served
            </div>
          ) : null}
          {project.gpsCoordinates ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5" />
              {project.gpsCoordinates}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}
