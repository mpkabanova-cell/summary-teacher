// Exports the generated markdown summary as a .docx file.
// LaTeX formulas ($...$ / $$...$$) become native Word formulas via
// latexToDocxMath, so they stay editable in Word.
import { marked, type Token, type Tokens } from "marked";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { Math as DocxMath } from "docx";
import { preprocessSummaryContent } from "@/lib/math-preprocess";
import { latexToDocxMath } from "@/lib/mathml-to-docx";

// A4 with 1" margins: (11906 - 2880) DXA of content width.
const CONTENT_WIDTH_DXA = 9026;

const MATH_PATTERN = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

type InlineChild = TextRun | DocxMath;
type BlockChild = Paragraph | Table;

interface InlineStyle {
  bold?: boolean;
  italics?: boolean;
  strike?: boolean;
}

function mathRun(latex: string): InlineChild {
  return (
    latexToDocxMath(latex) ??
    new TextRun({ text: latex, font: "Cambria Math" })
  );
}

function renderTextWithMath(text: string, style: InlineStyle): InlineChild[] {
  const out: InlineChild[] = [];
  let lastIndex = 0;
  MATH_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MATH_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push(
        new TextRun({
          text: text.slice(lastIndex, match.index),
          bold: style.bold,
          italics: style.italics,
          strike: style.strike,
        }),
      );
    }
    out.push(mathRun((match[1] ?? match[2] ?? "").trim()));
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    out.push(
      new TextRun({
        text: text.slice(lastIndex),
        bold: style.bold,
        italics: style.italics,
        strike: style.strike,
      }),
    );
  }
  return out;
}

function renderInlineTokens(
  tokens: Token[] | undefined,
  style: InlineStyle,
): InlineChild[] {
  const out: InlineChild[] = [];
  for (const token of tokens ?? []) {
    switch (token.type) {
      case "text": {
        const t = token as Tokens.Text;
        out.push(
          ...(t.tokens
            ? renderInlineTokens(t.tokens, style)
            : renderTextWithMath(t.text, style)),
        );
        break;
      }
      case "escape":
        out.push(
          ...renderTextWithMath((token as Tokens.Escape).text, style),
        );
        break;
      case "strong":
        out.push(
          ...renderInlineTokens((token as Tokens.Strong).tokens, {
            ...style,
            bold: true,
          }),
        );
        break;
      case "em":
        out.push(
          ...renderInlineTokens((token as Tokens.Em).tokens, {
            ...style,
            italics: true,
          }),
        );
        break;
      case "del":
        out.push(
          ...renderInlineTokens((token as Tokens.Del).tokens, {
            ...style,
            strike: true,
          }),
        );
        break;
      case "codespan":
        out.push(
          new TextRun({
            text: (token as Tokens.Codespan).text,
            font: "Consolas",
          }),
        );
        break;
      case "br":
        out.push(new TextRun({ text: " ", break: 1 }));
        break;
      case "link":
        out.push(
          ...renderInlineTokens((token as Tokens.Link).tokens, style),
        );
        break;
      case "image": {
        const alt = (token as Tokens.Image).text;
        if (alt) out.push(new TextRun({ text: alt, italics: true }));
        break;
      }
      default: {
        const nested = (token as { tokens?: Token[] }).tokens;
        const plain = (token as { text?: string }).text;
        if (nested) out.push(...renderInlineTokens(nested, style));
        else if (plain) out.push(...renderTextWithMath(plain, style));
      }
    }
  }
  return out;
}

const HEADING_LEVELS = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
] as const;

function renderHeading(token: Tokens.Heading): Paragraph {
  return new Paragraph({
    heading: HEADING_LEVELS[Math.min(token.depth, 6) - 1],
    children: renderInlineTokens(token.tokens, {}),
  });
}

function isDisplayMathOnly(text: string): boolean {
  return /^\$\$[\s\S]+\$\$$/.test(text.trim());
}

function renderParagraph(token: Tokens.Paragraph): Paragraph {
  const trimmed = token.text.trim();
  if (isDisplayMathOnly(trimmed)) {
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [mathRun(trimmed.slice(2, -2).trim())],
    });
  }
  return new Paragraph({ children: renderInlineTokens(token.tokens, {}) });
}

