import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invokeSummarizeStream } from "@/lib/edgeInvoke";
import { trackEvent } from "@/lib/analytics";
import { cleanSummaryContent } from "@/lib/summary-cleanup";
import {
  DEFAULT_SETTINGS,
  normalizeSummarySettings,
  FEEDBACK_SENT_KEY,
  HISTORY_INDEX_KEY,
  HISTORY_KEY,
  MATERIALS_KEY,
  MAX_HISTORY,
  type RefinementType,
  type SummaryFormat,
  type SummarySettings,
} from "@/lib/summary-types";

type Status = "idle" | "processing" | "streaming" | "done" | "error";
type HistorySnapshot = { text: string; format: SummaryFormat };

const REFINEMENT_BEHAVIOR: Record<RefinementType, "append" | "rewrite"> = {
  shorter: "rewrite",
  simpler: "rewrite",
  examples: "append",
  quiz: "append",
};

function readStoredImages(): string[] {
  try {
    const raw = sessionStorage.getItem(MATERIALS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string")
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function storeImages(images: string[]): void {
  try {
    if (images.length) {
      sessionStorage.setItem(MATERIALS_KEY, JSON.stringify(images));
    } else {
      sessionStorage.removeItem(MATERIALS_KEY);
    }
  } catch {
    // Large PDFs can exceed browser storage; regeneration still works in memory.
  }
}

export function useSummarize() {
  const [settings, setSettingsState] = useState<SummarySettings>(() =>
    normalizeSummarySettings(DEFAULT_SETTINGS),
  );
  const settingsRef = useRef(settings);
  const [images, setImagesState] = useState<string[]>(readStoredImages);
  const [content, setContent] = useState("");
  const [contentFormat, setContentFormat] = useState<SummaryFormat>(
    settings.format,
  );
  const contentFormatRef = useRef<SummaryFormat>(settings.format);

  const setSettings = useCallback((next: SummarySettings) => {
    const normalized = normalizeSummarySettings(next);
    settingsRef.current = normalized;
    setSettingsState(normalized);
  }, []);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyIndexRef = useRef(-1);
  const abortRef = useRef<AbortController | null>(null);

  const setImages = useCallback((nextImages: string[]) => {
    setImagesState(nextImages);
    storeImages(nextImages);
  }, []);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const displayContent = useMemo(
    () => cleanSummaryContent(content, contentFormat),
    [content, contentFormat],
  );

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  const setActiveContentFormat = useCallback((format: SummaryFormat) => {
    contentFormatRef.current = format;
    setContentFormat(format);
  }, []);

  const pushHistory = useCallback((snapshot: HistorySnapshot) => {
    const currentIdx = historyIndexRef.current;
    setHistory((prev) => {
      const trimmed = prev.slice(0, currentIdx + 1);
      const next = [...trimmed, snapshot].slice(-MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      const idx = next.length - 1;
      localStorage.setItem(HISTORY_INDEX_KEY, String(idx));
      historyIndexRef.current = idx;
      setHistoryIndex(idx);
      return next;
    });
  }, []);

  const saveSnapshot = useCallback(
    (text: string, format = contentFormatRef.current) => {
      if (!text.trim()) return;
      pushHistory({ text, format });
    },
    [pushHistory],
  );

  const runStream = useCallback(
    async (params: {
      imageList: string[];
      settings: SummarySettings;
      existingContent?: string;
      refinement?: RefinementType;
      append?: boolean;
    }) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);
      setStatus("processing");

      let accumulated = params.append
        ? `${params.existingContent ?? ""}\n\n---\n\n`
        : "";

      const applyCleanup = (text: string) =>
        cleanSummaryContent(text, params.settings.format);
      const startedAt = performance.now();

      try {
        setActiveContentFormat(params.settings.format);
        setStatus("streaming");
        await invokeSummarizeStream(
          {
            images: params.imageList,
            settings: params.settings,
            existingContent: params.existingContent,
            refinement: params.refinement,
          },
          (chunk) => {
            accumulated += chunk;
            setContent(applyCleanup(accumulated));
          },
          controller.signal,
        );
        const cleaned = applyCleanup(accumulated);
        setContent(cleaned);
        setStatus("done");
        saveSnapshot(cleaned, params.settings.format);
        if (cleaned.trim()) {
          trackEvent("ai_conspect_generation_success", {
            format: params.settings.format,
            detail: params.settings.detail,
            level: params.settings.level,
            file_count: params.imageList.length,
            content_length: cleaned.length,
            duration_ms: Math.round(performance.now() - startedAt),
          });
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setStatus("error");
        setError(e instanceof Error ? e.message : "Неизвестная ошибка");
      }
    },
    [saveSnapshot, setActiveContentFormat],
  );

  const generate = useCallback(
    async (imageList = images) => {
      if (!imageList.length) {
        throw new Error("Загрузите хотя бы одну страницу");
      }
      const activeSettings = settingsRef.current;
      setImages(imageList);
      setContent("");
      setActiveContentFormat(activeSettings.format);
      await runStream({ imageList, settings: activeSettings });
    },
    [images, runStream, setActiveContentFormat, setImages],
  );

  const refine = useCallback(
    async (type: RefinementType) => {
      if (!content.trim()) return;
      const behavior = REFINEMENT_BEHAVIOR[type];
      const separator = "\n\n---\n\n";
      const base = content;
      const refinementSettings: SummarySettings = {
        ...settingsRef.current,
        format: contentFormatRef.current,
      };
      if (behavior === "append") {
        setContent(base + separator);
      }
      await runStream({
        imageList: images.length ? images : [],
        settings: refinementSettings,
        existingContent: base,
        refinement: type,
        append: behavior === "append",
      });
    },
    [content, images, runStream],
  );

  const regenerate = useCallback(async () => {
    if (!images.length) {
      throw new Error("Нет загруженных страниц — загрузите материалы снова");
    }
    const activeSettings = settingsRef.current;
    setContent("");
    setActiveContentFormat(activeSettings.format);
    await runStream({ imageList: images, settings: activeSettings });
  }, [images, runStream, setActiveContentFormat]);

  const resetContent = useCallback(() => {
    abortRef.current?.abort();
    setContent("");
    setActiveContentFormat(DEFAULT_SETTINGS.format);
    setError(null);
    setStatus("idle");
    setHistory([]);
    setHistoryIndex(-1);
    historyIndexRef.current = -1;
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(HISTORY_INDEX_KEY);
  }, [setActiveContentFormat]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setStatus((s) => (s === "streaming" ? "done" : s));
  }, []);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const idx = historyIndex - 1;
    const snapshot = history[idx];
    setHistoryIndex(idx);
    localStorage.setItem(HISTORY_INDEX_KEY, String(idx));
    setContent(snapshot?.text ?? "");
    if (snapshot?.format) setActiveContentFormat(snapshot.format);
  }, [history, historyIndex, setActiveContentFormat]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const idx = historyIndex + 1;
    const snapshot = history[idx];
    setHistoryIndex(idx);
    localStorage.setItem(HISTORY_INDEX_KEY, String(idx));
    setContent(snapshot?.text ?? "");
    if (snapshot?.format) setActiveContentFormat(snapshot.format);
  }, [history, historyIndex, setActiveContentFormat]);

  const updateContent = useCallback(
    (text: string) => {
      setContent(text);
      saveSnapshot(text, contentFormatRef.current);
    },
    [saveSnapshot],
  );

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex >= 0 && historyIndex < history.length - 1;
  const isBusy = status === "processing" || status === "streaming";

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isBusy || (content && status !== "idle")) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isBusy, content, status]);

  return {
    settings,
    setSettings,
    contentFormat,
    images,
    setImages,
    content: displayContent,
    setContent: updateContent,
    status,
    error,
    generate,
    regenerate,
    refine,
    resetContent,
    cancel,
    undo,
    redo,
    canUndo,
    canRedo,
    isBusy,
    isDone: status === "done",
    hasContent: Boolean(displayContent.trim()),
  };
}

export function wasFeedbackSent(): boolean {
  return localStorage.getItem(FEEDBACK_SENT_KEY) === "1";
}

export function markFeedbackSent(): void {
  localStorage.setItem(FEEDBACK_SENT_KEY, "1");
}
