"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use } from "react";
import { Award, CheckCircle2, ExternalLink, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { certificatesApi } from "@/lib/api/certificates";
import { ApiError } from "@/lib/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, type Tone } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { formatDate } from "@/lib/format-date";

const BADGE_TONE: Record<"bronze" | "silver" | "gold" | "champion", Tone> = {
  bronze: "warning",
  silver: "neutral",
  gold: "brand",
  champion: "success",
};

export default function PublicCertificatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();

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
    const is403 = certQ.error instanceof ApiError && certQ.error.statusCode === 403;
    const isUnexpected = !(certQ.error instanceof ApiError);
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <Lock className="h-5 w-5 text-slate-500" />
            </div>
            <CardTitle>
              {is403
                ? "This certificate is private"
                : is404
                  ? "Certificate not found"
                  : isUnexpected
                    ? "This looks different than expected"
                    : "We couldn't load this certificate"}
            </CardTitle>
            <CardDescription>
              {is403
                ? "The owner has not made this certificate public yet."
                : is404
                  ? "It may have been removed, or the link is wrong."
                  : isUnexpected
                    ? "Please refresh the page to try again. If it keeps happening, contact support."
                    : "Something went wrong on our side. Please try again. If it keeps happening, contact support."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={() => certQ.refetch()}>
              Retry
            </Button>
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
  const issued = formatDate(cert.issuedAt);
  const isFunding = cert.type === "fundraising";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Certificate link copied. You can now share it anywhere.");
    } catch {
      toast.error("We couldn't copy the link automatically. Please copy it manually.");
    }
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="overflow-hidden rounded-3xl border border-sky-200/60 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-lg shadow-sky-500/30">
          <Award className="h-7 w-7" />
        </div>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Badge tone={BADGE_TONE[cert.badgeLevel]} className="capitalize">
            {cert.badgeLevel} tier
          </Badge>
          <Badge tone="brand" className="capitalize">
            {isFunding ? "Fundraising" : "Volunteer time"}
          </Badge>
        </div>
        <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {cert.title}
        </h1>
        <p className="mt-3 text-slate-700">{cert.description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Certificate details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Row label="Recipient" value={cert.recipient.name} />
          <Row
            label="Type"
            value={isFunding ? "Fundraising" : "Volunteer time"}
          />
          <Row label="Issued" value={issued} />
          <Row label="Version" value={`v${cert.version}`} />
          {isFunding && cert.totalAmount > 0 ? (
            <Row
              label="Total raised"
              value={
                <Money cents={cert.totalAmount} currency={cert.currency ?? "ETB"} />
              }
            />
          ) : null}
          {!isFunding && cert.totalHours > 0 ? (
            <Row label="Hours" value={cert.totalHours.toString()} />
          ) : null}
          {cert.relatedCampaignIds.length > 0 ? (
            <div className="sm:col-span-2">
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
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-sky-700" />
            <CardTitle className="text-base">Verify on Drop of Water</CardTitle>
          </div>
          <CardDescription>
            This certificate is verifiable by its code. Old share links keep
            working even if a newer version is issued.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <code className="min-w-0 flex-1 break-all font-mono text-sm text-slate-700">
              {cert.certificateCode}
            </code>
            <Button size="sm" variant="outline" onClick={copy}>
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
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 text-sm text-slate-900">{value}</div>
    </div>
  );
}
