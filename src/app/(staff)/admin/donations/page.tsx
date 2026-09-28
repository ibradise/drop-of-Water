"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Filter } from "lucide-react";
import { adminApi } from "@/lib/api/admin";
import { Card, CardContent, EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pager } from "@/components/pager";
import { Badge } from "@/components/ui/badge";
import { DonationStatusBadge } from "@/components/ui/status-badges";
import { Money } from "@/components/ui/money";
import { PAYMENT_METHODS, type DonationStatus } from "@/lib/enums";
import { formatDateTime } from "@/lib/format-date";

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
  const [minAmountEtb, setMinAmountEtb] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const q = useQuery({
    queryKey: ["admin", "donations", { status, highValue, paymentMethod, minAmountEtb, page }],
    queryFn: () =>
      adminApi.donations({
        page,
        limit,
        status: status ?? undefined,
        highValue: highValue || undefined,
        paymentMethod: paymentMethod || undefined,
        minAmount:
          minAmountEtb.trim() !== "" && Number.isFinite(Number(minAmountEtb))
            ? Math.round(Number(minAmountEtb) * 100)
            : undefined,
      }),
  });

  const applyFilter = (fn: () => void) => {
    fn();
    setPage(1);
  };

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
            <FilterChip active={status === null} onClick={() => applyFilter(() => setStatus(null))}>
              All
            </FilterChip>
            {STATUS_FILTERS.map((s) => (
              <FilterChip
                key={s}
                active={status === s}
                onClick={() => applyFilter(() => setStatus(s))}
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
                onChange={(e) => applyFilter(() => setHighValue(e.target.checked))}
                className="h-3.5 w-3.5 rounded border-slate-300 accent-sky-600"
              />
              High-value only (≥ 5,000 ETB)
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => applyFilter(() => setPaymentMethod(e.target.value))}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
            >
              <option value="">All payment methods</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              Min amount (ETB)
              <input
                type="number"
                min={0}
                step={1}
                value={minAmountEtb}
                onChange={(e) => applyFilter(() => setMinAmountEtb(e.target.value))}
                placeholder="Optional"
                aria-label="Minimum amount in ETB"
                className="w-28 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </label>
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
        <EmptyState
          title="We couldn't load donations"
          description="Something went wrong on our side. Please try again. If it keeps failing, contact support."
          action={
            <Button variant="outline" onClick={() => q.refetch()}>
              Retry
            </Button>
          }
        />
      ) : !q.data ? null : q.data.data.length === 0 ? (
        <EmptyState
          title="No donations match the filters"
          description="Try clearing or changing your filters."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setStatus(null);
                setHighValue(false);
                setPaymentMethod("");
                setMinAmountEtb("");
                setPage(1);
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {q.data.data.map((d) => (
              <li key={d._id}>
                <Link
                  href={`/admin/donations/${d._id}/review?from=/admin/donations`}
                  className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50"
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <DonationStatusBadge status={d.status} />
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
                      {formatDateTime(d.createdAt)}
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
      {q.data && q.data.data.length > 0 ? (
        <Pager
          page={q.data.meta.page}
          limit={q.data.meta.limit}
          total={q.data.meta.total}
          hasPrevPage={q.data.meta.hasPrevPage}
          hasNextPage={q.data.meta.hasNextPage}
          onPage={setPage}
        />
      ) : null}
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
