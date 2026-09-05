"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Filter } from "lucide-react";
import { adminApi } from "@/lib/api/admin";
import { Card, CardContent, EmptyState } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { PAYMENT_METHODS, type DonationStatus } from "@/lib/enums";

const STATUS_FILTERS: DonationStatus[] = [
  "pending",
  "manual_review",
  "completed",
  "failed",
  "refunded",
];

export default function AdminDonationsPage() {
  const [status, setStatus] = useState<DonationStatus | null>(null);
  const [highValue, setHighValue] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("");

  const q = useQuery({
    queryKey: ["admin", "donations", { status, highValue, paymentMethod }],
    queryFn: () =>
      adminApi.donations({
        page: 1,
        limit: 50,
        status: status ?? undefined,
        highValue: highValue || undefined,
        paymentMethod: paymentMethod || undefined,
      }),
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Donations</h2>
          <p className="text-sm text-slate-500">
            All donations, with finance filters.
          </p>
        </div>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
            <Filter className="h-3 w-3" /> Filters
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip active={status === null} onClick={() => setStatus(null)}>
              All
            </FilterChip>
            {STATUS_FILTERS.map((s) => (
              <FilterChip
                key={s}
                active={status === s}
                onClick={() => setStatus(s)}
              >
                {s.replace(/_/g, " ")}
              </FilterChip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={highValue}
                onChange={(e) => setHighValue(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 accent-sky-600"
              />
              High-value only (≥ 5,000 ETB)
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
            >
              <option value="">All payment methods</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {q.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : q.isError ? (
        <EmptyState title="Couldn't load donations" />
      ) : !q.data ? null : q.data.data.length === 0 ? (
        <EmptyState title="No donations match the filters" />
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {q.data.data.map((d) => (
              <li key={d._id}>
                <Link
                  href={`/admin/donations/${d._id}/review`}
                  className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50"
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <Badge
                        tone={
                          d.status === "completed"
                            ? "success"
                            : d.status === "manual_review"
                              ? "warning"
                              : d.status === "refunded" || d.status === "failed"
                                ? "danger"
                                : "info"
                        }
                        className="capitalize"
                      >
                        {d.status.replace(/_/g, " ")}
                      </Badge>
                      {d.requiresManualReview ? (
                        <Badge tone="warning">high-value</Badge>
                      ) : null}
                    </div>
                    <div className="text-sm font-medium text-slate-900">
                      {d.donorSnapshot?.name ?? "Anonymous"}{" "}
                      <span className="text-slate-500">·</span>{" "}
                      <span className="capitalize text-slate-500">
                        {d.paymentMethod}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(d.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Money cents={d.amount} currency={d.currency} className="text-sm" />
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
        active
          ? "border-sky-500 bg-sky-500 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
      }`}
    >
      {children}
    </button>
  );
}
