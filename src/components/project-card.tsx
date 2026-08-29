import Link from "next/link";
import { MapPin, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { ProjectStatusBadge } from "@/components/ui/status-badges";
import type { Project } from "@/lib/schemas/project";

export function ProjectCard({ project }: { project: Project }) {
  const percent =
    project.budget > 0
      ? Math.min(100, Math.round((project.currentFunding / project.budget) * 100))
      : 0;
  return (
    <Link href={`/projects/${project._id}`} className="group block">
      <Card className="h-full transition-shadow group-hover:shadow-md">
        {project.photos[0] ? (
          <div className="aspect-[16/9] overflow-hidden rounded-t-xl bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={project.photos[0]}
              alt={project.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
            />
          </div>
        ) : (
          <div className="aspect-[16/9] rounded-t-xl bg-gradient-to-br from-sky-100 to-sky-200" />
        )}
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <ProjectStatusBadge status={project.status} />
            {project.gpsCoordinates ? (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="h-3 w-3" />
                {project.gpsCoordinates}
              </span>
            ) : null}
          </div>
          <CardTitle className="line-clamp-2 group-hover:text-sky-700">{project.title}</CardTitle>
          {project.shortDescription ? (
            <CardDescription className="line-clamp-2">
              {project.shortDescription}
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="font-medium text-slate-900">
                <Money cents={project.currentFunding} currency={project.currency} />
              </span>
              <span className="text-xs text-slate-500">
                of <Money cents={project.budget} currency={project.currency} />
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-sky-500 transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
          {project.estimatedPeopleServed ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Users className="h-3.5 w-3.5" />
              {project.estimatedPeopleServed.toLocaleString()} people served
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}
