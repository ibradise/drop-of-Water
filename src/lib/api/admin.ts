import { api } from "@/lib/api/client";
import { paginatedSchema } from "@/lib/schemas/pagination";
import { adminReviewQueueSchema, adminDashboardSummarySchema, type AdminDashboardSummary } from "@/lib/schemas/admin";
import { campaignSchema } from "@/lib/schemas/campaign";
import { donationSchema, reviewDonationSchema } from "@/lib/schemas/donation";
import { impactUpdateSchema, approveImpactUpdateSchema, rejectImpactUpdateSchema } from "@/lib/schemas/impact-update";
import { projectSchema } from "@/lib/schemas/project";
import { toCampaignList, type RawPaginatedCampaign } from "@/lib/transformers/campaign";
import { toDonation, toDonationList, type RawDonation, type RawPaginatedDonation } from "@/lib/transformers/donation";
import { toImpactUpdate, toImpactUpdateList, type RawImpactUpdate, type RawPaginatedImpactUpdate } from "@/lib/transformers/impact-update";
import { toProjectList, type RawPaginatedProject } from "@/lib/transformers/project";

const paginatedProject = paginatedSchema(projectSchema);
const paginatedCampaign = paginatedSchema(campaignSchema);
const paginatedDonation = paginatedSchema(donationSchema);
const paginatedImpactUpdate = paginatedSchema(impactUpdateSchema);

export const adminApi = {
  dashboardSummary: () =>
    api.get<AdminDashboardSummary>("/admin/dashboard/summary").then((data) => adminDashboardSummarySchema.parse(data)),

  reviewQueue: (params?: { page?: number; limit?: number }) =>
    api
      .get<AdminReviewQueueRaw>("/admin/review-queue", { query: params as Record<string, unknown> | undefined })
      .then((raw) => ({
        donations: toDonationList(raw.donations),
        impactUpdates: toImpactUpdateList(raw.impactUpdates),
      }))
      .then((data) => adminReviewQueueSchema.parse(data)),

  projects: (params?: { page?: number; limit?: number; status?: string }) =>
    api
      .get<RawPaginatedProject>("/admin/projects", { query: params as Record<string, unknown> | undefined })
      .then((raw) => toProjectList(raw))
      .then((data) => paginatedProject.parse(data)),

  campaigns: (params?: { page?: number; limit?: number; status?: string; projectId?: string }) =>
    api
      .get<RawPaginatedCampaign>("/admin/campaigns", { query: params as Record<string, unknown> | undefined })
      .then((raw) => toCampaignList(raw))
      .then((data) => paginatedCampaign.parse(data)),

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
      .get<RawPaginatedDonation>("/admin/donations", { query: params as Record<string, unknown> | undefined })
      .then((raw) => toDonationList(raw))
      .then((data) => paginatedDonation.parse(data)),

  pendingImpactUpdates: (params?: { page?: number; limit?: number }) =>
    api
      .get<RawPaginatedImpactUpdate>("/admin/impact-updates/pending", {
        query: params as Record<string, unknown> | undefined,
      })
      .then((raw) => toImpactUpdateList(raw))
      .then((data) => paginatedImpactUpdate.parse(data)),

  reviewDonation: (id: string, body: { approve: boolean; note?: string }) => {
    const validated = reviewDonationSchema.parse(body);
    return api
      .patch<RawDonation>(`/admin/donations/${id}/review`, validated)
      .then((raw) => toDonation(raw))
      .then((data) => donationSchema.parse(data));
  },

  approveImpactUpdate: (id: string, body: { publishedAt?: string } = {}) => {
    const validated = approveImpactUpdateSchema.parse(body);
    return api
      .patch<RawImpactUpdate>(`/admin/impact-updates/${id}/approve`, validated)
      .then((raw) => toImpactUpdate(raw))
      .then((data) => impactUpdateSchema.parse(data));
  },

  rejectImpactUpdate: (id: string, body: { reason?: string } = {}) => {
    const validated = rejectImpactUpdateSchema.parse(body);
    return api
      .patch<RawImpactUpdate>(`/admin/impact-updates/${id}/reject`, validated)
      .then((raw) => toImpactUpdate(raw))
      .then((data) => impactUpdateSchema.parse(data));
  },
};

type AdminReviewQueueRaw = {
  donations: RawPaginatedDonation;
  impactUpdates: RawPaginatedImpactUpdate;
};