export const ROLES = [
  "donor",
  "campaign_creator",
  "chapter_leader",
  "content_contributor",
  "content_manager",
  "digital_coordinator",
  "project_manager",
  "site_engineer",
  "program_director",
  "finance_admin",
  "system_admin",
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_GROUPS = {
  campaignCreators: [
    "campaign_creator",
    "chapter_leader",
    "content_contributor",
    "content_manager",
    "digital_coordinator",
    "program_director",
    "system_admin",
  ],
  campaignManagers: ["content_manager", "digital_coordinator", "program_director", "system_admin"],
  projectManagers: ["program_director", "system_admin"],
  deliveryTeam: ["program_director", "system_admin", "project_manager", "site_engineer"],
  contentContributors: [
    "content_contributor",
    "content_manager",
    "chapter_leader",
    "site_engineer",
    "project_manager",
    "digital_coordinator",
    "program_director",
    "system_admin",
  ],
  contentManagers: ["content_manager", "digital_coordinator", "program_director", "system_admin"],
  finance: ["finance_admin", "program_director", "system_admin"],
  sponsorshipManagers: ["system_admin", "program_director", "finance_admin"],
  adminDashboard: ["program_director", "finance_admin", "system_admin"],
} as const satisfies Record<string, readonly Role[]>;

export const ENTITY_TYPES = [
  "individual",
  "university",
  "corporate",
  "celebrity",
  "diaspora",
  "chapter",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const PROJECT_STATUSES = [
  "draft",
  "assessment",
  "fundable",
  "funded",
  "in_progress",
  "completed",
  "archived",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const CAMPAIGN_STATUSES = [
  "draft",
  "pending_approval",
  "active",
  "paused",
  "completed",
  "cancelled",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const DONATION_STATUSES = [
  "pending",
  "manual_review",
  "completed",
  "failed",
  "refunded",
] as const;
export type DonationStatus = (typeof DONATION_STATUSES)[number];

export const IMPACT_UPDATE_STATUSES = ["draft", "submitted", "published", "rejected"] as const;
export type ImpactUpdateStatus = (typeof IMPACT_UPDATE_STATUSES)[number];

export const SPONSORSHIP_TYPES = ["matching", "milestone", "campus_sponsor", "general"] as const;
export type SponsorshipType = (typeof SPONSORSHIP_TYPES)[number];

export const CERTIFICATE_TYPES = ["fundraising", "volunteer_time"] as const;
export type CertificateType = (typeof CERTIFICATE_TYPES)[number];

export const BADGE_LEVELS = ["bronze", "silver", "gold", "champion"] as const;
export type BadgeLevel = (typeof BADGE_LEVELS)[number];

export const PAYMENT_METHODS = ["chapa", "zeffy", "paypal", "stripe", "manual"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const ATTACHMENT_TYPES = ["image", "video", "pdf", "report"] as const;
export type AttachmentType = (typeof ATTACHMENT_TYPES)[number];

export const HIGH_VALUE_DONATION_THRESHOLD = 500_000;
export const DEFAULT_CURRENCY = "ETB";
export const SPONSORSHIP_DEFAULT_CURRENCY = "USD";

export const CERTIFICATE_TIERS = {
  fundraising: { bronze: 1_000, silver: 10_000, gold: 50_000, champion: 250_000 },
  volunteer_time: { bronze: 10, silver: 50, gold: 150, champion: 500 },
} as const;

export function hasAnyRole(userRoles: readonly Role[], allowed: readonly Role[]): boolean {
  return allowed.some((r) => userRoles.includes(r));
}
