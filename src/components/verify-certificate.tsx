"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VerifyCertificateForm() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const clean = code.trim();
    if (!clean) return;
    router.push(`/certificates/${encodeURIComponent(clean)}`);
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <BadgeCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. DOW-FR-9F2A7C41B0"
          aria-label="Certificate code"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 font-mono text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        />
      </div>
      <Button type="submit" size="md" disabled={!code.trim()}>
        Verify
        <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}