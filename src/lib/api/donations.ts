import { z } from "zod";
import { api } from "@/lib/api/client";
import { paginatedSchema, type PaginationParams, type Paginated } from "@/lib/schemas/pagination";
import {
  donationSchema,
  createDonationSchema,
  reviewDonationSchema,
  type Donation,
  type CreateDonationInput,
  type ReviewDonationInput,
} from "@/lib/schemas/donation";
import { PAYMENT_METHODS } from "@/lib/enums";

const paginatedDonation = paginatedSchema(donationSchema);

const donationCreateResponseSchema = z.object({
  donation: donationSchema,
  checkout: z
    .object({
      checkoutUrl: z.string().url().optional(),
      transactionRef: z.string().optional(),
      gateway: z.enum(PAYMENT_METHODS),
    })
    .optional(),
});

export type CreateDonationResult = z.infer<typeof donationCreateResponseSchema>;

export const donationsApi = {
  create: (body: CreateDonationInput, opts?: { skipAuth?: boolean }) => {
    const validated = createDonationSchema.parse(body);
    return api
      .post<unknown>("/donations", validated, { skipAuth: opts?.skipAuth })
      .then((data) => donationCreateResponseSchema.parse(data) as CreateDonationResult);
  },

  forCampaign: (campaignId: string, params?: PaginationParams) =>
    api
      .get<unknown>(`/donations/campaign/${campaignId}`, {
        query: params as Record<string, unknown> | undefined,
      })
      .then((data) => paginatedDonation.parse(data) as Paginated<Donation>),

  mine: (params?: PaginationParams) =>
    api
      .get<unknown>("/donations/me", { query: params as Record<string, unknown> | undefined })
      .then((data) => paginatedDonation.parse(data) as Paginated<Donation>),

  list: (
    params: PaginationParams & {
      status?: string;
      paymentMethod?: string;
      campaignId?: string;
      projectId?: string;
    },
  ) =>
    api
      .get<unknown>("/donations", { query: params as Record<string, unknown> })
      .then((data) => paginatedDonation.parse(data) as Paginated<Donation>),

  reviewQueue: (params?: PaginationParams) =>
    api
      .get<unknown>("/donations/review-queue", {
        query: params as Record<string, unknown> | undefined,
      })
      .then((data) => paginatedDonation.parse(data) as Paginated<Donation>),

  get: (id: string) => api.get<Donation>(`/donations/${id}`).then((d) => donationSchema.parse(d)),

  review: (id: string, body: ReviewDonationInput) => {
    const validated = reviewDonationSchema.parse(body);
    return api.patch<Donation>(`/donations/${id}/review`, validated).then((d) => donationSchema.parse(d));
  },

  refund: (id: string) => api.post<Donation>(`/donations/${id}/refund`),

  remove: (id: string) => api.delete<unknown>(`/donations/${id}`),
};
