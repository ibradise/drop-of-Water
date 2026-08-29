import { z } from "zod";
import { IMPACT_UPDATE_STATUSES, ATTACHMENT_TYPES } from "@/lib/enums";

export const attachmentSchema = z.object({
  type: z.enum(ATTACHMENT_TYPES),
  url: z.string().url(),
});
export type Attachment = z.infer<typeof attachmentSchema>;

export const impactUpdateSchema = z.object({
  _id: z.string(),
  projectId: z.union([z.string(), z.any()]),
  campaignId: z.union([z.string(), z.any()]).nullable().optional(),
  authorId: z.union([z.string(), z.any()]).optional(),
  title: z.string().max(200),
  content: z.string(),
  attachments: z.array(attachmentSchema).max(20),
  status: z.enum(IMPACT_UPDATE_STATUSES),
  publishedAt: z.string().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  approvedBy: z.string().nullable().optional(),
  updatedBy: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ImpactUpdate = z.infer<typeof impactUpdateSchema>;

export const createImpactUpdateSchema = z
  .object({
    projectId: z.string().min(1),
    campaignId: z.string().optional(),
    title: z.string().min(1).max(200),
    content: z.string().min(1),
    attachments: z.array(attachmentSchema).max(20).optional(),
  })
  .strict();
export type CreateImpactUpdateInput = z.infer<typeof createImpactUpdateSchema>;

export const updateImpactUpdateSchema = z
  .object({
    campaignId: z.string().optional(),
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1).optional(),
    attachments: z.array(attachmentSchema).max(20).optional(),
    status: z.enum(IMPACT_UPDATE_STATUSES).optional(),
  })
  .strict();
export type UpdateImpactUpdateInput = z.infer<typeof updateImpactUpdateSchema>;

export const approveImpactUpdateSchema = z
  .object({
    publishedAt: z.string().optional(),
  })
  .strict();
export type ApproveImpactUpdateInput = z.infer<typeof approveImpactUpdateSchema>;

export const rejectImpactUpdateSchema = z
  .object({
    reason: z.string().max(1000).optional(),
  })
  .strict();
export type RejectImpactUpdateInput = z.infer<typeof rejectImpactUpdateSchema>;
