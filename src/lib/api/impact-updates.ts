import { api } from "@/lib/api/client";
import { paginatedSchema, type PaginationParams, type Paginated } from "@/lib/schemas/pagination";
import {
  impactUpdateSchema,
  createImpactUpdateSchema,
  updateImpactUpdateSchema,
  approveImpactUpdateSchema,
  rejectImpactUpdateSchema,
  type ImpactUpdate,
  type CreateImpactUpdateInput,
  type UpdateImpactUpdateInput,
  type ApproveImpactUpdateInput,
  type RejectImpactUpdateInput,
} from "@/lib/schemas/impact-update";

const paginatedImpactUpdate = paginatedSchema(impactUpdateSchema);

export const impactUpdatesApi = {
  list: (params?: PaginationParams & { status?: string }) =>
    api
      .get<unknown>("/impact-updates", { query: params as Record<string, unknown> | undefined })
      .then((data) => paginatedImpactUpdate.parse(data) as Paginated<ImpactUpdate>),

  pending: (params?: PaginationParams) =>
    api
      .get<unknown>("/impact-updates/pending", {
        query: params as Record<string, unknown> | undefined,
      })
      .then((data) => paginatedImpactUpdate.parse(data) as Paginated<ImpactUpdate>),

  forProject: (projectId: string, params?: PaginationParams) =>
    api
      .get<unknown>(`/impact-updates/project/${projectId}`, {
        query: params as Record<string, unknown> | undefined,
      })
      .then((data) => paginatedImpactUpdate.parse(data) as Paginated<ImpactUpdate>),

  forCampaign: (campaignId: string, params?: PaginationParams) =>
    api
      .get<unknown>(`/impact-updates/campaign/${campaignId}`, {
        query: params as Record<string, unknown> | undefined,
      })
      .then((data) => paginatedImpactUpdate.parse(data) as Paginated<ImpactUpdate>),

  get: (id: string) =>
    api.get<ImpactUpdate>(`/impact-updates/${id}`).then((i) => impactUpdateSchema.parse(i)),

  create: (body: CreateImpactUpdateInput) => {
    const validated = createImpactUpdateSchema.parse(body);
    return api
      .post<ImpactUpdate>("/impact-updates", validated)
      .then((i) => impactUpdateSchema.parse(i));
  },

  update: (id: string, body: UpdateImpactUpdateInput) => {
    const validated = updateImpactUpdateSchema.parse(body);
    return api
      .patch<ImpactUpdate>(`/impact-updates/${id}`, validated)
      .then((i) => impactUpdateSchema.parse(i));
  },

  submit: (id: string) => api.post<ImpactUpdate>(`/impact-updates/${id}/submit`),

  approve: (id: string, body?: ApproveImpactUpdateInput) => {
    const validated = approveImpactUpdateSchema.parse(body ?? {});
    return api
      .patch<ImpactUpdate>(`/impact-updates/${id}/approve`, validated)
      .then((i) => impactUpdateSchema.parse(i));
  },

  reject: (id: string, body?: RejectImpactUpdateInput) => {
    const validated = rejectImpactUpdateSchema.parse(body ?? {});
    return api
      .patch<ImpactUpdate>(`/impact-updates/${id}/reject`, validated)
      .then((i) => impactUpdateSchema.parse(i));
  },

  remove: (id: string) => api.delete<unknown>(`/impact-updates/${id}`),
};
