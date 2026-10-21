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
      <Button className="h-11 w-auto" onClick={onGenerate} disabled={!canGenerateMaterial(0, settings.lessonNumber, settings.courseId) || isBusy}>
        <Sparkles className="h-4 w-4" />
        {hasContent ? "Перегенерировать материалы" : "Создать материалы"}
      </Button>
    </div>
  );
}
