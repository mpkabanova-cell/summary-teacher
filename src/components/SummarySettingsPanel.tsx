import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LessonSelector } from "@/components/LessonSelector";
import { canGenerateMaterial } from "@/lib/lesson-directory";
import type { SummarySettings } from "@/lib/summary-types";

interface SummarySettingsPanelProps {
  settings: SummarySettings;
  onSettingsChange: (settings: SummarySettings) => void;
  onGenerate: () => void;
  hasContent: boolean;
  isBusy: boolean;
}

export function SummarySettingsPanel({ settings, onSettingsChange, onGenerate, hasContent, isBusy }: SummarySettingsPanelProps) {
  const update = <K extends keyof SummarySettings>(key: K, value: SummarySettings[K]) =>
    onSettingsChange({ ...settings, [key]: value });
  return (
    <div className="space-y-4">
      <LessonSelector courseId={settings.courseId} lessonNumber={settings.lessonNumber}
        onCourseChange={(courseId) => onSettingsChange({ ...settings, courseId, lessonNumber: undefined })}
        onChange={(number) => update("lessonNumber", number)} disabled={isBusy} />
      {hasContent && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Детализация</p>
              <ToggleGroup options={DETAIL_OPTIONS} value={settings.detail} onChange={(v) => update("detail", v)} disabled={isBusy} columns={3} />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Стиль объяснения</p>
              <ToggleGroup options={LEVEL_OPTIONS} value={settings.level} onChange={(v) => update("level", v)} disabled={isBusy} itemClassName="min-w-0 flex-1 whitespace-normal" />
            </div>
          </div>
          <label className="block space-y-2 text-xs font-medium text-muted-foreground">
            <span>Пожелания (необязательно)</span>
            <Input aria-label="Пожелания" placeholder="Больше задач на сравнение дробей…" value={settings.focus} onChange={(e) => update("focus", e.target.value)} disabled={isBusy} className="h-11 bg-card text-foreground" />
          </label>
        </>
      )}
      <Button className="h-11 w-auto" onClick={onGenerate} disabled={!canGenerateMaterial(0, settings.lessonNumber, settings.courseId) || isBusy}>
        <Sparkles className="h-4 w-4" />
        {hasContent ? "Перегенерировать материалы" : "Создать материалы"}
      </Button>
    </div>
  );
}
