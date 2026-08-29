import Link from "next/link";
import { Droplets, Heart, MapPin, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FeaturedCampaigns } from "@/components/featured-campaigns";

const FEATURES = [
  {
    icon: Droplets,
    title: "Fund real water projects",
    body: "Every campaign backs a verified well, borehole, or water-infrastructure project on the ground.",
  },
  {
    icon: Heart,
    title: "See your impact",
    body: "Receive impact updates from the field and earn shareable certificates for your contributions.",
  },
  {
    icon: Users,
    title: "Run a campaign",
    body: "Students, chapters, and corporate partners can create campaigns and rally their communities.",
  },
  {
    icon: MapPin,
    title: "Built for Ethiopia",
    body: "Local payment partners (Chapa, Zeffy) and currency-aware totals — give in ETB with confidence.",
  },
] as const;

export default function HomePage() {
  return (
    <div className="flex flex-col gap-16">
      <section className="flex flex-col items-center gap-6 pt-8 text-center sm:pt-16">
        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-sky-700">
          Crowdfunding for clean water
        </span>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Every drop counts. Fund a well, change a community.
        </h1>
        <p className="max-w-2xl text-lg text-slate-600">
          Drop of Water connects donors, fundraisers, and on-the-ground project teams
          to build lasting water infrastructure across Ethiopia.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/campaigns">
            <Button size="lg">Browse campaigns</Button>
          </Link>
          <Link href="/projects">
            <Button size="lg" variant="outline">
              See projects
            </Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <Card key={f.title}>
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                <f.icon className="h-5 w-5" />
              </div>
              <CardTitle>{f.title}</CardTitle>
              <CardDescription>{f.body}</CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </section>

      <FeaturedCampaigns />

      <section className="rounded-2xl bg-sky-600 p-8 text-white sm:p-12">
        <div className="flex flex-col items-start gap-4">
          <h2 className="text-2xl font-semibold sm:text-3xl">Ready to make a difference?</h2>
          <p className="max-w-xl text-sky-100">
            Whether you give 100 ETB or run a chapter campaign of 100,000 ETB, you&rsquo;ll
            see the wells you helped fund and the people they serve.
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
