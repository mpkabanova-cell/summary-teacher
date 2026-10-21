import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import type { PdfExportProgress as PdfExportProgressState } from "@/lib/export-pdf";

interface PdfExportProgressProps {
  progress: PdfExportProgressState;
}

export function PdfExportProgress({ progress }: PdfExportProgressProps) {
  const { message, current, total } = progress;
  const hasBar =
    typeof current === "number" &&
    typeof total === "number" &&
    total > 0;
  const percent = hasBar
    ? Math.min(100, Math.round((current / total) * 100))
    : 0;

  const detail =
    hasBar && progress.phase === "formulas"
      ? `Формула ${current} из ${total}`
      : hasBar && progress.phase === "pages"
        ? `Страница ${current} из ${total}`
        : "Это может занять до минуты при многих формулах";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{message}</p>
          <p className="text-xs text-muted-foreground">{detail}</p>
          {hasBar && (
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-violet-100"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200"
                style={{ width: `${percent}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
