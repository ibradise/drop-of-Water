import { z } from "zod";
import { SPONSORSHIP_TYPES } from "@/lib/enums";
import type { Sponsorship } from "@/lib/schemas/sponsorship";

export const rawSponsorshipSchema = z.object({
  _id: z.string(),
  campaignId: z.union([z.string(), z.object({ _id: z.string() }).passthrough()]),
  corporateName: z.string().min(1).max(200),
  logoUrl: z.string().url().optional(),
  amount: z.union([z.number(), z.string()]).optional(),
  currency: z.string().length(3),
  message: z.string().max(500).optional(),
  type: z.enum(SPONSORSHIP_TYPES),
  isActive: z.boolean(),
  isDeleted: z.boolean().optional(),
  createdBy: z.union([z.string(), z.object({ _id: z.string() }).passthrough()]).optional(),
  updatedBy: z.union([z.string(), z.object({ _id: z.string() }).passthrough()]).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).passthrough();

export type RawSponsorship = z.infer<typeof rawSponsorshipSchema>;

export const rawPaginatedSponsorshipSchema = z.object({
  data: z.array(rawSponsorshipSchema),
  meta: z.object({
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    totalPages: z.number().int().min(0),
    hasNextPage: z.boolean(),
    hasPrevPage: z.boolean(),
  }),
});

export type RawPaginatedSponsorship = z.infer<typeof rawPaginatedSponsorshipSchema>;

function idOf(v: string | { _id: string } | null | undefined): string | null {
  if (!v) return null;
  return typeof v === 'string' ? v : v._id;
}

function toNumberSafe(v: number | string | undefined): number | undefined {
  if (v === undefined) return undefined;
  return typeof v === 'string' ? parseFloat(v) : v;
}

export function toSponsorship(raw: RawSponsorship): Sponsorship {
  return {
    _id: raw._id,
    campaignId: idOf(raw.campaignId) ?? "",
    corporateName: raw.corporateName,
    logoUrl: raw.logoUrl,
    amount: toNumberSafe(raw.amount),
    currency: raw.currency,
    message: raw.message,
    type: raw.type,
    isActive: raw.isActive,
    isDeleted: raw.isDeleted,
    createdBy: idOf(raw.createdBy) ?? undefined,
    updatedBy: idOf(raw.updatedBy) ?? undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export function toSponsorshipList(raw: RawPaginatedSponsorship) {
  return {
    data: raw.data.map(toSponsorship),
    meta: raw.meta,
  };
}