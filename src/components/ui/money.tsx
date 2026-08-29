import { formatSmallestUnit } from "@/lib/money";
import { cn } from "@/lib/cn";

export function Money({
  cents,
  currency,
  className,
  signed = false,
}: {
  cents: number;
  currency: string;
  className?: string;
  signed?: boolean;
}) {
  const text = formatSmallestUnit(cents, currency);
  const display = signed && cents > 0 ? `+${text}` : text;
  return (
    <span
      className={cn("font-medium tabular-nums text-slate-900", className)}
      aria-label={`${display} (${currency})`}
    >
      {display}
    </span>
  );
}
