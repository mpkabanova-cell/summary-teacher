export type SummaryFormat = "notes" | "cheatsheet" | "table" | "qa";

export type DetailLevel = "brief" | "medium" | "detailed";

export type ExplanationLevel = "simple" | "study" | "deep";

export type RefinementType = "shorter" | "examples" | "simpler" | "quiz";

export interface SummarySettings {
  format: SummaryFormat;
  detail: DetailLevel;
  level: ExplanationLevel;
  focus: string;
  lessonNumber?: number | undefined;
}

export const FORMAT_OPTIONS: {
  value: SummaryFormat;
  label: string;
  emoji: string;
  description: string;
}[] = [
  {
    value: "notes",
    label: "Конспект",
    emoji: "📝",
    description: "Структурированное изложение с заголовками и формулами",
  },
  {
    value: "cheatsheet",
    label: "Шпаргалка",
    emoji: "⚡",
    description: "Ультракраткий справочник на один экран",
  },
  {
    value: "table",
    label: "Таблица",
    emoji: "📊",
    description: "Понятие — определение — формула",
  },
  {
    value: "qa",
    label: "Вопросы",
    emoji: "❓",
    description: "Только вопросы по материалу, без теории и ответов",
  },
];

export const DETAIL_OPTIONS: { value: DetailLevel; label: string }[] = [
  { value: "brief", label: "Кратко" },
  { value: "medium", label: "Средне" },
  { value: "detailed", label: "Подробно" },
];

export const LEVEL_OPTIONS: { value: ExplanationLevel; label: string }[] = [
  { value: "simple", label: "Простыми словами" },
  { value: "study", label: "Учебный" },
  { value: "deep", label: "Углублённый" },
];

export const REFINEMENT_OPTIONS: {
  value: RefinementType;
  label: string;
  emoji: string;
}[] = [
  { value: "shorter", label: "Покороче", emoji: "✂️" },
  { value: "examples", label: "Примеры", emoji: "💡" },
  { value: "simpler", label: "Проще", emoji: "🧒" },
  { value: "quiz", label: "Вопросы", emoji: "❓" },
];

const FORMAT_ACTION_LABELS: Record<
  SummaryFormat,
  { create: string; regenerate: string; regenerated: string }
> = {
  notes: {
    create: "Создать конспект",
    regenerate: "Перегенерировать конспект",
    regenerated: "Конспект перегенерирован",
  },
  cheatsheet: {
    create: "Создать шпаргалку",
    regenerate: "Перегенерировать шпаргалку",
    regenerated: "Шпаргалка перегенерирована",
  },
  table: {
    create: "Создать таблицу",
    regenerate: "Перегенерировать таблицу",
    regenerated: "Таблица перегенерирована",
  },
  qa: {
    create: "Создать вопросы",
    regenerate: "Перегенерировать вопросы",
    regenerated: "Вопросы перегенерированы",
  },
};

const REFINEMENT_COMPATIBILITY: Record<SummaryFormat, RefinementType[]> = {
  notes: ["shorter", "examples", "simpler", "quiz"],
  cheatsheet: ["shorter", "simpler", "quiz"],
  table: ["shorter", "simpler", "quiz"],
  qa: ["shorter"],
};

const REFINEMENT_DISABLED_REASONS: Partial<
  Record<SummaryFormat, Partial<Record<RefinementType, string>>>
> = {
  cheatsheet: {
    examples: "Примеры доступны только для конспекта",
  },
  table: {
    examples: "Примеры доступны только для конспекта",
  },
  qa: {
    examples: "Недоступно для режима «Вопросы»",
    simpler: "Недоступно для режима «Вопросы»",
    quiz: "Вы уже в режиме вопросов",
  },
};

/** Migrates legacy settings (e.g. removed diagram format). */
export function normalizeSummarySettings(
  settings: SummarySettings,
): SummarySettings {
  const format = settings.format as string;
  if (format === "diagram" || !FORMAT_OPTIONS.some((o) => o.value === format)) {
    return { ...settings, format: DEFAULT_SETTINGS.format };
  }
  return settings;
}

export function getGenerateActionLabel(
  format: SummaryFormat,
  hasContent: boolean,
): string {
  const labels = FORMAT_ACTION_LABELS[format] ?? FORMAT_ACTION_LABELS.notes;
  return hasContent ? labels.regenerate : labels.create;
}

export function getRegeneratedMessage(format: SummaryFormat): string {
  return (FORMAT_ACTION_LABELS[format] ?? FORMAT_ACTION_LABELS.notes).regenerated;
}

export function getRefinementAvailability(
  format: SummaryFormat,
  refinement: RefinementType,
): { disabled: boolean; reason?: string } {
  const allowed = REFINEMENT_COMPATIBILITY[format] ?? REFINEMENT_COMPATIBILITY.notes;
  if (allowed.includes(refinement)) return { disabled: false };

  return {
    disabled: true,
    reason:
      REFINEMENT_DISABLED_REASONS[format]?.[refinement] ??
      "Недоступно для текущего формата",
  };
}

export function formatSettingsPills(settings: SummarySettings): string[] {
  const normalized = normalizeSummarySettings(settings);
  const format = FORMAT_OPTIONS.find((o) => o.value === normalized.format)?.label;
  const detail = DETAIL_OPTIONS.find((o) => o.value === normalized.detail)?.label;
  const level = LEVEL_OPTIONS.find((o) => o.value === normalized.level)?.label;
  return [format, detail, level].filter(Boolean) as string[];
}

export const MAX_FILES = 6;
export const MAX_BASE64_PER_FILE = 4_000_000;
export const MAX_BASE64_TOTAL = 6_000_000;

export const DEFAULT_SETTINGS: SummarySettings = {
  format: "notes",
  detail: "medium",
  level: "study",
  focus: "",
};

export const HISTORY_KEY = "teach-summary-history";
export const HISTORY_INDEX_KEY = "teach-summary-history-index";
export const MATERIALS_KEY = "teach-summary-materials";
export const FEEDBACK_SENT_KEY = "teach-summary-feedback-sent";
export const MAX_HISTORY = 50;

export interface SummarizeRequest {
  images: string[];
  settings: SummarySettings;
  existingContent?: string;
  refinement?: RefinementType;
}

export interface FeedbackPayload {
  rating: number;
  message: string;
  page?: string;
}
