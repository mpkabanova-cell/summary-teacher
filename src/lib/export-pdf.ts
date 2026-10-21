import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import "katex/dist/katex.min.css";
import { markdownToPrintHtml } from "@/lib/markdown-html";
import { PDF_KATEX_CSS } from "@/lib/pdf-katex-css";
import { rasterizeKatexIn } from "@/lib/pdf-katex-raster";
import {
  PDF_PAGE_HEIGHT_PX,
  PDF_PAGE_WIDTH_PX,
  buildPageElement,
  buildPdfFragments,
  measureFragments,
  packFragmentsIntoPages,
} from "@/lib/pdf-pagination";

const CANVAS_SCALE = 3;

function waitForFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function waitForRenderSettled(timeoutMs = 250): Promise<void> {
  await document.fonts.ready;
  await waitForFrame();
  await waitForFrame();
  await new Promise((resolve) => setTimeout(resolve, timeoutMs));
}

export type PdfExportPhase =
  | "preparing"
  | "formulas"
  | "layout"
  | "pages"
  | "saving";

export interface PdfExportProgress {
  phase: PdfExportPhase;
  message: string;
  current?: number;
  total?: number;
}

export interface ExportMarkdownToPdfOptions {
  filename?: string;
  onProgress?: (progress: PdfExportProgress) => void;
}

function report(
  onProgress: ExportMarkdownToPdfOptions["onProgress"],
  progress: PdfExportProgress,
): void {
  onProgress?.(progress);
}

function injectPdfStyles(root: HTMLElement): void {
  const styleEl = document.createElement("style");
  styleEl.textContent = PDF_KATEX_CSS;
  root.insertBefore(styleEl, root.firstChild);
}

async function renderPageToCanvas(pageEl: HTMLElement): Promise<HTMLCanvasElement> {
  return html2canvas(pageEl, {
    scale: CANVAS_SCALE,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    width: PDF_PAGE_WIDTH_PX,
    height: PDF_PAGE_HEIGHT_PX,
    windowWidth: PDF_PAGE_WIDTH_PX,
    windowHeight: PDF_PAGE_HEIGHT_PX,
    onclone: (clonedDoc) => {
      const page = clonedDoc.querySelector(".pdf-page");
      if (!page) return;
      const fix = clonedDoc.createElement("style");
      fix.textContent = PDF_KATEX_CSS;
      page.insertBefore(fix, page.firstChild);
    },
  });
}

export async function exportMarkdownToPdf(
  markdown: string,
  options: ExportMarkdownToPdfOptions = {},
): Promise<void> {
  const filename = options.filename ?? "конспект.pdf";
  const onProgress = options.onProgress;

  if (!markdown.trim()) {
    throw new Error("Нет содержимого для экспорта");
  }

  report(onProgress, {
    phase: "preparing",
    message: "Готовим PDF…",
  });

  const staging = document.createElement("div");
  staging.className = "pdf-export";
  staging.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    `width:${PDF_PAGE_WIDTH_PX}px`,
    "background:#ffffff",
    "visibility:visible",
  ].join(";");

  injectPdfStyles(staging);
  staging.insertAdjacentHTML(
    "beforeend",
    await markdownToPrintHtml(markdown),
  );
  await exportRenderedPrintHtml(staging, filename, onProgress);
}

async function exportRenderedPrintHtml(
  staging: HTMLElement,
  filename: string,
  onProgress?: ExportMarkdownToPdfOptions["onProgress"],
): Promise<void> {
  document.body.appendChild(staging);
  try {
    await waitForRenderSettled();

    const printBody = staging.querySelector(".pdf-print-body");
    if (!printBody || !(printBody instanceof HTMLElement)) {
      throw new Error("Не удалось подготовить содержимое");
    }

    const formulaCount = printBody.querySelectorAll(".katex").length;
    if (formulaCount > 0) {
      report(onProgress, {
        phase: "formulas",
        message: "Обрабатываем формулы…",
        current: 0,
        total: formulaCount,
      });
      await rasterizeKatexIn(printBody, {
        onProgress: (current, total) => {
          report(onProgress, {
            phase: "formulas",
            message: "Обрабатываем формулы…",
            current,
            total,
          });
        },
      });
    }

    report(onProgress, {
      phase: "layout",
      message: "Разбиваем на страницы…",
    });

    const fragments = buildPdfFragments(printBody);
    if (fragments.length === 0) {
      throw new Error("Нет содержимого для экспорта");
    }

    const measureRoot = document.createElement("div");
    measureRoot.className = "pdf-export";
    measureRoot.style.cssText = staging.style.cssText;
    injectPdfStyles(measureRoot);
    document.body.appendChild(measureRoot);

    const heights = measureFragments(fragments, measureRoot);
    document.body.removeChild(measureRoot);

    const pageGroups = packFragmentsIntoPages(fragments, heights);
    const pageTotal = pageGroups.length;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 0;

    const renderHost = document.createElement("div");
    renderHost.className = "pdf-export";
    renderHost.style.cssText = staging.style.cssText;
    document.body.appendChild(renderHost);

    try {
      for (let p = 0; p < pageTotal; p++) {
        report(onProgress, {
          phase: "pages",
          message: "Рисуем страницы…",
          current: p + 1,
          total: pageTotal,
        });

        const pageEl = buildPageElement(pageGroups[p]);
        injectPdfStyles(pageEl);
        renderHost.innerHTML = "";
        renderHost.appendChild(pageEl);
        await waitForRenderSettled(100);

        const canvas = await renderPageToCanvas(pageEl);
        if (canvas.width === 0 || canvas.height === 0) {
          throw new Error("Не удалось отрисовать страницу");
        }

        const imgData = canvas.toDataURL("image/png");
        if (p > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", margin, margin, pageWidth, pageHeight);
      }
    } finally {
      document.body.removeChild(renderHost);
    }

    report(onProgress, {
      phase: "saving",
      message: "Сохраняем файл…",
    });

    pdf.save(filename);
  } finally {
    document.body.removeChild(staging);
  }
}

/** @deprecated Use exportMarkdownToPdf */
export async function exportElementToPdf(
  element: HTMLElement,
  filename = "конспект.pdf",
): Promise<void> {
  if (!element.innerHTML.trim()) {
    throw new Error("Пустой контент");
  }

  const staging = document.createElement("div");
  staging.className = "pdf-export";
  staging.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    `width:${PDF_PAGE_WIDTH_PX}px`,
    "background:#ffffff",
    "visibility:visible",
  ].join(";");

  injectPdfStyles(staging);
  const printBody = document.createElement("div");
  printBody.className = "pdf-print-body";
  printBody.style.cssText =
    "font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.6;color:#1a1a2e";
  printBody.innerHTML = element.innerHTML;
  staging.appendChild(printBody);

  await exportRenderedPrintHtml(staging, filename);
}
