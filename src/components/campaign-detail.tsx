"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { campaignsApi } from "@/lib/api/campaigns";
import { projectsApi } from "@/lib/api/projects";
import { donationsApi } from "@/lib/api/donations";
import { impactUpdatesApi } from "@/lib/api/impact-updates";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/context";
import { hasAnyRole, ROLE_GROUPS } from "@/lib/enums";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { CampaignStatusBadge } from "@/components/ui/status-badges";
import { ProgressBar } from "@/components/progress-bar";
import {
  CampaignHero,
  CampaignStory,
  CampaignSponsors,
  CampaignDonors,
  CampaignParticipants,
} from "@/components/campaign-detail-sections";
import { useRouter } from "next/navigation";

export function CampaignDetail({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const { state } = useAuth();

  const campaignQ = useQuery({
    queryKey: ["campaigns", "get", campaignId, { sponsors: true }],
    queryFn: () => campaignsApi.get(campaignId, true),
    retry: (count, err) => !(err instanceof ApiError && err.statusCode === 404) && count < 2,
  });

  const projectQ = useQuery({
    queryKey: ["projects", "get", campaignQ.data?.projectId],
    queryFn: () => projectsApi.get(campaignQ.data!.projectId),
    enabled: campaignQ.isSuccess,
  });

  const donorsQ = useQuery({
    queryKey: ["donations", "campaign", campaignId],
    queryFn: () => donationsApi.forCampaign(campaignId, { page: 1, limit: 5 }),
    enabled: campaignQ.isSuccess,
  });

  const impactQ = useQuery({
    queryKey: ["impact-updates", "byCampaign", campaignId],
    queryFn: () => impactUpdatesApi.forCampaign(campaignId, { page: 1, limit: 10 }),
    enabled: campaignQ.isSuccess,
  });

  if (campaignQ.isLoading) return <CampaignDetailSkeleton />;

  if (campaignQ.isError) {
    const is404 = campaignQ.error instanceof ApiError && campaignQ.error.statusCode === 404;
    const isUnexpected = !(campaignQ.error instanceof ApiError);
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {is404
              ? "Campaign not found"
              : isUnexpected
                ? "Data looked unexpected"
                : "Couldn't load this campaign"}
          </CardTitle>
          <CardDescription>
            {is404
              ? "It may have been removed or the link is wrong."
              : isUnexpected
                ? "Please refresh; if it keeps happening, contact support."
                : "Something went wrong talking to the API."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => campaignQ.refetch()}>
            Retry
          </Button>
          <Button variant="outline" onClick={() => router.push("/campaigns")}>
            Back to campaigns
          </Button>
        </CardContent>
      </Card>
    );
  }

  const campaign = campaignQ.data;
  if (!campaign) return null;

  const isPrivateStatus = campaign.status === "draft" || campaign.status === "pending_approval";
  if (isPrivateStatus) {
    const isAuthed = state.status === "authenticated";
    const canViewPrivate =
      isAuthed && (campaign.createdBy === state.user.id ||
        hasAnyRole(state.user.roles, ROLE_GROUPS.adminDashboard));
    if (!canViewPrivate) {
      if (state.status === "loading") return <CampaignDetailSkeleton />;
      return (
        <Card>
          <CardHeader>
            <CardTitle>This campaign isn&apos;t public yet</CardTitle>
            <CardDescription>
              It&apos;s still in &ldquo;{campaign.status.replace(/_/g, " ")}&rdquo; status and will
              be visible to everyone once it goes live.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push("/campaigns")}>
              Back to campaigns
            </Button>
          </CardContent>
        </Card>
      );
    }
  }

  const sponsors = campaign.sponsorships ?? [];
  const project = projectQ.data;
  const donors = donorsQ.data?.data ?? [];
  const donorCount = donorsQ.data?.meta.total ?? donors.length;
  const updates = impactQ.data?.data ?? [];

  return (
    <div className="flex flex-col gap-10">
      <Link href="/campaigns" className="text-sm text-slate-500 hover:text-slate-700">
        ← All campaigns
      </Link>

      <CampaignHero campaign={campaign} />

      {campaign.story ? <CampaignStory campaign={campaign} /> : null}

      {project ? (
        <section>
          <h2 className="mb-3 text-xl font-semibold text-slate-900">Backing project</h2>
          <Card>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col gap-1">
                <CardTitle className="text-base">{project.title}</CardTitle>
                {project.shortDescription ? (
                  <CardDescription className="line-clamp-2">
                    {project.shortDescription}
                  </CardDescription>
                ) : null}
                {project.location ? (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="h-3 w-3" />
                    {project.gpsCoordinates ??
                      `${project.location.lat.toFixed(2)}° N, ${project.location.lng.toFixed(2)}° E`}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-col items-end gap-2 sm:w-64">
                <div className="w-full">
                  <ProgressBar value={project.currentFunding} max={project.budget} />
                </div>
                <div className="text-xs text-slate-600">
                  <Money cents={project.currentFunding} currency={project.currency} /> of{" "}
                  <Money cents={project.budget} currency={project.currency} />
                </div>
                <Link href={`/projects/${project._id}`}>
                  <Button variant="outline" size="sm">
                    Project details
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <CampaignParticipants participants={campaign.participants} />

      <CampaignSponsors sponsors={sponsors} />

      <CampaignDonors
        donations={donors}
        currency={campaign.currency}
        totalCount={donorCount}
        isLoading={donorsQ.isLoading}
        isError={donorsQ.isError}
        onRetry={() => donorsQ.refetch()}
      />

      {updates.length > 0 ? (
        <section>
          <h2 className="mb-3 text-xl font-semibold text-slate-900">Latest from the field</h2>
          <div className="flex flex-col gap-4">
            {updates.map((u) => (
              <Card key={u._id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CampaignStatusBadge status={campaign.status} />
                    {u.publishedAt ? (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(u.publishedAt).toLocaleDateString()}
                      </span>
                    ) : null}
                  </div>
                  <CardTitle className="line-clamp-2">{u.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-3 whitespace-pre-line text-sm text-slate-700">
                    {u.content}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function CampaignDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-6 w-32 animate-pulse rounded bg-slate-100" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="aspect-[16/9] animate-pulse rounded-2xl bg-slate-100" />
        <div className="flex flex-col gap-3">
          <div className="h-5 w-24 animate-pulse rounded bg-slate-100" />
          <div className="h-9 w-3/4 animate-pulse rounded bg-slate-100" />
          <div className="h-5 w-full animate-pulse rounded bg-slate-100" />
          <div className="h-12 w-full animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
