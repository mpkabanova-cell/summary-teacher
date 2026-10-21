/** A4 @ 96dpi */
export const PDF_PAGE_WIDTH_PX = 794;
export const PDF_PAGE_HEIGHT_PX = 1123;
export const PDF_PADDING_X = 48;
export const PDF_PADDING_Y = 40;
export const PDF_CONTENT_HEIGHT =
  PDF_PAGE_HEIGHT_PX - PDF_PADDING_Y * 2;
export const PDF_FRAGMENT_GAP = 10;

function isHeading(el: HTMLElement): boolean {
  return /^H[1-6]$/.test(el.tagName);
}

function isExampleStart(el: HTMLElement): boolean {
  const text = (el.textContent ?? "").trim();
  return /^Пример\s*[:：]/i.test(text) || /^Example\s*:/i.test(text);
}

function hasMath(el: HTMLElement): boolean {
  return !!el.querySelector(
    ".katex, .katex-display, .pdf-formula-img, .pdf-formula-inline, .pdf-formula-block",
  );
}

function shouldKeepTogether(el: HTMLElement): boolean {
  if (isHeading(el)) return true;
  if (el.tagName === "PRE") return true;
  if (el.classList.contains("katex-display")) return true;
  if (el.querySelector(".katex-display")) return true;
  if (hasMath(el)) return true;
  if (el.tagName === "TABLE") {
    return true;
  }
  if (el.tagName === "BLOCKQUOTE") return true;
  return false;
}

function isSectionBreak(el: HTMLElement): boolean {
  if (isHeading(el)) return true;
  if (el.tagName === "HR") return true;
  if (isExampleStart(el)) return true;
  return false;
}

/**
 * Groups HTML into atomic fragments for PDF pagination.
 * Examples, formulas, schemes, headings — never split.
 * Plain paragraphs — separate fragments (breaks only between them).
 */
export function buildPdfFragments(sourceBody: HTMLElement): HTMLElement[] {
  const nodes = Array.from(sourceBody.children) as HTMLElement[];
  const fragments: HTMLElement[] = [];

  let i = 0;
  while (i < nodes.length) {
    const node = nodes[i];

    if (isExampleStart(node)) {
      const group = document.createElement("div");
      group.className = "pdf-fragment pdf-keep-together";
      group.appendChild(node.cloneNode(true));
      i++;
      while (i < nodes.length && !isSectionBreak(nodes[i])) {
        group.appendChild(nodes[i].cloneNode(true));
        i++;
      }
      fragments.push(group);
      continue;
    }

    if (shouldKeepTogether(node)) {
      const wrap = document.createElement("div");
      wrap.className = "pdf-fragment pdf-keep-together";
      wrap.appendChild(node.cloneNode(true));
      fragments.push(wrap);
      i++;
      continue;
    }

    const wrap = document.createElement("div");
    wrap.className = "pdf-fragment pdf-paragraph";
    wrap.appendChild(node.cloneNode(true));
    fragments.push(wrap);
    i++;
  }

  return fragments;
}

export function measureFragments(
  fragments: HTMLElement[],
  measureRoot: HTMLElement,
): number[] {
  measureRoot.innerHTML = "";
  const body = document.createElement("div");
  body.className = "pdf-print-body";
  body.style.cssText =
    "font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.6;color:#1a1a2e";
  measureRoot.appendChild(body);

  const contentWidth = PDF_PAGE_WIDTH_PX - PDF_PADDING_X * 2;
  const heights: number[] = [];

  for (const frag of fragments) {
    const slot = document.createElement("div");
    slot.style.width = `${contentWidth}px`;
    slot.appendChild(frag.cloneNode(true));
    body.appendChild(slot);
    heights.push(slot.offsetHeight);
    body.removeChild(slot);
  }

  return heights;
}

/** Pack fragments into pages without splitting any fragment. */
export function packFragmentsIntoPages(
  fragments: HTMLElement[],
  heights: number[],
  maxPageHeight: number = PDF_CONTENT_HEIGHT,
): HTMLElement[][] {
  const pages: HTMLElement[][] = [];
  let current: HTMLElement[] = [];
  let used = 0;

  const gap = PDF_FRAGMENT_GAP;

  for (let i = 0; i < fragments.length; i++) {
    const frag = fragments[i];
    const h = heights[i] ?? 0;
    const need = h + (current.length > 0 ? gap : 0);

    if (h > maxPageHeight) {
      frag.classList.add("pdf-fragment-oversized");
    }

    if (current.length > 0 && used + need > maxPageHeight) {
      pages.push(current);
      current = [];
      used = 0;
    }

    current.push(frag);
    used += h + (current.length > 1 ? gap : 0);
  }

  if (current.length > 0) pages.push(current);
  return pages;
}

export function buildPageElement(pageFragments: HTMLElement[]): HTMLElement {
  const page = document.createElement("div");
  page.className = "pdf-page";
  page.style.cssText = [
    `width:${PDF_PAGE_WIDTH_PX}px`,
    `min-height:${PDF_PAGE_HEIGHT_PX}px`,
    `padding:${PDF_PADDING_Y}px ${PDF_PADDING_X}px`,
    "box-sizing:border-box",
    "background:#ffffff",
  ].join(";");

  for (const frag of pageFragments) {
    const slot = document.createElement("div");
    slot.className = "pdf-page-slot";
    slot.style.marginBottom = `${PDF_FRAGMENT_GAP}px`;
    slot.appendChild(frag.cloneNode(true));
    page.appendChild(slot);
  }

  return page;
}
