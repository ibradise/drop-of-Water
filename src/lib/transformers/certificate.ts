import { z } from "zod";
import { CERTIFICATE_TYPES, BADGE_LEVELS } from "@/lib/enums";
import type { Certificate } from "@/lib/schemas/certificate";

export const rawCertificateSchema = z.object({
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
}).passthrough();

export type RawCertificate = z.infer<typeof rawCertificateSchema>;

export const rawPaginatedCertificateSchema = z.object({
  data: z.array(rawCertificateSchema),
  meta: z.object({
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    totalPages: z.number().int().min(0),
    hasNextPage: z.boolean(),
    hasPrevPage: z.boolean(),
  }),
});

export type RawPaginatedCertificate = z.infer<typeof rawPaginatedCertificateSchema>;

export function toCertificate(raw: RawCertificate): Certificate {
  return {
    id: raw.id,
    type: raw.type,
    title: raw.title,
    description: raw.description,
    badgeLevel: raw.badgeLevel,
    recipient: { id: raw.recipient.id, name: raw.recipient.name },
    totalAmount: raw.totalAmount,
    totalHours: raw.totalHours,
    currency: raw.currency,
    relatedCampaignIds: raw.relatedCampaignIds,
    certificateCode: raw.certificateCode,
    isPublic: raw.isPublic,
    issuedAt: raw.issuedAt,
    version: raw.version,
    supersededAt: raw.supersededAt ?? null,
  };
}

export function toCertificateList(raw: RawPaginatedCertificate) {
  return {
    data: raw.data.map(toCertificate),
    meta: raw.meta,
  };
}