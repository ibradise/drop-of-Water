import { z } from "zod";
import { donationSchema } from "@/lib/schemas/donation";
import { impactUpdateSchema } from "@/lib/schemas/impact-update";
import { paginatedSchema } from "@/lib/schemas/pagination";

export const adminDashboardSummarySchema = z.object({
  projects: z.object({
    total: z.number().int(),
    byStatus: z.record(z.string(), z.number().int()),
    totalBudget: z.number().int(),
    totalFunding: z.number().int(),
    estimatedPeopleServed: z.number().int(),
    beneficiaries: z.number().int(),
  }),
  campaigns: z.object({
    total: z.number().int(),
    byStatus: z.record(z.string(), z.number().int()),
    pendingApproval: z.number().int(),
    active: z.number().int(),
    totalGoalAmount: z.number().int(),
    totalRaisedAmount: z.number().int(),
    goalCompletionPercent: z.number(),
  }),
  donations: z.object({
    total: z.number().int(),
    byStatus: z.record(z.string(), z.number().int()),
    pendingManualReview: z.number().int(),
    completedCount: z.number().int(),
    totalRaised: z.number().int(),
    totalDrops: z.number().int(),
    averageDonation: z.number().int(),
    totalRefunded: z.number().int(),
  }),
  impactUpdates: z.object({
    total: z.number().int(),
    byStatus: z.record(z.string(), z.number().int()),
    pendingApproval: z.number().int(),
    published: z.number().int(),
  }),
  users: z.object({
    total: z.number().int(),
    active: z.number().int(),
  }),
  generatedAt: z.string(),
});
export type AdminDashboardSummary = z.infer<typeof adminDashboardSummarySchema>;

export const adminReviewQueueSchema = z.object({
  donations: paginatedSchema(donationSchema),
  impactUpdates: paginatedSchema(impactUpdateSchema),
});
export type AdminReviewQueue = z.infer<typeof adminReviewQueueSchema>;