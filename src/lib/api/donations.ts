import { api } from "@/lib/api/client";
import { paginatedSchema, type PaginationParams } from "@/lib/schemas/pagination";
import {
  donationSchema,
  createDonationSchema,
  reviewDonationSchema,
  createDonationResultSchema,
  type CreateDonationInput,
  type ReviewDonationInput,
} from "@/lib/schemas/donation";
import {
  toDonation,
  toDonationList,
  type RawPaginatedDonation,
  type RawDonation,
  type RawDonationCreateResult,
} from "@/lib/transformers/donation";

const paginatedDonation = paginatedSchema(donationSchema);

export const donationsApi = {
  create: (body: CreateDonationInput, opts?: { skipAuth?: boolean }) => {
    const validated = createDonationSchema.parse(body);
    return api
      .post<RawDonationCreateResult>("/donations", validated, { skipAuth: opts?.skipAuth })
      .then((raw) => createDonationResultSchema.parse({ donation: toDonation(raw.donation), checkout: raw.checkout }));
  },

  forCampaign: (campaignId: string, params?: PaginationParams) =>
    api.get<RawPaginatedDonation>(`/donations/campaign/${campaignId}`, {query: params as Record<string, unknown> | undefined})
      .then((raw) => toDonationList(raw))
      .then((list) => paginatedDonation.parse(list)),

  mine: (params?: PaginationParams & { status?: string }) =>
    api
      .get<RawPaginatedDonation>("/donations/me", { query: params as Record<string, unknown> | undefined })
      .then((raw) => toDonationList(raw))
      .then((list) => paginatedDonation.parse(list)),

  list: (
    params: PaginationParams & {
      status?: string;
      paymentMethod?: string;
      campaignId?: string;
      projectId?: string;
    },
  ) =>
    api
      .get<RawPaginatedDonation>("/donations", { query: params as Record<string, unknown> })
      .then((raw) => toDonationList(raw))
      .then((list) => paginatedDonation.parse(list)),

  reviewQueue: (params?: PaginationParams) =>
    api
      .get<RawPaginatedDonation>("/donations/review-queue", {
        query: params as Record<string, unknown> | undefined,
      })
      .then((raw) => toDonationList(raw))
      .then((list) => paginatedDonation.parse(list)),

  get: (id: string) =>
    api
      .get<RawDonation>(`/donations/${id}`)
      .then((raw) => toDonation(raw))
      .then((d) => donationSchema.parse(d)),

  review: (id: string, body: ReviewDonationInput) => {
    const validated = reviewDonationSchema.parse(body);
    return api
      .patch<RawDonation>(`/donations/${id}/review`, validated)
      .then((raw) => toDonation(raw))
      .then((d) => donationSchema.parse(d));
  },

  refund: (id: string) =>
    api
      .post<RawDonation>(`/donations/${id}/refund`)
      .then((raw) => toDonation(raw))
      .then((d) => donationSchema.parse(d)),

  remove: (id: string) => api.delete(`/donations/${id}`),
};