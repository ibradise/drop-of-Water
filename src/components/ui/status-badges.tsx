import type {
  ProjectStatus,
  CampaignStatus,
  DonationStatus,
  ImpactUpdateStatus,
} from "@/lib/enums";
import { Badge, type Tone } from "@/components/ui/badge";

export function projectStatusTone(status: ProjectStatus): Tone {
  switch (status) {
    case "fundable":
      return "success";
    case "funded":
    case "in_progress":
      return "info";
    case "completed":
      return "success";
    case "draft":
    case "assessment":
      return "neutral";
    case "archived":
      return "warning";
    default:
      return "neutral";
  }
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge tone={projectStatusTone(status)}>{status.replace(/_/g, " ")}</Badge>;
}

export function campaignStatusTone(status: CampaignStatus): Tone {
  switch (status) {
    case "active":
      return "success";
    case "paused":
      return "warning";
    case "pending_approval":
      return "info";
    case "completed":
      return "success";
    case "cancelled":
      return "danger";
    case "draft":
      return "neutral";
    default:
      return "neutral";
  }
}

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return <Badge tone={campaignStatusTone(status)}>{status.replace(/_/g, " ")}</Badge>;
}

export function donationStatusTone(status: DonationStatus): Tone {
  switch (status) {
    case "completed":
      return "success";
    case "pending":
      return "info";
    case "manual_review":
      return "warning";
    case "failed":
    case "refunded":
      return "danger";
    default:
      return "neutral";
  }
}

export function DonationStatusBadge({ status }: { status: DonationStatus }) {
  return <Badge tone={donationStatusTone(status)}>{status.replace(/_/g, " ")}</Badge>;
}

export function impactStatusTone(status: ImpactUpdateStatus): Tone {
  switch (status) {
    case "published":
      return "success";
    case "submitted":
      return "info";
    case "rejected":
      return "danger";
    case "draft":
      return "neutral";
    default:
      return "neutral";
  }
}

export function ImpactStatusBadge({ status }: { status: ImpactUpdateStatus }) {
  return <Badge tone={impactStatusTone(status)}>{status}</Badge>;
}
