import { formatSmallestUnit } from "@/lib/money";
import { cn } from "@/lib/cn";

export function Money({
  cents,
  currency,
  className,
  signed = false,
  emphasis = "default",
}: {
  cents: number;
  currency: string;
  className?: string;
  signed?: boolean;
  emphasis?: "default" | "lg" | "muted";
}) {
  const text = formatSmallestUnit(cents, currency);
  const display = signed && cents > 0 ? `+${text}` : text;
  return (
    <span
      className={cn(
        "font-semibold tabular-nums text-slate-900",
        emphasis === "lg" && "text-2xl tracking-tight",
        emphasis === "muted" && "font-medium text-slate-700",
        className,
      )}
      aria-label={`${display} (${currency})`}
    >
      {display}
    </span>
  );
}
