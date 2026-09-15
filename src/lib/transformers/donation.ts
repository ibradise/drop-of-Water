import { z } from "zod";
import { DONATION_STATUSES, PAYMENT_METHODS } from "@/lib/enums";
import { checkoutSchema, type Donation } from "@/lib/schemas/donation";

export const rawDonationSchema = z.object({
  _id: z.string(),
  campaignId: z.union([z.string(), z.null(), z.object({ _id: z.string() }).passthrough()]).nullable().optional(),
  projectId: z.union([z.string(), z.undefined(), z.object({ _id: z.string() }).passthrough()]).optional(),
  donorId: z.union([z.string(), z.null(), z.object({ _id: z.string() }).passthrough()]).nullable().optional(),
  donorSnapshot: z.object({
    name: z.string().optional(),
    email: z.string().optional(),
  }).optional(),
  amount: z.union([z.number(), z.string()]),
  drops: z.number().int().optional(),
  currency: z.string().length(3),
  paymentMethod: z.enum(PAYMENT_METHODS),
  transactionId: z.string().nullable().optional(),
  paidAt: z.string().nullable().optional(),
  status: z.enum(DONATION_STATUSES),
  requiresManualReview: z.boolean(),
  message: z.string().max(1000).optional(),
  isAnonymous: z.boolean(),
  createdBy: z.union([z.string(), z.object({ _id: z.string() }).passthrough()]).optional(),
  updatedBy: z.union([z.string(), z.null(), z.object({ _id: z.string() }).passthrough()]).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).passthrough();
export type RawDonation = z.infer<typeof rawDonationSchema>;

export const rawPaginatedDonationSchema = z.object({
  data: z.array(rawDonationSchema),
  meta: z.object({
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    totalPages: z.number().int().min(0),
    hasNextPage: z.boolean(),
    hasPrevPage: z.boolean(),
  }),
});
export type RawPaginatedDonation = z.infer<typeof rawPaginatedDonationSchema>;

export type RawDonationCreateResult = {
  donation: RawDonation;
  checkout?: z.infer<typeof checkoutSchema>;
};

function idOf(v: string | { _id: string } | null | undefined): string | null {
  if (!v) return null;
  return typeof v === 'string' ? v : v._id;
}

function toNumber(v: number | string): number {
  return typeof v === 'string' ? parseFloat(v) : v;
}

export function toDonation(raw: RawDonation): Donation {
  return {
    _id: raw._id,
    campaignId: idOf(raw.campaignId),
    projectId: idOf(raw.projectId) ?? undefined,
    donorId: idOf(raw.donorId),
    donorSnapshot: raw.donorSnapshot,
    amount: toNumber(raw.amount),
    drops: raw.drops,
    currency: raw.currency,
    paymentMethod: raw.paymentMethod,
    transactionId: raw.transactionId ?? undefined,
    paidAt: raw.paidAt ?? null,
    status: raw.status,
    requiresManualReview: raw.requiresManualReview,
    message: raw.message,
    isAnonymous: raw.isAnonymous,
    createdBy: idOf(raw.createdBy) ?? undefined,
    updatedBy: idOf(raw.updatedBy),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export function toDonationList(raw: RawPaginatedDonation) {
  return {
    data: raw.data.map(toDonation),
    meta: raw.meta,
  };
}