function renderList(
  token: Tokens.List,
  level: number,
): BlockChild[] {
  const reference = token.ordered ? "export-number" : "export-bullet";
  const out: BlockChild[] = [];
  for (const item of token.items) {
    for (const child of item.tokens) {
      if (child.type === "list") {
        out.push(...renderList(child as Tokens.List, level + 1));
      } else if (child.type === "text" || child.type === "paragraph") {
        out.push(
          new Paragraph({
            numbering: { reference, level: Math.min(level, 2) },
            children: renderInlineTokens(
              (child as Tokens.Text).tokens ??
                ([child] as Token[]),
              {},
            ),
          }),
        );
      } else {
        out.push(...renderBlock(child));
      }
    }
  }
  return out;
}

function renderTable(token: Tokens.Table): Table {
  const columnCount = Math.max(token.header.length, 1);
  const baseWidth = Math.floor(CONTENT_WIDTH_DXA / columnCount);
  const columnWidths = Array.from({ length: columnCount }, (_, i) =>
    i === columnCount - 1
      ? CONTENT_WIDTH_DXA - baseWidth * (columnCount - 1)
      : baseWidth,
  );

  const buildRow = (
    cells: Array<{ tokens?: Token[]; text: string }>,
    header: boolean,
  ) =>
    new TableRow({
      tableHeader: header,
      children: cells.map(
        (cell, i) =>
          new TableCell({
            width: { size: columnWidths[i] ?? baseWidth, type: WidthType.DXA },
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            ...(header
              ? { shading: { fill: "EDEBF7", type: ShadingType.CLEAR } }
              : {}),
            children: [
              new Paragraph({
                children: renderInlineTokens(cell.tokens, {
                  bold: header,
                }),
              }),
            ],
          }),
      ),
    });

  return new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    columnWidths,
    rows: [
      buildRow(token.header, true),
      ...token.rows.map((row) => buildRow(row, false)),
    ],
  });
}

function renderBlock(token: Token): BlockChild[] {
  switch (token.type) {
    case "heading":
      return [renderHeading(token as Tokens.Heading)];
    case "paragraph":
      return [renderParagraph(token as Tokens.Paragraph)];
    case "list":
      return renderList(token as Tokens.List, 0);
    case "table":
      return [renderTable(token as Tokens.Table)];
    case "blockquote":
      return (token as Tokens.Blockquote).tokens.flatMap((inner) => {
        if (inner.type === "paragraph") {
          return [
            new Paragraph({
              indent: { left: 360 },
              children: renderInlineTokens(
                (inner as Tokens.Paragraph).tokens,
                { italics: true },
              ),
            }),
          ];
        }
        return renderBlock(inner);
      });
    case "code":
      return (token as Tokens.Code).text.split("\n").map(
        (line) =>
          new Paragraph({
            children: [new TextRun({ text: line, font: "Consolas" })],
          }),
      );
    default:
      return [];
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

async function deliverFile(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: blob.type });
  const touch = matchMedia("(pointer: coarse)").matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return;
    }
  }
  downloadBlob(blob, filename);
}

export interface ExportMarkdownToDocxOptions {
  filename?: string;
}

export async function exportMarkdownToDocx(
  markdown: string,
  options: ExportMarkdownToDocxOptions = {},
): Promise<void> {
  const filename = options.filename ?? "конспект.docx";
  if (!markdown.trim()) {
    throw new Error("Нет содержимого для экспорта");
  }

  const tokens = marked.lexer(preprocessSummaryContent(markdown));
  const children = tokens.flatMap((token) => renderBlock(token));
  if (children.length === 0) {
    throw new Error("Нет содержимого для экспорта");
  }

  const document = new Document({
    numbering: {
      config: [
        {
          reference: "export-bullet",
          levels: [0, 1, 2].map((level) => ({
            level,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: {
                indent: { left: 720 * (level + 1), hanging: 360 },
              },
            },
          })),
        },
        {
          reference: "export-number",
          levels: [0, 1, 2].map((level) => ({
            level,
            format: LevelFormat.DECIMAL,
            text: `%${level + 1}.`,
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: {
                indent: { left: 720 * (level + 1), hanging: 360 },
              },
            },
          })),
        },
      ],
    },
    styles: {
      default: {
        document: {
          run: { font: "Times New Roman", size: 28 },
          paragraph: { spacing: { after: 120, line: 276 } },
        },
      },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 36, bold: true, font: "Times New Roman" },
          paragraph: {
            spacing: { before: 240, after: 120 },
            outlineLevel: 0,
          },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 32, bold: true, font: "Times New Roman" },
          paragraph: {
            spacing: { before: 200, after: 100 },
            outlineLevel: 1,
          },
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 28, bold: true, font: "Times New Roman" },
          paragraph: {
            spacing: { before: 160, after: 80 },
            outlineLevel: 2,
          },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(document);
  await deliverFile(blob, filename);
}
