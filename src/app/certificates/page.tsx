import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, UserCheck, ShieldCheck } from "lucide-react";
import { VerifyCertificateForm } from "@/components/verify-certificate";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Verify a certificate — Drop of Water",
  description:
    "Verify a Drop of Water fundraising or volunteer-time certificate by its unique share code.",
};

export default function CertificatesPage() {
  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-sky-700">
          Certificates
        </span>
        <h1 className="text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Every drop of support, verified.
        </h1>
        <p className="max-w-2xl text-slate-600">
          Fundraising and volunteer recognition certificates carry a unique share
          code. Enter a code to view and verify a certificate.
        </p>
      </header>

      <Card>
        <CardContent className="p-6 sm:p-8">
          <h2 className="text-base font-semibold text-slate-900">
            Verify a certificate
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Paste a certificate code — for example, one printed on a certificate
            or shared with you.
          </p>
          <div className="mt-4">
            <VerifyCertificateForm />
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Certificate codes look like &quot;DOW-FR-9F2A7C41B0&quot;. Private
            certificates can only be opened by their owner.
          </p>
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-3">
        <Step
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Trustworthy"
          body="Each certificate is a frozen snapshot of what a volunteer or fundraiser achieved — the numbers never change."
        />
        <Step
          icon={<Trophy className="h-5 w-5" />}
          title="Four tiers"
          body="Bronze, silver, gold, and champion levels recognize money raised or volunteer time given."
        />
        <Step
          icon={<UserCheck className="h-5 w-5" />}
          title="Share with peace of mind"
          body="Old share links keep working even after a new version is issued."
        />
      </section>

      <p className="text-sm text-slate-500">
        Earned a certificate of your own?{" "}
        <Link
          href="/me/certificates"
          className="font-medium text-sky-700 hover:underline"
        >
          View your certificates
        </Link>
      </p>
    </div>
  );
}

function Step({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-50 text-sky-700">
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{body}</p>
    </div>
  );
}