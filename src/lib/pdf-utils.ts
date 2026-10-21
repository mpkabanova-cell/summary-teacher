import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export async function pdfToImages(
  file: File,
  options: {
    scale?: number;
    maxPages?: number;
    maxWidth?: number;
    quality?: number;
  } = {},
): Promise<string[]> {
  const {
    scale = 1.35,
    maxPages = Number.POSITIVE_INFINITY,
    maxWidth = 1200,
    quality = 0.72,
  } = options;
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const images: string[] = [];
  const pageCount = Math.min(pdf.numPages, maxPages);

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    images.push(canvasToJpeg(canvas, maxWidth, quality));
  }

  return images;
}

function canvasToJpeg(
  source: HTMLCanvasElement,
  maxWidth: number,
  quality: number,
): string {
  const ratio = Math.min(1, maxWidth / source.width);
  if (ratio === 1) return source.toDataURL("image/jpeg", quality);

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(source.width * ratio);
  canvas.height = Math.round(source.height * ratio);
  const ctx = canvas.getContext("2d");
  if (!ctx) return source.toDataURL("image/jpeg", quality);

  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}
