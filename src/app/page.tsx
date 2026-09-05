"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight, Heart, MapPin, Shield, Sparkles, Users } from "lucide-react";
import { campaignsApi } from "@/lib/api/campaigns";
import { projectsApi } from "@/lib/api/projects";
import { CampaignCard } from "@/components/campaign-card";
import { ProjectCard } from "@/components/project-card";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";

const FEATURES = [
  {
    icon: Sparkles,
    title: "Fund real water projects",
    body: "Every campaign backs a verified well, borehole, or water-infrastructure project on the ground.",
    tint: "from-sky-500/15 to-cyan-500/0 text-sky-700",
  },
  {
    icon: Heart,
    title: "See your impact",
    body: "Receive impact updates from the field and earn shareable certificates for your contributions.",
    tint: "from-rose-500/15 to-pink-500/0 text-rose-700",
  },
  {
    icon: Users,
    title: "Run a campaign",
    body: "Students, chapters, and corporate partners can create campaigns and rally their communities.",
    tint: "from-emerald-500/15 to-teal-500/0 text-emerald-700",
  },
  {
    icon: Shield,
    title: "Built for Ethiopia",
    body: "Local payment partners (Chapa, Zeffy) and currency-aware totals — give in ETB with confidence.",
    tint: "from-amber-500/15 to-orange-500/0 text-amber-700",
  },
] as const;

export default function HomePage() {
  const { data: featured, isLoading: featuredLoading } = useQuery({
    queryKey: ["campaigns", "active", "featured"],
    queryFn: () => campaignsApi.active({ page: 1, limit: 3 }),
  });

  const { data: projects } = useQuery({
    queryKey: ["projects", "list", "fundable-featured"],
    queryFn: () =>
      projectsApi.list({ status: "fundable", page: 1, limit: 3 }),
  });

  const activeCampaigns = featured?.data ?? [];
  const fundableProjects = projects?.data ?? [];

  // Aggregate a few headline numbers from the live data.
  const totalRaised = activeCampaigns.reduce(
    (sum, c) => sum + c.currentAmount,
    0,
  );
  const peopleServed = fundableProjects.reduce(
    (sum, p) => sum + (p.estimatedPeopleServed ?? 0),
    0,
  );

  return (
    <div className="flex flex-col gap-20">
      <section className="relative -mt-2 flex flex-col items-center gap-7 pt-6 text-center sm:pt-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-medium text-sky-700 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
          Crowdfunding for clean water
        </span>
        <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
          Every drop counts.{" "}
          <span className="gradient-text">Fund a well,</span> change a community.
        </h1>
        <p className="max-w-2xl text-balance text-lg text-slate-600">
          Drop of Water connects donors, fundraisers, and on-the-ground project
          teams to build lasting water infrastructure across Ethiopia.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/campaigns">
            <Button size="lg">
              Browse campaigns
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/projects">
            <Button size="lg" variant="outline">
              See projects
            </Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Active campaigns"
          value={String(activeCampaigns.length || "—")}
        />
        <Stat
          label="Raised this week"
          value={totalRaised > 0 ? <Money cents={totalRaised} currency="ETB" /> : "—"}
        />
        <Stat
          label="People served (est.)"
          value={peopleServed > 0 ? peopleServed.toLocaleString() : "—"}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div
              className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br ${f.tint} opacity-50 blur-2xl transition-opacity group-hover:opacity-80`}
            />
            <div className="relative flex flex-col gap-3">
              <div
                className={`inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${f.tint}`}
              >
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                {f.title}
              </h3>
              <p className="text-sm text-slate-600">{f.body}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-6">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-sky-700">
              Right now
            </span>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Active campaigns
            </h2>
            <p className="text-slate-600">Real fundraisers, real wells, real impact.</p>
          </div>
          <Link href="/campaigns">
            <Button variant="outline" size="sm">
              All campaigns
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featuredLoading
            ? Array.from({ length: 3 }, (_, i) => (
                <div
                  key={i}
                  className="aspect-[16/9] animate-pulse rounded-2xl bg-slate-100"
                />
              ))
            : activeCampaigns.length === 0
              ? null
              : activeCampaigns.map((c) => <CampaignCard key={c._id} campaign={c} />)}
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-sky-700">
              Open to funding
            </span>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Fundable projects
            </h2>
            <p className="text-slate-600">
              Real water-infrastructure projects accepting new campaigns.
            </p>
          </div>
          <Link href="/projects">
            <Button variant="outline" size="sm">
              All projects
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fundableProjects.length === 0
            ? Array.from({ length: 3 }, (_, i) => (
                <div
                  key={i}
                  className="aspect-[16/9] animate-pulse rounded-2xl bg-slate-100"
                />
              ))
            : fundableProjects.map((p) => <ProjectCard key={p._id} project={p} />)}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-cyan-600 to-cyan-700 p-8 text-white sm:p-12">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-10 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative flex flex-col items-start gap-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            <Heart className="h-3 w-3" />
            Make a difference
          </span>
          <h2 className="text-balance text-3xl font-semibold sm:text-4xl">
            Ready to give your first birr?
          </h2>
          <p className="max-w-xl text-cyan-50">
            Whether you give 100 ETB or run a chapter campaign of 100,000 ETB,
            you&rsquo;ll see the wells you helped fund and the people they serve.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/campaigns">
              <Button variant="secondary" size="lg">
                Donate now
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button
                size="lg"
                className="border border-white/40 bg-transparent text-white hover:bg-white/10"
              >
                Start a campaign
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}
