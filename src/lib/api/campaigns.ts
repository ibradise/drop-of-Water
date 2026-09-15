import { api } from "@/lib/api/client";
import { paginatedSchema, type PaginationParams } from "@/lib/schemas/pagination";
import {
  campaignSchema,
  createCampaignSchema,
  updateCampaignSchema,
  type CreateCampaignInput,
  type UpdateCampaignInput,
} from "@/lib/schemas/campaign";
import { toCampaign, toCampaignList, type RawPaginatedCampaign, type RawCampaign } from "@/lib/transformers/campaign";

const paginatedCampaign = paginatedSchema(campaignSchema);

export const campaignsApi = {
  list: (params?: PaginationParams & { status?: string; projectId?: string }) =>
    api
      .get<RawPaginatedCampaign>("/campaigns", { query: params as Record<string, unknown> | undefined })
      .then((raw) => toCampaignList(raw))
      .then((list) => paginatedCampaign.parse(list)),

  active: (params?: PaginationParams) =>
    api
      .get<RawPaginatedCampaign>("/campaigns/active", { query: params as Record<string, unknown> | undefined })
      .then((raw) => toCampaignList(raw))
      .then((list) => paginatedCampaign.parse(list)),

  byProject: (projectId: string, params?: PaginationParams) =>
    api
      .get<RawPaginatedCampaign>(`/campaigns/project/${projectId}`, {
        query: params as Record<string, unknown> | undefined,
      })
      .then((raw) => toCampaignList(raw))
      .then((list) => paginatedCampaign.parse(list)),

  get: (id: string, includeSponsorships?: boolean) =>
    api
      .get<RawCampaign>(`/campaigns/${id}`, {
        query: includeSponsorships ? { includeSponsorships: "true" } : undefined,
      })
      .then((raw) => toCampaign(raw))
      .then((c) => campaignSchema.parse(c)),

  create: (body: CreateCampaignInput) => {
    const validated = createCampaignSchema.parse(body);
    return api
      .post<RawCampaign>("/campaigns", validated)
      .then((raw) => toCampaign(raw))
      .then((c) => campaignSchema.parse(c));
  },

  update: (id: string, body: UpdateCampaignInput) => {
    const validated = updateCampaignSchema.parse(body);
    return api
      .patch<RawCampaign>(`/campaigns/${id}`, validated)
      .then((raw) => toCampaign(raw))
      .then((c) => campaignSchema.parse(c));
  },

  submit: (id: string) => api.post(`/campaigns/${id}/submit`),

  approve: (id: string, contentManagerId?: string) =>
    api.post(`/campaigns/${id}/approve`, { contentManagerId }),

  reject: (id: string) => api.post(`/campaigns/${id}/reject`),

  join: (id: string, role?: string) =>
    api.post(`/campaigns/${id}/join`, undefined, { query: { role } }),

  remove: (id: string) => api.delete(`/campaigns/${id}`),
};