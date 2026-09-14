import { api } from "@/lib/api/client";
import { paginatedSchema, type PaginationParams, type Paginated } from "@/lib/schemas/pagination";
import {
  campaignSchema,
  createCampaignSchema,
  updateCampaignSchema,
  type Campaign,
  type CreateCampaignInput,
  type UpdateCampaignInput,
} from "@/lib/schemas/campaign";

const paginatedCampaign = paginatedSchema(campaignSchema);

export const campaignsApi = {
  list: (params?: PaginationParams & { status?: string; projectId?: string }) =>
    api
      .get<unknown>("/campaigns", { query: params as Record<string, unknown> | undefined })
      .then((data) => paginatedCampaign.parse(data) as Paginated<Campaign>),

  // list: (params?: PaginationParams & { status?: string; projectId?: string }) =>
  // api
  //   .get<unknown>("/campaigns", { query: params as Record<string, unknown> | undefined })
  //   .then((data) => data as Paginated<Campaign>),  // <-- skip .parse()

  active: (params?: PaginationParams) =>
    api
      .get<unknown>("/campaigns/active", { query: params as Record<string, unknown> | undefined })
      .then((data) => paginatedCampaign.parse(data) as Paginated<Campaign>),

  byProject: (projectId: string, params?: PaginationParams) =>
    api
      .get<unknown>(`/campaigns/project/${projectId}`, {
        query: params as Record<string, unknown> | undefined,
      })
      .then((data) => paginatedCampaign.parse(data) as Paginated<Campaign>),

  get: (id: string, includeSponsorships?: boolean) =>
    api
      .get<unknown>(`/campaigns/${id}`, {
        query: includeSponsorships ? { includeSponsorships: "true" } : undefined,
      })
      .then((data) => campaignSchema.parse(data) as Campaign),

  create: (body: CreateCampaignInput) => {
    const validated = createCampaignSchema.parse(body);
    return api.post<Campaign>("/campaigns", validated).then((c) => campaignSchema.parse(c));
  },

  update: (id: string, body: UpdateCampaignInput) => {
    const validated = updateCampaignSchema.parse(body);
    return api.patch<Campaign>(`/campaigns/${id}`, validated).then((c) => campaignSchema.parse(c));
  },

  submit: (id: string) => api.post<Campaign>(`/campaigns/${id}/submit`),

  approve: (id: string, contentManagerId?: string) =>
    api.post<Campaign>(`/campaigns/${id}/approve`, { contentManagerId }),

  reject: (id: string) => api.post<Campaign>(`/campaigns/${id}/reject`),

  join: (id: string, role?: string) =>
    api.post<Campaign>(`/campaigns/${id}/join`, undefined, { query: { role } }),

  remove: (id: string) => api.delete<unknown>(`/campaigns/${id}`),
};
