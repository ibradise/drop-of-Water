"use client";

import { useAuth } from "@/lib/auth/context";
import { hasAnyRole, ROLE_GROUPS } from "@/lib/enums";

export function useStaffCapabilities() {
  const { state } = useAuth();
  const roles = state.status === "authenticated" ? state.user.roles : [];
  return {
    isStaff: hasAnyRole(roles, ROLE_GROUPS.adminDashboard),
    isSystemAdmin: hasAnyRole(roles, ["system_admin"]),
    isProjectManager: hasAnyRole(roles, ROLE_GROUPS.projectManagers),
    isCampaignManager: hasAnyRole(roles, ROLE_GROUPS.campaignManagers),
    isContentManager: hasAnyRole(roles, ROLE_GROUPS.contentManagers),
    isFinance: hasAnyRole(roles, ROLE_GROUPS.finance),
    isSponsorshipManager: hasAnyRole(roles, ROLE_GROUPS.sponsorshipManagers),
  };
}
