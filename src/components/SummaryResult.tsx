import { useMemo } from "react";
import { MarkdownView } from "@/components/MarkdownView";
import { WysiwygEditor } from "@/components/WysiwygEditor";
import { preprocessSummaryContent } from "@/lib/math-preprocess";

interface SummaryResultProps {
  content: string;
  editing?: boolean;
  onSave?: (content: string) => void;
  onCancelEdit?: () => void;
}

export function SummaryResult({
  content,
  editing = false,
  onSave,
  onCancelEdit,
}: SummaryResultProps) {
  const processed = useMemo(
    () => preprocessSummaryContent(content),
    [content],
  );

  if (editing && onSave && onCancelEdit) {
    return (
      <WysiwygEditor
        markdown={content}
        onSave={onSave}
        onCancel={onCancelEdit}
      />
    );
  }

  return (
    <article className="summary-content prose-sm max-w-none">
      <MarkdownView markdown={processed} />
    </article>
  );
}
