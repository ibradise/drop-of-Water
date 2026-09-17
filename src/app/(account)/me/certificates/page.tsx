"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Copy, ExternalLink, Eye, EyeOff, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { certificatesApi } from "@/lib/api/certificates";
import { ApiError } from "@/lib/api/client";
import { CERTIFICATE_TYPES, type CertificateType } from "@/lib/enums";
import { Card, CardContent, EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, type Tone } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";

const BADGE_TONE: Record<"bronze" | "silver" | "gold" | "champion", Tone> = {
  bronze: "warning",
  silver: "neutral",
  gold: "info",
  champion: "success",
};

export default function MeCertificatesPage() {
  const [generating, setGenerating] = useState<CertificateType | null>(null);
  const qc = useQueryClient();
  const certsQ = useQuery({
    queryKey: ["certificates", "me"],
    queryFn: () => certificatesApi.mine({ page: 1, limit: 50 }),
  });

  const generate = useMutation({
    mutationFn: (type: CertificateType) =>
      certificatesApi.generate({ type }),
    onSuccess: () => {
      toast.success("Certificate issued.");
      qc.invalidateQueries({ queryKey: ["certificates", "me"] });
      setGenerating(null);
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError ? err.messages[0] : "Couldn't generate the certificate.";
      toast.error(msg);
      setGenerating(null);
    },
  });

  const setVisibility = useMutation({
    mutationFn: ({ id, isPublic }: { id: string; isPublic: boolean }) =>
      certificatesApi.setVisibility(id, { isPublic }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["certificates", "me"] });
    },
    onError: () => toast.error("Couldn't update visibility."),
  });

  const items = certsQ.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-slate-900">My certificates</h2>
        <p className="text-sm text-slate-500">
          Frozen snapshots of what you&rsquo;ve achieved. Generate a new one whenever your
          numbers move — old share links keep working.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {CERTIFICATE_TYPES.map((type) => (
          <Card key={type}>
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-sky-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  {type === "fundraising" ? "Fundraising" : "Volunteer time"}
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                {type === "fundraising"
                  ? "Sum of completed donations to your campaigns. Tiers: bronze 1,000 / silver 10,000 / gold 50,000 / champion 250,000 ETB."
                  : "2 hours per active campaign day over the campaign window. Tiers: bronze 10 / silver 50 / gold 150 / champion 500 hours."}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setGenerating(type);
                  generate.mutate(type);
                }}
                isLoading={generating === type}
              >
                Generate {type === "fundraising" ? "fundraising" : "volunteer"} certificate
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {certsQ.isError ? (
        <EmptyState
          title="Couldn't load your certificates"
          action={
            <Button variant="outline" onClick={() => certsQ.refetch()}>
              Retry
            </Button>
          }
        />
      ) : certsQ.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No certificates yet"
          description="Generate one above once your numbers clear the bronze tier."
        />
      ) : (
        <div className="space-y-3">
          {items.map((cert) => (
            <Card key={cert.id}>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Badge tone={BADGE_TONE[cert.badgeLevel]} className="capitalize">
                      {cert.badgeLevel}
                    </Badge>
                    <Badge tone="neutral" className="capitalize">
                      {cert.type === "fundraising" ? "Fundraising" : "Volunteer time"}
                    </Badge>
                    {cert.isPublic ? (
                      <Badge tone="success">public</Badge>
                    ) : (
                      <Badge tone="neutral">private</Badge>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">{cert.title}</h3>
                  <p className="text-sm text-slate-600">{cert.description}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>
                      Issued {new Date(cert.issuedAt).toLocaleDateString()}
                    </span>
                    {cert.type === "fundraising" && cert.totalAmount > 0 ? (
                      <span>
                        <Money cents={cert.totalAmount} currency={cert.currency ?? "ETB"} />
                      </span>
                    ) : null}
                    {cert.type === "volunteer_time" && cert.totalHours > 0 ? (
                      <span>{cert.totalHours} hours</span>
                    ) : null}
                    <span>v{cert.version}</span>
                  </div>
                </div>
                <div className="flex flex-col items-stretch gap-2 sm:w-56">
                  <ShareLink code={cert.certificateCode} />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setVisibility.mutate({
                        id: cert.id,
                        isPublic: !cert.isPublic,
                      })
                    }
                    isLoading={setVisibility.isPending}
                  >
                    {cert.isPublic ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5" />
                        Make private
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" />
                        Make public
                      </>
                    )}
                  </Button>
                  <Link
                    href={`/certificates/${cert.certificateCode}`}
                    target="_blank"
                  >
                    <Button size="sm" variant="ghost" className="w-full">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open page
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ShareLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/certificates/${code}`
      : `/certificates/${code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Long-press the link instead.");
    }
  };

  return (
    <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs">
      <Share2 className="h-3 w-3 text-slate-400" />
      <code className="flex-1 truncate text-slate-700">{code}</code>
      <button
        type="button"
        onClick={copy}
        className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        aria-label="Copy share link"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
