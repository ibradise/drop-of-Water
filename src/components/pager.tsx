"use client";

import { Button } from "@/components/ui/button";

export function Pager({
  page,
  limit,
  total,
  hasPrevPage,
  hasNextPage,
  onPage,
}: {
  page: number;
  limit: number;
  total: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4 text-sm text-slate-600">
      <span>
        {total === 0
          ? "No results"
          : `Showing ${(page - 1) * limit + 1}–${Math.min(total, page * limit)} of ${total}`}
      </span>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={!hasPrevPage}
          onClick={() => onPage(Math.max(1, page - 1))}
        >
          Previous
        </Button>
        <Button size="sm" variant="outline" disabled={!hasNextPage} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
