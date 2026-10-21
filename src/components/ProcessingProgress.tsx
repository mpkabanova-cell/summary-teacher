import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import type { SummaryFormat } from "@/lib/summary-types";

interface ProcessingProgressProps {
  streaming?: boolean;
  format?: SummaryFormat;
  blockLabel?: string;
}

export function ProcessingProgress({
  streaming,
  format = "notes",
  blockLabel,
}: ProcessingProgressProps) {
  const isQuestions = format === "qa";
  const streamingLabel = blockLabel
    ? `Создаём блок «${blockLabel}»…`
    : isQuestions
      ? "Формируем вопросы…"
      : "Создаём материалы…";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 rounded-lg bg-secondary border border-border px-4 py-3"
    >
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <div>
        <p className="font-medium text-sm">
          {streaming ? streamingLabel : "Отправляем на обработку…"}
        </p>
      </div>
    </motion.div>
  );
}
