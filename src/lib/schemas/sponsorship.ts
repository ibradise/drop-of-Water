import { z } from "zod";
import { SPONSORSHIP_TYPES } from "@/lib/enums";

export const sponsorshipSchema = z.object({
  _id: z.string(),
  campaignId: z.string(),
  corporateName: z.string().min(1).max(200),
  logoUrl: z.string().url().optional(),
  amount: z.number().int().min(0).optional(),
  currency: z.string().length(3),
  message: z.string().max(500).optional(),
  type: z.enum(SPONSORSHIP_TYPES),
  isActive: z.boolean(),
  isDeleted: z.boolean().optional(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Sponsorship = z.infer<typeof sponsorshipSchema>;

export const createSponsorshipSchema = z
  .object({
    corporateName: z.string().min(1).max(200),
    logoUrl: z.string().url().optional(),
    amount: z.number().int().min(0).optional(),
    currency: z.string().length(3).optional(),
    message: z.string().max(500).optional(),
    type: z.enum(SPONSORSHIP_TYPES).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();
export type CreateSponsorshipInput = z.infer<typeof createSponsorshipSchema>;

export const updateSponsorshipSchema = createSponsorshipSchema.partial();
export type UpdateSponsorshipInput = z.infer<typeof updateSponsorshipSchema>;
