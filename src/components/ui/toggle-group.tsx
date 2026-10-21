import { cn } from "@/lib/utils";

export interface ToggleOption<T extends string> {
  value: T;
  label: string;
}

interface ToggleGroupProps<T extends string> {
  options: ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  columns?: 2 | 3 | 4 | 5;
  itemClassName?: string;
}

export function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
  disabled,
  className,
  columns,
  itemClassName,
}: ToggleGroupProps<T>) {
  const gridCols =
    columns === 5
      ? "grid-cols-2 sm:grid-cols-5"
      : columns === 4
        ? "grid-cols-2 sm:grid-cols-4"
        : columns === 3
          ? "grid-cols-3"
          : columns === 2
            ? "grid-cols-2"
            : "flex flex-wrap";

  return (
    <div
      role="group"
      className={cn(
        columns ? `grid gap-2 ${gridCols}` : "flex flex-wrap gap-2",
        className,
      )}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "min-w-0 rounded-xl px-3 py-2.5 text-sm font-medium leading-tight transition-colors text-center",
              "whitespace-nowrap overflow-hidden text-ellipsis",
              "border border-transparent",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/70 text-foreground hover:bg-muted border-border/60",
              disabled && "opacity-50 pointer-events-none",
              itemClassName,
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
