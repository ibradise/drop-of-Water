import { z } from "zod";
import { CAMPAIGN_STATUSES } from "@/lib/enums";
import type { Campaign } from "@/lib/schemas/campaign";

export const rawCampaignSchema = z.object({
  _id: z.string(),
  projectId: z.union([
    z.string(),
    z.object({ _id: z.string(), title: z.string(), budget: z.number(), currency: z.string(), currentFunding: z.number(), status: z.string(), id: z.string() }),
  ]),
  title: z.string().max(200),
  summary: z.string().max(500).optional(),
  story: z.string().optional(),
  shortDescription: z.string().optional(),
  goalAmount: z.union([z.number(), z.string()]),
  currentAmount: z.union([z.number(), z.string()]),
  currency: z.string().length(3),
  dropsGoal: z.number().int().min(0).optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  status: z.enum(CAMPAIGN_STATUSES),
  joinable: z.boolean(),
  participants: z.array(z.object({
    _id: z.string().optional(),
    userId: z.string(),
    role: z.string().max(50).default("fundraiser"),
    joinedAt: z.string(),
  })),
  photos: z.array(z.string().url()),
  deletedAt: z.string().nullable().optional(),
  createdBy: z.union([
    z.string(),
    z.object({ _id: z.string(), email: z.string(), name: z.string(), roles: z.array(z.string()), id: z.string() }),
  ]),
  contentManagerId: z.union([
    z.string(),
    z.object({ _id: z.string(), email: z.string(), name: z.string(), roles: z.array(z.string()), id: z.string() }),
    z.null(),
  ]).nullable().optional(),
  approvedBy: z.union([
    z.string(),
    z.object({ _id: z.string(), email: z.string(), name: z.string(), roles: z.array(z.string()), id: z.string() }),
    z.null(),
  ]).nullable().optional(),
  updatedBy: z.union([z.string(), z.object({ _id: z.string() }), z.null()]).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  sponsorships: z.array(z.any()).optional(),
}).passthrough();
export type RawCampaign = z.infer<typeof rawCampaignSchema>;

export const rawPaginatedCampaignSchema = z.object({
  data: z.array(rawCampaignSchema),
  meta: z.object({
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    totalPages: z.number().int().min(0),
    hasNextPage: z.boolean(),
    hasPrevPage: z.boolean(),
  }),
});

export type RawPaginatedCampaign = z.infer<typeof rawPaginatedCampaignSchema>;

function toNumber(v: number | string): number {
  return typeof v === 'string' ? parseFloat(v) : v;
}

export function toCampaign(raw: RawCampaign): Campaign {
  return {
    _id: raw._id,
    projectId: typeof raw.projectId === 'string' ? raw.projectId : raw.projectId._id,
    title: raw.title,
    summary: raw.summary,
    story: raw.story,
    shortDescription: raw.shortDescription,
    goalAmount: toNumber(raw.goalAmount),
    currentAmount: toNumber(raw.currentAmount),
    currency: raw.currency,
    dropsGoal: raw.dropsGoal,
    startDate: raw.startDate ?? null,
    endDate: raw.endDate ?? null,
    status: raw.status,
    joinable: raw.joinable,
    participants: raw.participants,
    photos: raw.photos,
    createdBy: typeof raw.createdBy === 'string' ? raw.createdBy : raw.createdBy._id,
    contentManagerId: raw.contentManagerId ? (typeof raw.contentManagerId === 'string' ? raw.contentManagerId : raw.contentManagerId._id) : null,
    approvedBy: raw.approvedBy ? (typeof raw.approvedBy === 'string' ? raw.approvedBy : raw.approvedBy._id) : null,
    updatedBy: raw.updatedBy ? (typeof raw.updatedBy === 'string' ? raw.updatedBy : raw.updatedBy._id) : null,
    deletedAt: raw.deletedAt ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    sponsorships: raw.sponsorships,
  };
}

export function toCampaignList(raw: RawPaginatedCampaign) {
  return {
    data: raw.data.map(toCampaign),
    meta: raw.meta,
  };
}