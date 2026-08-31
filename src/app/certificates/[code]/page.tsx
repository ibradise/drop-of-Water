"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use } from "react";
import { Award, Lock, Share2 } from "lucide-react";
import { toast } from "sonner";
import { certificatesApi } from "@/lib/api/certificates";
import { ApiError } from "@/lib/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, type Tone } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { useAuth } from "@/lib/auth/context";

const BADGE_TONE: Record<"bronze" | "silver" | "gold" | "champion", Tone> = {
  bronze: "warning",
  silver: "neutral",
  gold: "info",
  champion: "success",
};

export default function PublicCertificatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const { state } = useAuth();

  const certQ = useQuery({
    queryKey: ["certificates", "byCode", code],
    queryFn: () => certificatesApi.byCode(code),
    retry: (count, err) =>
      !(err instanceof ApiError && err.statusCode === 404) && count < 2,
  });

  if (certQ.isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (certQ.isError) {
    const is404 = certQ.error instanceof ApiError && certQ.error.statusCode === 404;
    return (
      <div className="mx-auto max-w-xl">
        <Card>
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <Lock className="h-5 w-5 text-slate-500" />
            </div>
            <CardTitle>
              {is404
                ? state.status === "authenticated"
                  ? "This certificate is private"
                  : "Certificate not found"
                : "Couldn't load this certificate"}
            </CardTitle>
            <CardDescription>
              {is404
                ? state.status === "authenticated"
                  ? "The owner has not made this certificate public yet."
                  : "It may have been removed, or the link is wrong."
                : "Something went wrong."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push("/")}>
              Back to home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cert = certQ.data;
  if (!cert) return null;
  const issued = new Date(cert.issuedAt).toLocaleDateString();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied.");
    } catch {
      toast.error("Couldn't copy.");
    }
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <Award className="h-6 w-6" />
        </div>
        <Badge tone={BADGE_TONE[cert.badgeLevel]} className="capitalize">
          {cert.badgeLevel} tier
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {cert.title}
        </h1>
        <p className="text-sm text-slate-600">{cert.description}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Certificate details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Row label="Recipient" value={cert.recipient.name} />
          <Row label="Type" value={cert.type === "fundraising" ? "Fundraising" : "Volunteer time"} />
          <Row label="Issued" value={issued} />
          <Row label="Version" value={`v${cert.version}`} />
          {cert.type === "fundraising" && cert.totalAmount > 0 ? (
            <Row
              label="Total raised"
              value={<Money cents={cert.totalAmount} currency={cert.currency ?? "ETB"} />}
            />
          ) : null}
          {cert.type === "volunteer_time" && cert.totalHours > 0 ? (
            <Row label="Hours" value={cert.totalHours.toString()} />
          ) : null}
          {cert.relatedCampaignIds.length > 0 ? (
            <Row
              label="Campaigns"
              value={
                <span className="flex flex-wrap gap-1">
                  {cert.relatedCampaignIds.map((cid) => (
                    <Link
                      key={cid}
                      href={`/campaigns/${cid}`}
                      className="text-sky-700 hover:underline"
                    >
                      {cid.slice(0, 6)}…
                    </Link>
                  ))}
                </span>
              }
            />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verify</CardTitle>
          <CardDescription>
            This certificate is verifiable on Drop of Water by its code. Old share
            links keep working even if a newer version is issued.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <code className="flex-1 font-mono text-sm text-slate-700">
              {cert.certificateCode}
            </code>
            <Button size="sm" variant="outline" onClick={copy}>
              <Share2 className="h-3.5 w-3.5" />
              Copy
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm text-slate-900">{value}</div>
    </div>
  );
}
