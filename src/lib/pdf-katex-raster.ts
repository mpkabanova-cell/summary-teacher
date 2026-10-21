// @ts-nocheck -- ported as-is from the original project (written for a looser TS config)
import html2canvas from "html2canvas";

const FORMULA_CANVAS_SCALE = 4;
const FORMULA_CONCURRENCY = 4;

export interface RasterizeKatexOptions {
  onProgress?: (current: number, total: number) => void;
}

async function rasterizeOne(node: HTMLElement): Promise<HTMLImageElement> {
  const canvas = await html2canvas(node, {
    scale: FORMULA_CANVAS_SCALE,
    backgroundColor: null,
    logging: false,
    useCORS: true,
  });

  let displayW = canvas.width / FORMULA_CANVAS_SCALE;
  let displayH = canvas.height / FORMULA_CANVAS_SCALE;

  if (displayW < 1 || displayH < 1) {
    const rect = node.getBoundingClientRect();
    displayW = Math.max(1, rect.width);
    displayH = Math.max(1, rect.height);
  }

  const img = document.createElement("img");
  img.className = "pdf-formula-img";
  img.src = canvas.toDataURL("image/png");
  img.alt = "";
  img.style.width = `${Math.round(displayW)}px`;
  img.style.height = `${Math.round(displayH)}px`;
  img.style.display = "block";

  return img;
}

function createFormulaReplacement(
  img: HTMLImageElement,
  node: HTMLElement,
): HTMLElement {
  const displayHost = node.closest(".katex-display");
  if (displayHost instanceof HTMLElement) {
    const block = document.createElement("div");
    block.className = "pdf-formula-block";
    img.classList.add("pdf-formula-img-block");
    img.style.height = "auto";
    img.style.margin = "0 auto";
    block.appendChild(img);
    return block;
  }

  const inline = document.createElement("span");
  inline.className = "pdf-formula-inline";
  inline.appendChild(img);
  return inline;
}

async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;
  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (index < items.length) {
        const item = items[index];
        index += 1;
        await worker(item);
      }
    },
  );
  await Promise.all(runners);
}

/** Replaces KaTeX HTML with PNG snapshots so html2canvas page capture keeps correct fractions. */
export async function rasterizeKatexIn(
  root: HTMLElement,
  options?: RasterizeKatexOptions,
): Promise<void> {
  const nodes = Array.from(root.querySelectorAll(".katex")).filter(
    (el): el is HTMLElement => el instanceof HTMLElement,
  );
  const total = nodes.length;
  if (total === 0) return;

  const replacementByNode = new Map<HTMLElement, HTMLElement>();
  let completed = 0;

  await runPool(nodes, FORMULA_CONCURRENCY, async (node) => {
    const img = await rasterizeOne(node);
    replacementByNode.set(node, createFormulaReplacement(img, node));
    completed += 1;
    options?.onProgress?.(completed, total);
  });

  for (let i = nodes.length - 1; i >= 0; i -= 1) {
    const node = nodes[i];
    const replacement = replacementByNode.get(node);
    if (!replacement) continue;

    const displayHost = node.closest(".katex-display");
    if (displayHost instanceof HTMLElement) {
      displayHost.replaceWith(replacement);
    } else {
      node.replaceWith(replacement);
    }
  }
}
