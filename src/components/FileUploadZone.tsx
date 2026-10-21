import { useCallback, useRef, useState } from "react";
import { Upload, X, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { compressImage, validateBase64Limits } from "@/lib/image-compress";
import { pdfToImages } from "@/lib/pdf-utils";
import { MAX_FILES } from "@/lib/summary-types";
import { cn } from "@/lib/utils";

interface FileUploadZoneProps {
  onImagesReady: (images: string[]) => void;
  disabled?: boolean;
}

export function FileUploadZone({ onImagesReady, disabled }: FileUploadZoneProps) {
  const [previews, setPreviews] = useState<{ name: string; dataUrl: string }[]>([]);
  const [strongCompress, setStrongCompress] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      setLoading(true);
      const fileArray = Array.from(files).slice(0, MAX_FILES);
      const results: { name: string; dataUrl: string }[] = [];

      try {
        for (const file of fileArray) {
          const remainingSlots = MAX_FILES - previews.length - results.length;
          if (remainingSlots <= 0) break;

          if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
            const pages = await pdfToImages(file, {
              scale: strongCompress ? 1.1 : 1.35,
              maxPages: remainingSlots,
              maxWidth: strongCompress ? 900 : 1200,
              quality: strongCompress ? 0.58 : 0.72,
            });
            pages.forEach((dataUrl, i) => {
              results.push({ name: `${file.name} стр.${i + 1}`, dataUrl });
            });
          } else if (
            file.type.startsWith("image/") ||
            file.name.match(/\.(jpe?g|png|heic|webp)$/i)
          ) {
            const dataUrl = await compressImage(file, strongCompress);
            results.push({ name: file.name, dataUrl });
          }
        }

        if (!results.length) {
          setError(`Можно загрузить не больше ${MAX_FILES} листов А4`);
          return;
        }

        const merged = [...previews, ...results].slice(0, MAX_FILES);
        const images = merged.map((p) => p.dataUrl);
        const limitError = validateBase64Limits(images);
        if (limitError) {
          setError(limitError);
          return;
        }

        setPreviews(merged);
        onImagesReady(images);
      } catch {
        setError("Не удалось обработать страницы");
      } finally {
        setLoading(false);
      }
    },
    [previews, strongCompress, onImagesReady],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled || loading) return;
      void processFiles(e.dataTransfer.files);
    },
    [disabled, loading, processFiles],
  );

  const removeAt = (index: number) => {
    const next = previews.filter((_, i) => i !== index);
    setPreviews(next);
    onImagesReady(next.map((p) => p.dataUrl));
  };

  const clearAll = () => {
    setPreviews([]);
    onImagesReady([]);
    setError(null);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={cn(
          "border-2 border-dashed border-violet-200 rounded-2xl p-4 text-center transition-colors bg-violet-50/30",
          !disabled && "hover:border-primary hover:bg-violet-50 cursor-pointer",
          disabled && "opacity-50 pointer-events-none",
        )}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <Upload className="mx-auto h-7 w-7 text-muted-foreground mb-2" />
        <p className="text-sm font-medium">Загрузите страницы</p>
        <p className="text-xs text-muted-foreground mt-1 leading-tight">
          PDF, JPG, PNG, HEIC или WEBP — до {MAX_FILES} листов А4
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf,application/pdf"
          multiple
          className="hidden"
          disabled={disabled || loading}
          onChange={(e) => e.target.files && void processFiles(e.target.files)}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="strong-compress" className="text-xs text-muted-foreground">
          Сильное сжатие
        </Label>
        <Switch
          id="strong-compress"
          checked={strongCompress}
          onCheckedChange={setStrongCompress}
          disabled={disabled}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-md p-2">{error}</p>
      )}

      {previews.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              Загружено листов: {previews.length}
            </span>
            <Button variant="ghost" size="sm" onClick={clearAll} type="button">
              Очистить
            </Button>
          </div>
          <ul className="space-y-2 max-h-28 overflow-y-auto">
            {previews.map((p, i) => (
              <li
                key={`${p.name}-${i}`}
                className="flex items-center gap-2 text-sm bg-accent/80 border border-violet-100 rounded-xl p-2"
              >
                <FileImage className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate flex-1">{p.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => removeAt(i)}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading && (
        <p className="text-sm text-muted-foreground animate-pulse">
          Обработка страниц…
        </p>
      )}
    </div>
  );
}
