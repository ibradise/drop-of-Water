import { z } from "zod";
import { IMPACT_UPDATE_STATUSES, ATTACHMENT_TYPES } from "@/lib/enums";
import type { ImpactUpdate } from "@/lib/schemas/impact-update";

const refString = z.union([z.string(), z.object({ _id: z.string() }).passthrough()]);
const refStringNullable = z.union([z.string(), z.null(), z.object({ _id: z.string() }).passthrough()]).nullable().optional();

export const rawImpactUpdateSchema = z.object({
  _id: z.string(),
  projectId: z.union([z.string(), z.object({ _id: z.string() }).passthrough()]),
  campaignId: z.union([z.string(), z.null(), z.object({ _id: z.string() }).passthrough()]).nullable().optional(),
  authorId: refString,
  title: z.string().max(200),
  content: z.string(),
  attachments: z.array(z.object({
    type: z.enum(ATTACHMENT_TYPES),
    url: z.string().url(),
  })).max(20).default([]),
  status: z.enum(IMPACT_UPDATE_STATUSES),
  publishedAt: z.string().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  approvedBy: refStringNullable,
  updatedBy: refString,
  createdAt: z.string(),
  updatedAt: z.string(),
}).passthrough();

export type RawImpactUpdate = z.infer<typeof rawImpactUpdateSchema>;

export const rawPaginatedImpactUpdateSchema = z.object({
  data: z.array(rawImpactUpdateSchema),
  meta: z.object({
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    totalPages: z.number().int().min(0),
    hasNextPage: z.boolean(),
    hasPrevPage: z.boolean(),
  }),
});

export type RawPaginatedImpactUpdate = z.infer<typeof rawPaginatedImpactUpdateSchema>;

function idOf(v: string | { _id: string } | null | undefined): string | null {
  if (!v) return null;
  return typeof v === 'string' ? v : v._id;
}

export function toImpactUpdate(raw: RawImpactUpdate): ImpactUpdate {
  return {
    _id: raw._id,
    projectId: typeof raw.projectId === 'string' ? raw.projectId : raw.projectId._id,
    campaignId: idOf(raw.campaignId),
    authorId: idOf(raw.authorId) ?? "",
    title: raw.title,
    content: raw.content,
    attachments: raw.attachments ?? [],
    status: raw.status,
    publishedAt: raw.publishedAt ?? null,
    rejectionReason: raw.rejectionReason ?? null,
    approvedBy: idOf(raw.approvedBy),
    updatedBy: idOf(raw.updatedBy) ?? "",
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export function toImpactUpdateList(raw: RawPaginatedImpactUpdate) {
  return {
    data: raw.data.map(toImpactUpdate),
    meta: raw.meta,
  };
}