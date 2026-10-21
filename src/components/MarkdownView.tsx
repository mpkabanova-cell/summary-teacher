import { useMemo } from "react";
import { markdownToViewHtml } from "@/lib/markdown-html";

interface MarkdownViewProps {
  markdown: string;
  className?: string;
}

export function MarkdownView({ markdown, className }: MarkdownViewProps) {
  const html = useMemo(() => markdownToViewHtml(markdown), [markdown]);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
