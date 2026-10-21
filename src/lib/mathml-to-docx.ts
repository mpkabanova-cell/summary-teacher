// Converts LaTeX to native Word formulas (OMML) by rendering KaTeX MathML
// output and walking it into docx Math components.
import katex from "katex";
import {
  Math as DocxMath,
  MathFraction,
  MathRadical,
  MathRoundBrackets,
  MathRun,
  MathSubScript,
  MathSubSuperScript,
  MathSuperScript,
  type MathComponent,
} from "docx";

const ACCENT_COMBINING: Record<string, string> = {
  "^": "̂",
  "~": "̃",
  "→": "⃗",
  "¯": "̅",
  "‾": "̅",
  "˙": "̇",
  "˘": "̆",
};

function elementChildren(el: Element): Element[] {
  return Array.from(el.children).filter((c) => c.localName !== "annotation");
}

function ensure(components: MathComponent[]): MathComponent[] {
  return components.length > 0 ? components : [new MathRun("")];
}

function walkChildren(el: Element): MathComponent[] {
  return elementChildren(el).flatMap((child) => walkElement(child));
}

function walkElement(el: Element): MathComponent[] {
  const kids = elementChildren(el);
  switch (el.localName) {
    case "math":
    case "semantics":
    case "mrow":
    case "mstyle":
    case "mpadded":
    case "menclose":
      return walkChildren(el);
    case "mi":
    case "mn":
    case "mo":
    case "mtext":
      return [new MathRun(el.textContent ?? "")];
    case "mspace":
      return [new MathRun(" ")];
    case "mfrac":
      return [
        new MathFraction({
          numerator: ensure(kids[0] ? walkElement(kids[0]) : []),
          denominator: ensure(kids[1] ? walkElement(kids[1]) : []),
        }),
      ];
    case "msqrt":
      return [
        new MathRadical({
          children: ensure(kids[0] ? walkElement(kids[0]) : []),
        }),
      ];
    case "mroot":
      return [
        new MathRadical({
          children: ensure(kids[0] ? walkElement(kids[0]) : []),
          ...(kids[1] ? { degree: walkElement(kids[1]) } : {}),
        }),
      ];
    case "msup":
      return [
        new MathSuperScript({
          children: ensure(kids[0] ? walkElement(kids[0]) : []),
          superScript: ensure(kids[1] ? walkElement(kids[1]) : []),
        }),
      ];
    case "msub":
      return [
        new MathSubScript({
          children: ensure(kids[0] ? walkElement(kids[0]) : []),
          subScript: ensure(kids[1] ? walkElement(kids[1]) : []),
        }),
      ];
    case "msubsup":
      return [
        new MathSubSuperScript({
          children: ensure(kids[0] ? walkElement(kids[0]) : []),
          subScript: ensure(kids[1] ? walkElement(kids[1]) : []),
          superScript: ensure(kids[2] ? walkElement(kids[2]) : []),
        }),
      ];
    case "mover": {
      // \vec, \hat, \bar: no accent component in docx — append the
      // combining character to a plain base, otherwise keep just the base.
      const base = kids[0];
      const combining = ACCENT_COMBINING[kids[1]?.textContent?.trim() ?? ""];
      if (base && combining && base.children.length === 0) {
        return [new MathRun((base.textContent ?? "") + combining)];
      }
      return base ? walkElement(base) : [];
    }
    case "munder":
      return [
        new MathSubScript({
          children: ensure(kids[0] ? walkElement(kids[0]) : []),
          subScript: ensure(kids[1] ? walkElement(kids[1]) : []),
        }),
      ];
    case "munderover":
      return [
        new MathSubSuperScript({
          children: ensure(kids[0] ? walkElement(kids[0]) : []),
          subScript: ensure(kids[1] ? walkElement(kids[1]) : []),
          superScript: ensure(kids[2] ? walkElement(kids[2]) : []),
        }),
      ];
    case "mfenced":
      return [new MathRoundBrackets({ children: walkChildren(el) })];
    case "mtable": {
      // Matrices/cases: docx has no matrix component — join cells with
      // spaces and rows with semicolons so the content stays readable.
      const out: MathComponent[] = [];
      kids.forEach((row, rowIndex) => {
        if (rowIndex > 0) out.push(new MathRun("; "));
        elementChildren(row).forEach((cell, cellIndex) => {
          if (cellIndex > 0) out.push(new MathRun("  "));
          out.push(...walkElement(cell));
        });
      });
      return out;
    }
    default:
      return walkChildren(el);
  }
}

/** Returns a native Word formula, or null when the LaTeX cannot be parsed. */
export function latexToDocxMath(latex: string): DocxMath | null {
  try {
    const mathml = katex.renderToString(latex, {
      output: "mathml",
      throwOnError: false,
      strict: "ignore",
    });
    const parsed = new DOMParser().parseFromString(mathml, "application/xml");
    if (parsed.querySelector("parsererror")) return null;
    const root = parsed.documentElement;
    if (!root || root.localName !== "math") return null;
    const children = walkElement(root);
    if (children.length === 0) return null;
    return new DocxMath({ children });
  } catch {
    return null;
  }
}
