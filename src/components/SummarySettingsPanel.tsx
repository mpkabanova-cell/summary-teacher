import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup } from "@/components/ui/toggle-group";
import {
  DETAIL_OPTIONS,
  FORMAT_OPTIONS,
  LEVEL_OPTIONS,
  getGenerateActionLabel,
  type SummarySettings,
} from "@/lib/summary-types";

interface SummarySettingsPanelProps {
  settings: SummarySettings;
  onSettingsChange: (settings: SummarySettings) => void;
  onGenerate: () => void;
  hasImages: boolean;
  hasContent: boolean;
  isBusy: boolean;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
      {children}
    </p>
  );
}

export function SummarySettingsPanel({
  settings,
  onSettingsChange,
  onGenerate,
  hasImages,
  hasContent,
  isBusy,
}: SummarySettingsPanelProps) {
  const update = <K extends keyof SummarySettings>(
    key: K,
    value: SummarySettings[K],
  ) => onSettingsChange({ ...settings, [key]: value });

  const formatToggles = FORMAT_OPTIONS.map((o) => ({
    value: o.value,
    label: `${o.emoji} ${o.label}`,
  }));

  return (
    <div className="space-y-4">
      <div>
        <SectionLabel>Формат</SectionLabel>
        <ToggleGroup
          options={formatToggles}
          value={settings.format}
          onChange={(v) => update("format", v)}
          disabled={isBusy}
          columns={5}
          itemClassName="min-w-0"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div>
        <SectionLabel>Детализация</SectionLabel>
        <ToggleGroup
          options={DETAIL_OPTIONS}
          value={settings.detail}
          onChange={(v) => update("detail", v)}
          disabled={isBusy}
          columns={3}
        />
      </div>

        <div>
        <SectionLabel>Стиль объяснения</SectionLabel>
        <ToggleGroup
          options={LEVEL_OPTIONS}
          value={settings.level}
          onChange={(v) => update("level", v)}
          disabled={isBusy}
          itemClassName="min-w-[118px] flex-1"
        />
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <SectionLabel>Фокус (необязательно)</SectionLabel>
          <Input
            placeholder="формулы, даты, определения…"
            value={settings.focus}
            onChange={(e) => update("focus", e.target.value)}
            disabled={isBusy}
            className="mt-0 h-11 rounded-xl"
          />
        </div>

        <Button
          className="h-11 min-w-48 shrink-0 rounded-xl whitespace-nowrap leading-tight"
          size="default"
          onClick={onGenerate}
          disabled={!hasImages || isBusy}
        >
          <Sparkles className="h-4 w-4" />
          {getGenerateActionLabel(settings.format, hasContent)}
        </Button>
      </div>
    </div>
  );
}
