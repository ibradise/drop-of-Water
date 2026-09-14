import { api } from "@/lib/api/client";
import { paginatedSchema, type PaginationParams, type Paginated } from "@/lib/schemas/pagination";
import {
  projectSchema,
  createProjectSchema,
  updateProjectSchema,
  type Project,
  type CreateProjectInput,
  type UpdateProjectInput,
  type Milestone,
  type MilestoneInput,
  type CostItem,
  type ProofOfImpact,
} from "@/lib/schemas/project";

const paginatedProject = paginatedSchema(projectSchema);

export const projectsApi = {
  list: (params?: PaginationParams & { status?: string }) =>
    api
      .get<unknown>("/projects", {
        query: params as Record<string, unknown> | undefined,
      })
      .then((data) => paginatedProject.parse(data) as Paginated<Project>),

  // list: (params?: PaginationParams & { status?: string }) =>
  //   api
  //     .get<unknown>("/projects", {
  //       query: params as Record<string, unknown> | undefined,
  //     })
  //     .then((data) => data as Paginated<Project>),

  fundable: (params?: PaginationParams) =>
    api
      .get<unknown>("/projects/fundable", {
        query: params as Record<string, unknown> | undefined,
      })
      .then((data) => paginatedProject.parse(data) as Paginated<Project>),

  get: (id: string) => api.get<Project>(`/projects/${id}`).then((p) => projectSchema.parse(p)),

  create: (body: CreateProjectInput) => {
    const validated = createProjectSchema.parse(body);
    return api.post<Project>("/projects", validated).then((p) => projectSchema.parse(p));
  },

  update: (id: string, body: UpdateProjectInput) => {
    const validated = updateProjectSchema.parse(body);
    return api.patch<Project>(`/projects/${id}`, validated).then((p) => projectSchema.parse(p));
  },

  remove: (id: string) => api.delete<unknown>(`/projects/${id}`),

  addMilestones: (id: string, body: MilestoneInput | MilestoneInput[] | { items: MilestoneInput[] }) =>
    api.post<Project>(`/projects/${id}/milestones`, body).then((p) => projectSchema.parse(p)),

  updateMilestone: (id: string, milestoneId: string, body: Partial<Milestone>) =>
    api
      .patch<Project>(`/projects/${id}/milestones/${milestoneId}`, body)
      .then((p) => projectSchema.parse(p)),

  removeMilestone: (id: string, milestoneId: string) =>
    api.delete<unknown>(`/projects/${id}/milestones/${milestoneId}`),

  addCostItems: (id: string, body: CostItem | CostItem[] | { items: CostItem[] }) =>
    api.post<Project>(`/projects/${id}/cost-items`, body).then((p) => projectSchema.parse(p)),

  removeCostItem: (id: string, itemId: string) =>
    api.delete<unknown>(`/projects/${id}/cost-items/${itemId}`),

  addPhotos: (id: string, urls: string[] | { items: string[] }) =>
    api.post<Project>(`/projects/${id}/photos`, urls).then((p) => projectSchema.parse(p)),

  removePhoto: (id: string, index: number) =>
    api.delete<unknown>(`/projects/${id}/photos`, { query: { index } }),

  addProofs: (id: string, body: ProofOfImpact | ProofOfImpact[] | { items: ProofOfImpact[] }) =>
    api.post<Project>(`/projects/${id}/proofs`, body).then((p) => projectSchema.parse(p)),

  removeProof: (id: string, proofId: string) =>
    api.delete<unknown>(`/projects/${id}/proofs/${proofId}`),
};
