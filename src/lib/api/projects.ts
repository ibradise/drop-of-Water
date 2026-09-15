import { api } from "@/lib/api/client";
import { paginatedSchema, type PaginationParams } from "@/lib/schemas/pagination";
import {
  projectSchema,
  createProjectSchema,
  updateProjectSchema,
  type CreateProjectInput,
  type UpdateProjectInput,
  type CostItem,
  type MilestoneInput,
  type ProofOfImpact,
} from "@/lib/schemas/project";
import { toProject, toProjectList, type RawPaginatedProject, type RawProject } from "@/lib/transformers/project";

const paginatedProject = paginatedSchema(projectSchema);

type MilestonesBody = MilestoneInput | MilestoneInput[] | { items: MilestoneInput[] };
type CostItemsBody = CostItem | CostItem[] | { items: CostItem[] };
type ProofsBody = ProofOfImpact | ProofOfImpact[] | { items: ProofOfImpact[] };

export const projectsApi = {
  list: (params?: PaginationParams & { status?: string }) =>
    api
      .get<RawPaginatedProject>("/projects", { query: params as Record<string, unknown> | undefined })
      .then((raw) => toProjectList(raw))
      .then((list) => paginatedProject.parse(list)),

  fundable: (params?: PaginationParams) =>
    api
      .get<RawPaginatedProject>("/projects/fundable", { query: params as Record<string, unknown> | undefined })
      .then((raw) => toProjectList(raw))
      .then((list) => paginatedProject.parse(list)),

  get: (id: string) =>
    api
      .get<RawProject>(`/projects/${id}`)
      .then((raw) => toProject(raw))
      .then((p) => projectSchema.parse(p)),

  create: (body: CreateProjectInput) => {
    const validated = createProjectSchema.parse(body);
    return api
      .post<RawProject>("/projects", validated)
      .then((raw) => toProject(raw))
      .then((p) => projectSchema.parse(p));
  },

  update: (id: string, body: UpdateProjectInput) => {
    const validated = updateProjectSchema.parse(body);
    return api
      .patch<RawProject>(`/projects/${id}`, validated)
      .then((raw) => toProject(raw))
      .then((p) => projectSchema.parse(p));
  },

  remove: (id: string) =>
    api
      .delete<RawProject>(`/projects/${id}`)
      .then((raw) => toProject(raw))
      .then((p) => projectSchema.parse(p)),

  addMilestones: (id: string, body: MilestonesBody) =>
    api
      .post<RawProject>(`/projects/${id}/milestones`, body)
      .then((raw) => toProject(raw))
      .then((p) => projectSchema.parse(p)),

  updateMilestone: (id: string, milestoneId: string, body: Partial<MilestoneInput>) =>
    api
      .patch<RawProject>(`/projects/${id}/milestones/${milestoneId}`, body)
      .then((raw) => toProject(raw))
      .then((p) => projectSchema.parse(p)),

  removeMilestone: (id: string, milestoneId: string) =>
    api
      .delete<RawProject>(`/projects/${id}/milestones/${milestoneId}`)
      .then((raw) => toProject(raw))
      .then((p) => projectSchema.parse(p)),

  addCostItems: (id: string, body: CostItemsBody) =>
    api
      .post<RawProject>(`/projects/${id}/cost-items`, body)
      .then((raw) => toProject(raw))
      .then((p) => projectSchema.parse(p)),

  removeCostItem: (id: string, itemId: string) =>
    api
      .delete<RawProject>(`/projects/${id}/cost-items/${itemId}`)
      .then((raw) => toProject(raw))
      .then((p) => projectSchema.parse(p)),

  addPhotos: (id: string, urls: string[] | { items: string[] }) =>
    api
      .post<RawProject>(`/projects/${id}/photos`, urls)
      .then((raw) => toProject(raw))
      .then((p) => projectSchema.parse(p)),

  removePhoto: (id: string, index: number) =>
    api
      .delete<RawProject>(`/projects/${id}/photos`, { query: { index } })
      .then((raw) => toProject(raw))
      .then((p) => projectSchema.parse(p)),

  addProofs: (id: string, body: ProofsBody) =>
    api
      .post<RawProject>(`/projects/${id}/proofs`, body)
      .then((raw) => toProject(raw))
      .then((p) => projectSchema.parse(p)),

  removeProof: (id: string, proofId: string) =>
    api
      .delete<RawProject>(`/projects/${id}/proofs/${proofId}`)
      .then((raw) => toProject(raw))
      .then((p) => projectSchema.parse(p)),
};