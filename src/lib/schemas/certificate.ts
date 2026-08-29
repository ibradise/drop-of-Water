import { z } from "zod";
import { CERTIFICATE_TYPES, BADGE_LEVELS } from "@/lib/enums";

export const certificateSchema = z.object({
  id: z.string(),
  type: z.enum(CERTIFICATE_TYPES),
  title: z.string(),
  description: z.string(),
  badgeLevel: z.enum(BADGE_LEVELS),
  recipient: z.object({
    id: z.string().optional(),
    name: z.string(),
  }),
  totalAmount: z.number().int().min(0),
  totalHours: z.number().int().min(0),
  currency: z.string().nullable(),
  relatedCampaignIds: z.array(z.string()),
  certificateCode: z.string(),
  isPublic: z.boolean().optional(),
  issuedAt: z.string(),
  version: z.number().int().min(1),
  supersededAt: z.string().nullable().optional(),
});
export type Certificate = z.infer<typeof certificateSchema>;

export const generateCertificateSchema = z
  .object({
    type: z.enum(CERTIFICATE_TYPES),
    campaignIds: z.array(z.string()).max(100).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  })
  .strict();
export type GenerateCertificateInput = z.infer<typeof generateCertificateSchema>;

export const setCertificateVisibilitySchema = z
  .object({
    isPublic: z.boolean(),
  })
  .strict();
export type SetCertificateVisibilityInput = z.infer<typeof setCertificateVisibilitySchema>;
