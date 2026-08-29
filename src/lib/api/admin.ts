import { z } from "zod";
import { api } from "@/lib/api/client";
import { paginatedSchema } from "@/lib/schemas/pagination";
import { campaignSchema, type Campaign } from "@/lib/schemas/campaign";
import { donationSchema, type Donation } from "@/lib/schemas/donation";
import { impactUpdateSchema, type ImpactUpdate } from "@/lib/schemas/impact-update";
import { projectSchema, type Project } from "@/lib/schemas/project";

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

const paginatedProject = paginatedSchema(projectSchema);
const paginatedCampaign = paginatedSchema(campaignSchema);
const paginatedDonation = paginatedSchema(donationSchema);
const paginatedImpactUpdate = paginatedSchema(impactUpdateSchema);

export const adminApi = {
  dashboardSummary: () =>
    api
      .get<unknown>("/admin/dashboard/summary")
      .then((data) => adminDashboardSummarySchema.parse(data) as AdminDashboardSummary),

  reviewQueue: (params?: { page?: number; limit?: number }) =>
    api
      .get<unknown>("/admin/review-queue", { query: params as Record<string, unknown> | undefined })
      .then(
        (data) =>
          data as {
            donations: { data: Donation[]; meta: { total: number; page: number; limit: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean } };
            impactUpdates: { data: ImpactUpdate[]; meta: { total: number; page: number; limit: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean } };
          },
      ),

  projects: (params?: { page?: number; limit?: number; status?: string }) =>
    api
      .get<unknown>("/admin/projects", { query: params as Record<string, unknown> | undefined })
      .then((data) => paginatedProject.parse(data) as { data: Project[]; meta: { total: number; page: number; limit: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean } }),

  campaigns: (params?: { page?: number; limit?: number; status?: string; projectId?: string }) =>
    api
      .get<unknown>("/admin/campaigns", { query: params as Record<string, unknown> | undefined })
      .then((data) => paginatedCampaign.parse(data) as { data: Campaign[]; meta: { total: number; page: number; limit: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean } }),

  donations: (
    params?: {
      page?: number;
      limit?: number;
      status?: string;
      paymentMethod?: string;
      campaignId?: string;
      projectId?: string;
      highValue?: boolean;
      minAmount?: number;
    },
  ) =>
    api
      .get<unknown>("/admin/donations", { query: params as Record<string, unknown> | undefined })
      .then((data) => paginatedDonation.parse(data) as { data: Donation[]; meta: { total: number; page: number; limit: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean } }),

  pendingImpactUpdates: (params?: { page?: number; limit?: number }) =>
    api
      .get<unknown>("/admin/impact-updates/pending", {
        query: params as Record<string, unknown> | undefined,
      })
      .then((data) => paginatedImpactUpdate.parse(data) as { data: ImpactUpdate[]; meta: { total: number; page: number; limit: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean } }),
};
