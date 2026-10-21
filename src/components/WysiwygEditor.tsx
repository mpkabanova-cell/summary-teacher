import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Sigma,
  Minus,
  Undo2,
  Redo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormulaEditorDialog } from "@/components/FormulaEditorDialog";
import {
  editorHtmlToMarkdown,
  markdownToEditorHtml,
} from "@/lib/markdown-html";
import { cn } from "@/lib/utils";
import katex from "katex";

interface WysiwygEditorProps {
  markdown: string;
  onSave: (markdown: string) => void;
  onCancel: () => void;
}

function ToolbarBtn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "h-8 w-8 inline-flex items-center justify-center rounded-md text-sm hover:bg-muted transition-colors",
        active && "bg-muted text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function WysiwygEditor({ markdown, onSave, onCancel }: WysiwygEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [formulaOpen, setFormulaOpen] = useState(false);
  const initialHtmlRef = useRef("");

  useEffect(() => {
    const html = markdownToEditorHtml(markdown);
    initialHtmlRef.current = html;
    if (editorRef.current) {
      editorRef.current.innerHTML = html;
    }
  }, [markdown]);

  const exec = useCallback((command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  }, []);

  const [editingLatex, setEditingLatex] = useState<string | null>(null);

  const insertFormula = useCallback((latex: string, displayMode: boolean) => {
    const el = editorRef.current;
    if (!el) return;

    el.focus();
    let rendered: string;
    try {
      rendered = katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
      });
    } catch {
      rendered = latex;
    }

    const chip = document.createElement(displayMode ? "div" : "span");
    chip.className = displayMode
      ? "math-formula math-display"
      : "math-formula";
    chip.contentEditable = "false";
    chip.setAttribute("data-latex", latex);
    if (displayMode) chip.setAttribute("data-display", "true");
    chip.innerHTML = rendered;

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(chip);
      range.setStartAfter(chip);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      el.appendChild(chip);
    }
  }, []);

  const handleSave = () => {
    if (!editorRef.current) return;
    const md = editorHtmlToMarkdown(editorRef.current.innerHTML);
    onSave(md);
  };

  return (
    <div className="flex flex-col border rounded-xl overflow-hidden bg-card">
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b bg-muted/30">
        <ToolbarBtn title="Отменить" onClick={() => exec("undo")}>
          <Undo2 className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Повторить" onClick={() => exec("redo")}>
          <Redo2 className="h-4 w-4" />
        </ToolbarBtn>

        <span className="w-px h-6 bg-border mx-1" />

        <ToolbarBtn title="Жирный" onClick={() => exec("bold")}>
          <Bold className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Курсив" onClick={() => exec("italic")}>
          <Italic className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Подчёркнутый" onClick={() => exec("underline")}>
          <Underline className="h-4 w-4" />
        </ToolbarBtn>

        <span className="w-px h-6 bg-border mx-1" />

        <ToolbarBtn title="Заголовок 1" onClick={() => exec("formatBlock", "h1")}>
          <Heading1 className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Заголовок 2" onClick={() => exec("formatBlock", "h2")}>
          <Heading2 className="h-4 w-4" />
        </ToolbarBtn>

        <span className="w-px h-6 bg-border mx-1" />

        <ToolbarBtn title="Нумерованный список" onClick={() => exec("insertOrderedList")}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Маркированный список" onClick={() => exec("insertUnorderedList")}>
          <List className="h-4 w-4" />
        </ToolbarBtn>

        <span className="w-px h-6 bg-border mx-1" />

        <ToolbarBtn
          title="Вставить формулу"
          onClick={() => setFormulaOpen(true)}
        >
          <Sigma className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Горизонтальная линия" onClick={() => exec("insertHorizontalRule")}>
          <Minus className="h-4 w-4" />
        </ToolbarBtn>

        <div className="flex-1" />

        <Button variant="ghost" size="sm" type="button" onClick={onCancel}>
          Отмена
        </Button>
        <Button size="sm" type="button" onClick={handleSave} className="ml-1">
          Сохранить
        </Button>
      </div>

      <div
        ref={editorRef}
        className="wysiwyg-editor min-h-[400px] max-h-[60vh] overflow-y-auto p-4 prose prose-sm max-w-none focus:outline-none"
        contentEditable
        suppressContentEditableWarning
        spellCheck
        lang="ru"
        onDoubleClick={(e) => {
          const target = (e.target as HTMLElement).closest(
            ".math-formula",
          ) as HTMLElement | null;
          if (!target) return;
          e.preventDefault();
          setEditingLatex(target.getAttribute("data-latex") ?? "");
          target.setAttribute("data-editing", "true");
          setFormulaOpen(true);
        }}
      />

      <FormulaEditorDialog
        open={formulaOpen}
        initialLatex={editingLatex}
        onClose={() => {
          setFormulaOpen(false);
          setEditingLatex(null);
          editorRef.current
            ?.querySelector('[data-editing="true"]')
            ?.removeAttribute("data-editing");
        }}
        onInsert={(latex, displayMode) => {
          const chip = editorRef.current?.querySelector(
            '[data-editing="true"]',
          ) as HTMLElement | null;
          if (chip) {
            chip.removeAttribute("data-editing");
            chip.setAttribute("data-latex", latex);
            if (displayMode) chip.setAttribute("data-display", "true");
            try {
              chip.innerHTML = katex.renderToString(latex, {
                displayMode,
                throwOnError: false,
              });
            } catch {
              chip.textContent = latex;
            }
            setEditingLatex(null);
            return;
          }
          insertFormula(latex, displayMode);
        }}
      />
    </div>
  );
}
