import { z } from "zod";
import { donationSchema } from "@/lib/schemas/donation";
import { impactUpdateSchema } from "@/lib/schemas/impact-update";
import { paginatedSchema } from "@/lib/schemas/pagination";

// Backend aggregates are display-only and occasionally arrive as numeric
// strings, floats, or absurdly large values (e.g. totalBudget 7.7e39 from a
// backend aggregation bug). Accept anything finite, truncate toward zero, and
// map non-finite to 0 so one bad aggregate can never blank the dashboard.
// Absurd-but-finite values pass through untouched so bad backend data stays
// visible instead of being silently zeroed.
export const aggregateNumber = z
  .union([z.number(), z.string()])
  .transform((v) => {
    const n = typeof v === "string" ? Number(v) : v;
    return Number.isFinite(n) ? Math.trunc(n) : 0;
  });

export const adminDashboardSummarySchema = z.object({
  projects: z.object({
    total: aggregateNumber,
    byStatus: z.record(z.string(), aggregateNumber),
    totalBudget: aggregateNumber,
    totalFunding: aggregateNumber,
    estimatedPeopleServed: aggregateNumber,
    beneficiaries: aggregateNumber,
  }),
  campaigns: z.object({
    total: aggregateNumber,
    byStatus: z.record(z.string(), aggregateNumber),
    pendingApproval: aggregateNumber,
    active: aggregateNumber,
    totalGoalAmount: aggregateNumber,
    totalRaisedAmount: aggregateNumber,
    goalCompletionPercent: aggregateNumber,
  }),
  donations: z.object({
    total: aggregateNumber,
    byStatus: z.record(z.string(), aggregateNumber),
    pendingManualReview: aggregateNumber,
    completedCount: aggregateNumber,
    totalRaised: aggregateNumber,
    totalDrops: aggregateNumber,
    averageDonation: aggregateNumber,
    totalRefunded: aggregateNumber,
  }),
  impactUpdates: z.object({
    total: aggregateNumber,
    byStatus: z.record(z.string(), aggregateNumber),
    pendingApproval: aggregateNumber,
    published: aggregateNumber,
  }),
  users: z.object({
    total: aggregateNumber,
    active: aggregateNumber,
  }),
  generatedAt: z.string(),
});
export type AdminDashboardSummary = z.infer<typeof adminDashboardSummarySchema>;

export const adminReviewQueueSchema = z.object({
  donations: paginatedSchema(donationSchema),
  impactUpdates: paginatedSchema(impactUpdateSchema),
});
export type AdminReviewQueue = z.infer<typeof adminReviewQueueSchema>;