import { z } from "zod";
import { CAMPAIGN_STATUSES, PROJECT_STATUSES } from "@/lib/enums";

export const campaignParticipantSchema = z.object({
  _id: z.string().optional(),
  userId: z.string(),
  role: z.string().max(50).default("fundraiser"),
  joinedAt: z.string(),
});

export const campaignSchema = z.object({
  _id: z.string(),
  projectId: z.string(),
  title: z.string().max(200),
  summary: z.string().max(500).optional(),
  story: z.string().optional(),
  goalAmount: z.number().int().min(0),
  currentAmount: z.number().int().min(0),
  currency: z.string().length(3),
  dropsGoal: z.number().int().min(0).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(CAMPAIGN_STATUSES),
  joinable: z.boolean(),
  participants: z.array(campaignParticipantSchema),
  photos: z.array(z.string().url()),
  createdBy: z.string().optional(),
  contentManagerId: z.string().optional(),
  approvedBy: z.string().optional(),
  updatedBy: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  sponsorships: z.array(z.any()).optional(),
});
export type Campaign = z.infer<typeof campaignSchema>;

export const createCampaignSchema = z
  .object({
    projectId: z.string().min(1),
    title: z.string().min(1).max(200),
    summary: z.string().max(500).optional(),
    story: z.string().optional(),
    goalAmount: z.number().int().min(0),
    currency: z.string().length(3).optional(),
    dropsGoal: z.number().int().min(0).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    joinable: z.boolean().optional(),
    photos: z.array(z.string().url()).optional(),
  })
  .strict();
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const updateCampaignSchema = createCampaignSchema
  .omit({ projectId: true })
  .extend({
    status: z.enum(CAMPAIGN_STATUSES).optional(),
    contentManagerId: z.string().optional(),
  })
  .partial();
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
