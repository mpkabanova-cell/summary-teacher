import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Copy,
  Download,
  Loader2,
  Pencil,
  RefreshCw,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { FileUploadZone } from "@/components/FileUploadZone";
import { SummarySettingsPanel } from "@/components/SummarySettingsPanel";
import { SummaryResult } from "@/components/SummaryResult";
import { ProcessingProgress } from "@/components/ProcessingProgress";
import { Button } from "@/components/ui/button";
import { useSummarize } from "@/hooks/useSummarize";
import { canGenerateMaterial, getSelectedLesson } from "@/lib/lesson-directory";
import { trackEvent } from "@/lib/analytics";
import { exportMarkdownToDocx } from "@/lib/export-docx";
import {
  REFINEMENT_OPTIONS,
  formatSettingsPills,
  getRefinementAvailability,
  getRegeneratedMessage,
} from "@/lib/summary-types";

export default function Index() {
  const [editing, setEditing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const previousContentRef = useRef("");

  const {
    settings,
    setSettings,
    images,
    setImages,
    content,
    contentFormat,
    setContent,
    status,
    error,
    generate,
    regenerate,
    refine,
    resetContent,
    cancel,
    isBusy,
    hasContent,
  } = useSummarize();

  const settingPills = formatSettingsPills(settings);
  const selectedLesson = getSelectedLesson(settings.lessonNumber);
  if (selectedLesson) settingPills.unshift(`Математика · 6 класс · № ${selectedLesson.number}`);

  useEffect(() => {
    const previous = previousContentRef.current;
    previousContentRef.current = content;

    if (!content.trim() || content === previous) return;

    const appeared = !previous.trim();
    const added = content.length > previous.length;
    if (appeared || added || isBusy) {
      queueMicrotask(() => setSettingsOpen(false));
    }
  }, [content, isBusy]);

  const handleGenerate = async () => {
    if (!canGenerateMaterial(images.length, settings.lessonNumber)) {
      toast.error("Выберите тему урока или загрузите страницы");
      return;
    }
    trackEvent("ai_conspect_generate_click", {
      format: settings.format,
      detail: settings.detail,
      level: settings.level,
      file_count: images.length,
      focus_present: Boolean(settings.focus.trim()),
    });
    await generate();
    setSettingsOpen(false);
  };

  const handleRegenerate = async () => {
    try {
      setEditing(false);
      await regenerate();
      setSettingsOpen(false);
      trackEvent("ai_conspect_material_action", {
        action: "regenerate",
        format: settings.format,
        content_length: content.length,
      });
      toast.success(getRegeneratedMessage(settings.format));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось перегенерировать");
    }
  };

  const handleExportDocx = async () => {
    if (!content.trim()) {
      toast.error("Нет текста для DOCX");
      return;
    }
    setIsExportingDocx(true);
    try {
      const topicPart = selectedLesson
        ? ` № ${selectedLesson.number}. ${selectedLesson.title}`
        : "";
      const filename = `Конспект${topicPart}.docx`.replace(/[\\/:*?"<>|]+/g, " ");
      await exportMarkdownToDocx(content, { filename });
      trackEvent("ai_conspect_material_action", {
        action: "export_docx",
        format: contentFormat,
        content_length: content.length,
      });
      toast.success("DOCX сохранён");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Не удалось создать DOCX",
      );
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleCopy = async () => {
    if (!content.trim()) return;
    try {
      await navigator.clipboard.writeText(content);
      trackEvent("ai_conspect_material_action", {
        action: "copy",
        format: contentFormat,
        content_length: content.length,
      });
      toast.success("Скопировано в буфер обмена");
    } catch {
      toast.error("Не удалось скопировать");
    }
  };

  const handleReset = () => {
    if (!window.confirm("Удалить текущий конспект?")) return;
    resetContent();
    setEditing(false);
    setSettingsOpen(true);
    toast.success("Материал сброшен");
  };

  return (
    <div className="h-dvh overflow-y-auto bg-background">
      <Toaster position="top-center" richColors />
      <main className="mx-auto grid min-h-full max-w-7xl grid-rows-[auto_auto_minmax(180px,1fr)] gap-3 px-3 py-3 sm:px-4">
        <section className="app-card p-3">
          {hasContent && (
            <button
              type="button"
              onClick={() => setSettingsOpen((open) => !open)}
              className="flex w-full items-center justify-between gap-3 text-left"
              aria-expanded={settingsOpen}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-base font-semibold leading-tight">
                    Материалы и настройки
                  </h1>
                  <span className="text-xs text-muted-foreground">
                    {images.length} файл(ов)
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {settingPills.map((pill) => (
                    <span key={pill} className="settings-pill">
                      {pill}
                    </span>
                  ))}
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-900">
                {settingsOpen ? "Скрыть" : "Показать"}
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    settingsOpen ? "rotate-180" : ""
                  }`}
                />
              </span>
            </button>
          )}

          {(!hasContent || settingsOpen) && (
            <div
              className={
                hasContent
                  ? "mt-3 grid gap-3 border-t border-border/70 pt-3 lg:grid-cols-[220px_minmax(0,1fr)]"
                  : "grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]"
              }
            >
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <h1 className="text-base font-semibold leading-tight">
                      Материалы
                    </h1>
                    <p className="text-[11px] text-muted-foreground">
                      {images.length
                        ? `${images.length} файл(ов)`
                        : "Файлы необязательны при выборе темы"}
                    </p>
                  </div>
                </div>
                <FileUploadZone
                  onImagesReady={(imgs) => {
                    if (imgs.length > images.length) {
                      trackEvent("ai_conspect_material_uploaded", {
                        file_count: imgs.length,
                        scenario: "teach_summary",
                      });
                    }
                    setImages(imgs);
                  }}
                  disabled={isBusy}
                />
              </div>

              <div className="rounded-2xl border border-border/70 bg-card p-3 sm:p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold leading-tight">
                      Настройки генерации
                    </h2>
                  </div>
                </div>
                <SummarySettingsPanel
                  settings={settings}
                  onSettingsChange={setSettings}
                  onGenerate={() =>
                    void (hasContent ? handleRegenerate() : handleGenerate())
                  }
                  hasImages={images.length > 0}
                  hasContent={hasContent}
                  isBusy={isBusy}
                />
              </div>
            </div>
          )}
        </section>

        <section className="app-card min-h-12 p-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            {hasContent ? (
              <>
              {REFINEMENT_OPTIONS.map((r) => {
                const availability = getRefinementAvailability(
                  contentFormat,
                  r.value,
                );
                return (
                  <button
                    key={r.value}
                    type="button"
                    disabled={isBusy || availability.disabled}
                    title={availability.reason}
                    onClick={() => {
                      trackEvent("ai_conspect_material_action", {
                        action: "refine",
                        format: contentFormat,
                        refinement_type: r.value,
                        content_length: content.length,
                      });
                      void refine(r.value);
                    }}
                    className="app-chip disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span>{r.emoji}</span>
                    {r.label}
                  </button>
                );
              })}
                <button
                  type="button"
                    disabled={isBusy || !canGenerateMaterial(images.length, settings.lessonNumber)}
                  onClick={() => setSettingsOpen(true)}
                  className="app-chip"
                >
                  <RefreshCw className="h-4 w-4 shrink-0" />
                  Перегенерировать
                </button>
                {!editing && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    disabled={isBusy}
                    className="app-chip"
                  >
                    <Pencil className="h-4 w-4 shrink-0" />
                    Редактировать
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleExportDocx()}
                  disabled={isBusy || isExportingDocx}
                   className="app-chip"
                >
                  {isExportingDocx ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 shrink-0" />
                  )}
                  {isExportingDocx ? "DOCX…" : "DOCX"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  disabled={isBusy || !content.trim()}
                  className="app-chip"
                >
                  <Copy className="h-4 w-4 shrink-0" />
                  Копировать
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleReset}
                  className="app-chip"
                >
                  <Trash2 className="h-4 w-4 shrink-0" />
                  Сброс
                </button>
              </>
            ) : (
              <p className="px-2 text-sm text-muted-foreground">
                После генерации здесь появятся быстрые действия и варианты
                улучшения конспекта.
              </p>
            )}
            {isBusy && (
              <Button variant="destructive" size="sm" onClick={cancel}>
                <Square className="h-4 w-4 shrink-0" />
                Стоп
              </Button>
            )}
          </div>
        </section>

        <section className="app-card min-h-0 overflow-hidden p-0">
          <div className="flex h-full min-h-0 flex-col">
            {isBusy && (
              <div className="border-b border-border/70 p-3">
                <ProcessingProgress
                  streaming={status === "streaming"}
                  format={settings.format}
                />
              </div>
            )}

            {error && (
              <p className="m-3 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            {!hasContent && !isBusy && (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <div className="h-14 w-14 rounded-2xl bg-violet-100 flex items-center justify-center mb-4">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <p className="max-w-sm">
                  {selectedLesson ? `№ ${selectedLesson.number} · ${selectedLesson.title}` : "Выберите тему урока или загрузите страницы учебника"}.
                </p>
              </div>
            )}

            {hasContent && (content || isBusy) && (
              <div className="min-h-0 flex-1 p-4 sm:p-6">
                {editing ? (
                  <SummaryResult
                    content={content}
                    editing
                    onSave={(md) => {
                      setContent(md);
                      setEditing(false);
                      trackEvent("ai_conspect_material_action", {
                        action: "edit",
                        format: contentFormat,
                        content_length: md.length,
                      });
                      toast.success("Изменения сохранены");
                    }}
                    onCancelEdit={() => setEditing(false)}
                  />
                ) : (
                  <SummaryResult content={content} />
                )}
              </div>
            )}
          </div>
        </section>
      </main>

    </div>
  );
}
