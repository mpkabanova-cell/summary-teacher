import { useEffect, useMemo, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FormulaType = "fraction" | "power" | "sqrt" | "multiply" | "custom";

interface FormulaEditorDialogProps {
  open: boolean;
  initialLatex?: string | null;
  onClose: () => void;
  onInsert: (latex: string, displayMode: boolean) => void;
}

export function FormulaEditorDialog({
  open,
  initialLatex,
  onClose,
  onInsert,
}: FormulaEditorDialogProps) {
  const [type, setType] = useState<FormulaType>("fraction");
  const [a, setA] = useState("m");
  const [b, setB] = useState("n");
  const [custom, setCustom] = useState("a^2");

  const latex = useMemo(() => {
    switch (type) {
      case "fraction":
        return `\\frac{${a || "a"}}{${b || "b"}}`;
      case "power":
        return `${a || "a"}^{${b || "n"}}`;
      case "sqrt":
        return `\\sqrt{${a || "x"}}`;
      case "multiply":
        return `${a || "a"} \\cdot ${b || "b"}`;
      case "custom":
        return custom || "x";
      default:
        return "x";
    }
  }, [type, a, b, custom]);

  const previewHtml = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        throwOnError: false,
        displayMode: type === "fraction",
      });
    } catch {
      return latex;
    }
  }, [latex, type]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      if (initialLatex) {
        setType("custom");
        setCustom(initialLatex);
        return;
      }
      setType("fraction");
      setA("m");
      setB("n");
      setCustom("a^2");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, initialLatex]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="formula-editor-title"
    >
      <div className="w-full max-w-md rounded-xl bg-card border shadow-xl p-5 space-y-4">
        <h3 id="formula-editor-title" className="font-serif text-lg">
          Редактор формулы
        </h3>
        <p className="text-sm text-muted-foreground">
          Соберите формулу без знания LaTeX — мы сами запишем её правильно.
        </p>

        <div>
          <Label>Тип формулы</Label>
          <Select
            value={type}
            onValueChange={(v) => setType(v as FormulaType)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fraction">Дробь (a/b)</SelectItem>
              <SelectItem value="power">Степень (aⁿ)</SelectItem>
              <SelectItem value="sqrt">Корень (√a)</SelectItem>
              <SelectItem value="multiply">Умножение (a · b)</SelectItem>
              <SelectItem value="custom">Своя формула (для продвинутых)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {type === "fraction" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Числитель (верх)</Label>
              <Input className="mt-1" value={a} onChange={(e) => setA(e.target.value)} placeholder="m" />
            </div>
            <div>
              <Label>Знаменатель (низ)</Label>
              <Input className="mt-1" value={b} onChange={(e) => setB(e.target.value)} placeholder="n" />
            </div>
          </div>
        )}

        {type === "power" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Основание</Label>
              <Input className="mt-1" value={a} onChange={(e) => setA(e.target.value)} placeholder="a" />
            </div>
            <div>
              <Label>Показатель степени</Label>
              <Input className="mt-1" value={b} onChange={(e) => setB(e.target.value)} placeholder="n" />
            </div>
          </div>
        )}

        {type === "sqrt" && (
          <div>
            <Label>Выражение под корнем</Label>
            <Input className="mt-1" value={a} onChange={(e) => setA(e.target.value)} placeholder="2" />
          </div>
        )}

        {type === "multiply" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Первый множитель</Label>
              <Input className="mt-1" value={a} onChange={(e) => setA(e.target.value)} />
            </div>
            <div>
              <Label>Второй множитель</Label>
              <Input className="mt-1" value={b} onChange={(e) => setB(e.target.value)} />
            </div>
          </div>
        )}

        {type === "custom" && (
          <div>
            <Label>LaTeX (например: a^{`{p+q}`})</Label>
            <Input
              className="mt-1 font-mono text-sm"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
          </div>
        )}

        <div className="rounded-lg border bg-muted/40 p-4 text-center min-h-[56px] flex flex-col justify-center">
          <span className="text-xs text-muted-foreground mb-2">Так будет выглядеть:</span>
          <span dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Отмена
          </Button>
          <Button
            type="button"
            onClick={() => {
              onInsert(latex, type === "fraction");
              onClose();
            }}
          >
            Вставить формулу
          </Button>
        </div>
      </div>
    </div>
  );
}
