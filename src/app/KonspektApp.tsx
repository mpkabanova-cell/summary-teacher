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
import { SummarySettingsPanel } from "@/components/SummarySettingsPanel";
import { SummaryResult } from "@/components/SummaryResult";
import { ProcessingProgress } from "@/components/ProcessingProgress";
import { Button } from "@/components/ui/button";
import { useSummarize } from "@/hooks/useSummarize";
import { canGenerateMaterial, getSelectedLesson } from "@/lib/lesson-directory";
import { trackEvent } from "@/lib/analytics";
import { exportMarkdownToDocx } from "@/lib/export-docx";
import {
  formatSettingsPills,
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
    content,
    contentFormat,
    setContent,
    status,
    error,
    generate,
    regenerate,
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
    if (!canGenerateMaterial(0, settings.lessonNumber)) {
      toast.error("Выберите тему урока");
      return;
    }
    trackEvent("ai_conspect_generate_click", {
      format: settings.format,
      detail: settings.detail,
      level: settings.level,
      focus_present: Boolean(settings.focus.trim()),
    });
    try {
      await generate();
      setSettingsOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось создать материалы");
    }
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
      const filename = `Материалы${topicPart}.docx`.replace(/[\\/:*?"<>|]+/g, " ");
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
    if (!window.confirm("Удалить текущие материалы?")) return;
    resetContent();
    setEditing(false);
    setSettingsOpen(true);
    toast.success("Материал сброшен");
  };

  return (
    <div className="h-dvh overflow-y-auto bg-background">
      <Toaster position="top-center" richColors />
      <main className="mx-auto flex min-h-full max-w-7xl flex-col gap-3 px-3 py-3 sm:px-4">
        <section className="border-b border-border bg-card p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold">Конспект · Материалы к уроку</h1>
              {hasContent && <div className="mt-2 flex flex-wrap gap-1.5">
                {settingPills.map((pill) => <span key={pill} className="settings-pill">{pill}</span>)}
              </div>}
            </div>
            {hasContent && <Button variant="ghost" size="sm" disabled={isBusy} onClick={() => setSettingsOpen((open) => !open)} aria-expanded={settingsOpen} className="shrink-0">
              Настройки <ChevronDown className={`h-4 w-4 transition-transform ${settingsOpen ? "rotate-180" : ""}`} />
            </Button>}
          </div>
          {(!hasContent || settingsOpen) && <div className="mt-4">
            <SummarySettingsPanel settings={settings} onSettingsChange={setSettings} onGenerate={() => void (hasContent ? handleRegenerate() : handleGenerate())} hasContent={hasContent} isBusy={isBusy} />
          </div>}
        </section>

        <section className="border-b border-border p-2" hidden={!hasContent && !isBusy}>
          <div className="flex items-center gap-2 overflow-x-auto">
            {hasContent ? (
              <>
                <Button
                  type="button"
                    disabled={isBusy || !canGenerateMaterial(0, settings.lessonNumber)}
                  onClick={() => setSettingsOpen(true)}
                  className="rounded-lg border border-border bg-secondary text-secondary-foreground hover:bg-muted"
                >
                  <RefreshCw className="h-4 w-4 shrink-0" />
                  Перегенерировать
                </Button>
                {!editing && (
                  <Button
                    type="button"
                    onClick={() => setEditing(true)}
                    disabled={isBusy}
                    className="rounded-lg border border-border bg-secondary text-secondary-foreground hover:bg-muted"
                  >
                    <Pencil className="h-4 w-4 shrink-0" />
                    Редактировать
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={() => void handleExportDocx()}
                  disabled={isBusy || isExportingDocx}
                   className="rounded-lg border border-border bg-secondary text-secondary-foreground hover:bg-muted"
                >
                  {isExportingDocx ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 shrink-0" />
                  )}
                  {isExportingDocx ? "DOCX…" : "DOCX"}
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleCopy()}
                  disabled={isBusy || !content.trim()}
                  className="rounded-lg border border-border bg-secondary text-secondary-foreground hover:bg-muted"
                >
                  <Copy className="h-4 w-4 shrink-0" />
                  Копировать
                </Button>
                <Button
                  type="button"
                  disabled={isBusy}
                  onClick={handleReset}
                  className="rounded-lg border border-border bg-secondary text-secondary-foreground hover:bg-muted"
                >
                  <Trash2 className="h-4 w-4 shrink-0" />
                  Сброс
                </Button>
              </>
            ) : null}
            {isBusy && (
              <Button variant="destructive" size="sm" onClick={cancel}>
                <Square className="h-4 w-4 shrink-0" />
                Стоп
              </Button>
            )}
          </div>
        </section>

        <section className="min-h-48 flex-1 overflow-hidden bg-card p-0">
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
              <p className="m-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}

            {!hasContent && !isBusy && (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <div className="h-14 w-14 rounded-lg bg-secondary flex items-center justify-center mb-4">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <p className="max-w-sm">
                  {selectedLesson ? `№ ${selectedLesson.number} · ${selectedLesson.title}` : "Выберите тему урока учебника"}.
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
