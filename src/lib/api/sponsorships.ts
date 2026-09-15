import { api } from "@/lib/api/client";
import { paginatedSchema, type PaginationParams } from "@/lib/schemas/pagination";
import {
  sponsorshipSchema,
  createSponsorshipSchema,
  updateSponsorshipSchema,
  type CreateSponsorshipInput,
  type UpdateSponsorshipInput,
} from "@/lib/schemas/sponsorship";
import {
  toSponsorship,
  toSponsorshipList,
  type RawPaginatedSponsorship,
  type RawSponsorship,
} from "@/lib/transformers/sponsorship";

const paginatedSponsorship = paginatedSchema(sponsorshipSchema);

export const sponsorshipsApi = {
  listForCampaign: (campaignId: string, params?: PaginationParams) =>
    api
      .get<RawPaginatedSponsorship>(`/campaigns/${campaignId}/sponsorships`, {
        query: params as Record<string, unknown> | undefined,
      })
      .then((raw) => toSponsorshipList(raw))
      .then((list) => paginatedSponsorship.parse(list)),

  create: (campaignId: string, body: CreateSponsorshipInput) => {
    const validated = createSponsorshipSchema.parse(body);
    return api
      .post<RawSponsorship>(`/campaigns/${campaignId}/sponsorships`, validated)
      .then((raw) => toSponsorship(raw))
      .then((s) => sponsorshipSchema.parse(s));
  },

  update: (id: string, body: UpdateSponsorshipInput) => {
    const validated = updateSponsorshipSchema.parse(body);
    return api
      .patch<RawSponsorship>(`/sponsorships/${id}`, validated)
      .then((raw) => toSponsorship(raw))
      .then((s) => sponsorshipSchema.parse(s));
  },

  remove: (id: string) => api.delete(`/sponsorships/${id}`),
};