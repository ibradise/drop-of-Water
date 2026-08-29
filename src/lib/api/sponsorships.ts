import { api } from "@/lib/api/client";
import { paginatedSchema, type PaginationParams, type Paginated } from "@/lib/schemas/pagination";
import {
  sponsorshipSchema,
  createSponsorshipSchema,
  updateSponsorshipSchema,
  type Sponsorship,
  type CreateSponsorshipInput,
  type UpdateSponsorshipInput,
} from "@/lib/schemas/sponsorship";

const paginatedSponsorship = paginatedSchema(sponsorshipSchema);

export const sponsorshipsApi = {
  listForCampaign: (campaignId: string, params?: PaginationParams) =>
    api
      .get<unknown>(`/campaigns/${campaignId}/sponsorships`, {
        query: params as Record<string, unknown> | undefined,
      })
      .then((data) => paginatedSponsorship.parse(data) as Paginated<Sponsorship>),

  create: (campaignId: string, body: CreateSponsorshipInput) => {
    const validated = createSponsorshipSchema.parse(body);
    return api
      .post<Sponsorship>(`/campaigns/${campaignId}/sponsorships`, validated)
      .then((s) => sponsorshipSchema.parse(s));
  },

  update: (id: string, body: UpdateSponsorshipInput) => {
    const validated = updateSponsorshipSchema.parse(body);
    return api.patch<Sponsorship>(`/sponsorships/${id}`, validated).then((s) => sponsorshipSchema.parse(s));
  },

  remove: (id: string) => api.delete<unknown>(`/sponsorships/${id}`),
};
