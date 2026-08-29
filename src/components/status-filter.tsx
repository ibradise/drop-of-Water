import { cn } from "@/lib/cn";

export function StatusFilter<T extends string>({
  value,
  onChange,
  options,
  className,
  allLabel = "All",
}: {
  value: T | null;
  onChange: (next: T | null) => void;
  options: readonly T[];
  className?: string;
  allLabel?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <FilterChip active={value === null} onClick={() => onChange(null)}>
        {allLabel}
      </FilterChip>
      {options.map((s) => (
        <FilterChip key={s} active={value === s} onClick={() => onChange(s)}>
          {String(s).replace(/_/g, " ")}
        </FilterChip>
      ))}
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
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
        active
          ? "border-sky-500 bg-sky-500 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
      )}
    >
      {children}
    </button>
  );
}
