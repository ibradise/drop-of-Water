import { z } from "zod";
import { DONATION_STATUSES, PAYMENT_METHODS } from "@/lib/enums";

export const donationSchema = z.object({
  _id: z.string(),
  campaignId: z.string().nullable().optional(),
  projectId: z.string().optional(),
  donorId: z.string().nullable().optional(),
  donorSnapshot: z
    .object({
      name: z.string().optional(),
      email: z.string().optional(),
    })
    .optional(),
  amount: z.number().int().min(1),
  drops: z.number().int().optional(),
  currency: z.string().length(3),
  paymentMethod: z.enum(PAYMENT_METHODS),
  transactionId: z.string().optional(),
  paidAt: z.string().nullable().optional(),
  status: z.enum(DONATION_STATUSES),
  requiresManualReview: z.boolean(),
  message: z.string().max(1000).optional(),
  isAnonymous: z.boolean(),
  createdBy: z.string().optional(),
  updatedBy: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Donation = z.infer<typeof donationSchema>;

export const checkoutSchema = z.object({
  checkoutUrl: z.string().url().optional(),
  transactionRef: z.string().optional(),
  gateway: z.enum(PAYMENT_METHODS),
});
export type Checkout = z.infer<typeof checkoutSchema>;

export const createDonationSchema = z
  .object({
    campaignId: z.string().optional(),
    amount: z.number().int().min(1),
    paymentMethod: z.enum(PAYMENT_METHODS),
    message: z.string().max(1000).optional(),
    isAnonymous: z.boolean().optional(),
    donor: z
      .object({
        name: z.string().max(120).optional(),
        email: z.string().email().max(200).optional(),
      })
      .optional(),
  })
  .strict();
export type CreateDonationInput = z.infer<typeof createDonationSchema>;

export const reviewDonationSchema = z
  .object({
    approve: z.boolean(),
    note: z.string().max(500).optional(),
  })
  .strict();
export type ReviewDonationInput = z.infer<typeof reviewDonationSchema>;

export const createDonationResultSchema = z.object({
  donation: donationSchema,
  checkout: checkoutSchema.optional(),
});
export type CreateDonationResult = z.infer<typeof createDonationResultSchema>;
