"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight, Droplets, FileText, Heart, TrendingUp, Users } from "lucide-react";
import { adminApi } from "@/lib/api/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";

export default function AdminDashboardPage() {
  const summaryQ = useQuery({
    queryKey: ["admin", "dashboard", "summary"],
    queryFn: () => adminApi.dashboardSummary(),
  });

  if (summaryQ.isLoading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />;
  }
  if (summaryQ.isError) {
    return (
      <EmptyState
        title="Couldn't load the dashboard"
        action={
          <Button variant="outline" onClick={() => summaryQ.refetch()}>
            Retry
          </Button>
        }
      />
    );
  }
  const s = summaryQ.data;
  if (!s) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<FileText className="h-4 w-4" />}
          label="Pending review"
          value={s.donations.pendingManualReview + s.impactUpdates.pendingApproval}
          tone={s.donations.pendingManualReview + s.impactUpdates.pendingApproval > 0 ? "warning" : "success"}
          link="/admin/review-queue"
          linkLabel="Open queue"
        />
        <SummaryCard
          icon={<Droplets className="h-4 w-4" />}
          label="Active campaigns"
          value={s.campaigns.active}
          link="/admin/campaigns?status=active"
          linkLabel="View"
        />
        <SummaryCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Total raised"
          value={<Money cents={s.donations.totalRaised} currency="ETB" emphasis="lg" />}
          link="/admin/donations"
          linkLabel="Donations"
        />
        <SummaryCard
          icon={<Users className="h-4 w-4" />}
          label="Active users"
          value={s.users.active}
          sub={`of ${s.users.total} total`}
          link="/admin/users"
          linkLabel="Manage users"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard
          title="Projects"
          icon={<Droplets className="h-4 w-4" />}
          total={s.projects.total}
          rows={Object.entries(s.projects.byStatus).map(([k, v]) => ({ label: k, value: v }))}
          extra={
            <div className="mt-3 flex flex-col gap-1 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>Total budget</span>
                <Money cents={s.projects.totalBudget} currency="ETB" />
              </div>
              <div className="flex items-center justify-between">
                <span>Total funded</span>
                <Money cents={s.projects.totalFunding} currency="ETB" />
              </div>
              <div className="flex items-center justify-between">
                <span>People served (est.)</span>
                <span>{s.projects.estimatedPeopleServed.toLocaleString()}</span>
              </div>
            </div>
          }
        />
        <BreakdownCard
          title="Campaigns"
          icon={<FileText className="h-4 w-4" />}
          total={s.campaigns.total}
          rows={Object.entries(s.campaigns.byStatus).map(([k, v]) => ({ label: k, value: v }))}
          extra={
            <div className="mt-3 flex flex-col gap-1 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>Pending approval</span>
                <span>{s.campaigns.pendingApproval}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Goal completion</span>
                <span>{s.campaigns.goalCompletionPercent}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Raised / goal</span>
                <span>
                  <Money cents={s.campaigns.totalRaisedAmount} currency="ETB" /> /{" "}
                  <Money cents={s.campaigns.totalGoalAmount} currency="ETB" />
                </span>
              </div>
            </div>
          }
        />
        <BreakdownCard
          title="Donations"
          icon={<TrendingUp className="h-4 w-4" />}
          total={s.donations.total}
          rows={Object.entries(s.donations.byStatus).map(([k, v]) => ({ label: k, value: v }))}
          extra={
            <div className="mt-3 flex flex-col gap-1 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>Completed</span>
                <span>{s.donations.completedCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Average gift</span>
                <Money cents={s.donations.averageDonation} currency="ETB" />
              </div>
              <div className="flex items-center justify-between">
                <span>Total drops</span>
                <span>{s.donations.totalDrops.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Refunded</span>
                <Money cents={s.donations.totalRefunded} currency="ETB" />
              </div>
            </div>
          }
        />
        <BreakdownCard
          title="Impact updates"
          icon={<FileText className="h-4 w-4" />}
          total={s.impactUpdates.total}
          rows={Object.entries(s.impactUpdates.byStatus).map(([k, v]) => ({ label: k, value: v }))}
          extra={
            <div className="mt-3 flex flex-col gap-1 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>Pending approval</span>
                <span>{s.impactUpdates.pendingApproval}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Published</span>
                <span>{s.impactUpdates.published}</span>
              </div>
            </div>
          }
        />
      </div>

      <p className="text-xs text-slate-400">
        Generated {new Date(s.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
  tone,
  link,
  linkLabel,
  linkDisabled,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: "warning" | "success";
  link: string;
  linkLabel: string;
  linkDisabled?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
          {icon}
          {label}
        </div>
        <div className="text-2xl font-semibold text-slate-900">{value}</div>
        {sub ? <div className="text-xs text-slate-500">{sub}</div> : null}
        {tone === "warning" ? (
          <Badge tone="warning" className="self-start">
            Needs attention
          </Badge>
        ) : null}
        {tone === "success" ? (
          <Badge tone="success" className="self-start">
            All clear
          </Badge>
        ) : null}
        {linkDisabled ? (
          <span className="text-xs text-slate-400">{linkLabel}</span>
        ) : (
          <Link
            href={link}
            className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-800"
          >
            {linkLabel}
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

function BreakdownCard({
  title,
  icon,
  total,
  rows,
  extra,
}: {
  title: string;
  icon: React.ReactNode;
  total: number;
  rows: Array<{ label: string; value: number }>;
  extra?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <CardDescription>{total} total</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-xs text-slate-500">No data.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {rows.map((r) => (
              <li key={r.label} className="flex items-center justify-between py-1.5 capitalize">
                <span className="text-slate-700">{r.label.replace(/_/g, " ")}</span>
                <span className="font-medium text-slate-900">{r.value}</span>
              </li>
            ))}
          </ul>
        )}
        {extra}
      </CardContent>
    </Card>
  );
}
