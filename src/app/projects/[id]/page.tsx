import type { Metadata } from "next";
import { ProjectDetail } from "@/components/project-detail";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Project ${id} — Drop of Water`,
    description: "Project details, milestones, and proof of impact.",
  };
}

export default async function ProjectPage({ params }: { params: Params }) {
  const { id } = await params;
  return <ProjectDetail projectId={id} />;
}
