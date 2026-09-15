import { api } from "@/lib/api/client";
import { paginatedSchema, type PaginationParams } from "@/lib/schemas/pagination";
import {
  impactUpdateSchema,
  createImpactUpdateSchema,
  updateImpactUpdateSchema,
  approveImpactUpdateSchema,
  rejectImpactUpdateSchema,
  type CreateImpactUpdateInput,
  type UpdateImpactUpdateInput,
  type ApproveImpactUpdateInput,
  type RejectImpactUpdateInput,
} from "@/lib/schemas/impact-update";
import {
  toImpactUpdate,
  toImpactUpdateList,
  type RawPaginatedImpactUpdate,
  type RawImpactUpdate,
} from "@/lib/transformers/impact-update";

const paginatedImpactUpdate = paginatedSchema(impactUpdateSchema);

export const impactUpdatesApi = {
  list: (params?: PaginationParams & { status?: string }) =>
    api
      .get<RawPaginatedImpactUpdate>("/impact-updates", { query: params as Record<string, unknown> | undefined })
      .then((raw) => toImpactUpdateList(raw))
      .then((list) => paginatedImpactUpdate.parse(list)),

  pending: (params?: PaginationParams) =>
    api
      .get<RawPaginatedImpactUpdate>("/impact-updates/pending", {
        query: params as Record<string, unknown> | undefined,
      })
      .then((raw) => toImpactUpdateList(raw))
      .then((list) => paginatedImpactUpdate.parse(list)),

  forProject: (projectId: string, params?: PaginationParams) =>
    api
      .get<RawPaginatedImpactUpdate>(`/impact-updates/project/${projectId}`, {
        query: params as Record<string, unknown> | undefined,
      })
      .then((raw) => toImpactUpdateList(raw))
      .then((list) => paginatedImpactUpdate.parse(list)),

  forCampaign: (campaignId: string, params?: PaginationParams) =>
    api
      .get<RawPaginatedImpactUpdate>(`/impact-updates/campaign/${campaignId}`, {
        query: params as Record<string, unknown> | undefined,
      })
      .then((raw) => toImpactUpdateList(raw))
      .then((list) => paginatedImpactUpdate.parse(list)),

  get: (id: string) =>
    api
      .get<RawImpactUpdate>(`/impact-updates/${id}`)
      .then((raw) => toImpactUpdate(raw))
      .then((i) => impactUpdateSchema.parse(i)),

  create: (body: CreateImpactUpdateInput) => {
    const validated = createImpactUpdateSchema.parse(body);
    return api
      .post<RawImpactUpdate>("/impact-updates", validated)
      .then((raw) => toImpactUpdate(raw))
      .then((i) => impactUpdateSchema.parse(i));
  },

  update: (id: string, body: UpdateImpactUpdateInput) => {
    const validated = updateImpactUpdateSchema.parse(body);
    return api
      .patch<RawImpactUpdate>(`/impact-updates/${id}`, validated)
      .then((raw) => toImpactUpdate(raw))
      .then((i) => impactUpdateSchema.parse(i));
  },

  submit: (id: string) =>
    api
      .post<RawImpactUpdate>(`/impact-updates/${id}/submit`)
      .then((raw) => toImpactUpdate(raw))
      .then((i) => impactUpdateSchema.parse(i)),

  approve: (id: string, body?: ApproveImpactUpdateInput) => {
    const validated = approveImpactUpdateSchema.parse(body ?? {});
    return api
      .patch<RawImpactUpdate>(`/impact-updates/${id}/approve`, validated)
      .then((raw) => toImpactUpdate(raw))
      .then((i) => impactUpdateSchema.parse(i));
  },

  reject: (id: string, body?: RejectImpactUpdateInput) => {
    const validated = rejectImpactUpdateSchema.parse(body ?? {});
    return api
      .patch<RawImpactUpdate>(`/impact-updates/${id}/reject`, validated)
      .then((raw) => toImpactUpdate(raw))
      .then((i) => impactUpdateSchema.parse(i));
  },

  remove: (id: string) => api.delete(`/impact-updates/${id}`),
};