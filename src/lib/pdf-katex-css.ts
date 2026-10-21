/** Layout styles for PDF export (formulas are rasterized to .pdf-formula-img). */
export const PDF_KATEX_CSS = `
.pdf-export .pdf-formula-inline {
  display: inline-block;
  line-height: 0;
  vertical-align: middle;
}

.pdf-export .pdf-formula-block {
  display: block;
  line-height: 0;
  text-align: center;
  margin: 0.75rem 0;
  max-width: 100%;
  overflow: visible;
}

.pdf-export .pdf-formula-img {
  display: block;
  max-width: 100%;
  vertical-align: bottom;
}

.pdf-export .pdf-formula-img-block {
  height: auto !important;
  margin: 0 auto;
}

.pdf-export .pdf-print-body li,
.pdf-export .pdf-print-body p {
  line-height: normal !important;
  overflow: visible !important;
  margin-bottom: 8px !important;
}

.pdf-export .pdf-print-body li {
  padding-left: 2px !important;
}

.pdf-export .pdf-page-slot:last-child {
  margin-bottom: 0 !important;
}

.pdf-export .pdf-fragment {
  break-inside: avoid;
}

.pdf-export .pdf-fragment-oversized {
  break-inside: auto;
}

.pdf-export table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 12px;
}

.pdf-export th,
.pdf-export td {
  border: 1px solid #ddd6fe;
  padding: 6px;
  overflow-wrap: anywhere;
  vertical-align: top;
}
`;
