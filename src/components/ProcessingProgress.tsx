import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import type { SummaryFormat } from "@/lib/summary-types";

interface ProcessingProgressProps {
  streaming?: boolean;
  format?: SummaryFormat;
}

export function ProcessingProgress({
  streaming,
  format = "notes",
}: ProcessingProgressProps) {
  const isQuestions = format === "qa";
  const streamingLabel = isQuestions
    ? "Формируем вопросы…"
    : "Печатаем конспект…";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 rounded-xl bg-violet-50 border border-violet-100 px-4 py-3"
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
