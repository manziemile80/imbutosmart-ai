// A small, dependency-free PDF writer for the one document the app makes: the
// farmer's summary. It lays out A4 pages with the two standard Helvetica faces
// every PDF reader already has, so nothing has to be fetched or bundled and the
// file opens on a phone, a laptop and in an email attachment alike.
//
// Text is written in WinAnsi, which covers English, French and Kinyarwanda.
// Anything outside it becomes "?", so a stray symbol can never corrupt the file.

export type PdfBlock =
  | { kind: "title"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "body"; text: string }
  | { kind: "bullet"; text: string }
  | { kind: "detail"; text: string }
  | { kind: "note"; text: string }
  | { kind: "space" };

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;
const BOTTOM = 64;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const INDENT = 14;

type Font = 1 | 2; // 1 = Helvetica, 2 = Helvetica-Bold

type Style = {
  font: Font;
  size: number;
  leading: number;
  before: number;
  after: number;
  gray: number;
};

const STYLES: Record<Exclude<PdfBlock["kind"], "space">, Style> = {
  title: { font: 2, size: 18, leading: 24, before: 0, after: 10, gray: 0 },
  heading: { font: 2, size: 12, leading: 16, before: 16, after: 4, gray: 0 },
  body: { font: 1, size: 10.5, leading: 15, before: 0, after: 2, gray: 0 },
  bullet: { font: 1, size: 10.5, leading: 15, before: 0, after: 2, gray: 0 },
  detail: { font: 1, size: 9, leading: 13, before: 0, after: 2, gray: 0.4 },
  note: { font: 1, size: 9, leading: 13, before: 12, after: 0, gray: 0.45 },
};

type DrawnLine = {
  text: string;
  x: number;
  y: number;
  font: Font;
  size: number;
  gray: number;
};

// Helvetica advance widths for printable ASCII, in thousandths of an em.
// The bold face is separate because a bold line is wider and must wrap sooner.
const REGULAR_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556,
  556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667,
  611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667,
  667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500,
  222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

const BOLD_WIDTHS = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556,
  556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667,
  611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667,
  667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556,
  278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];

// Characters WinAnsi places outside Latin-1, mostly the punctuation the copy
// uses: em dash, middle dot, curly quotes and ellipsis.
const WIN_ANSI_SPECIALS: Record<string, number> = {
  "€": 0x80,
  "‚": 0x82,
  ƒ: 0x83,
  "„": 0x84,
  "…": 0x85,
  "†": 0x86,
  "‡": 0x87,
  ˆ: 0x88,
  "‰": 0x89,
  Š: 0x8a,
  "‹": 0x8b,
  Œ: 0x8c,
  Ž: 0x8e,
  "‘": 0x91,
  "’": 0x92,
  "“": 0x93,
  "”": 0x94,
  "•": 0x95,
  "–": 0x96,
  "—": 0x97,
  "˜": 0x98,
  "™": 0x99,
  š: 0x9a,
  "›": 0x9b,
  œ: 0x9c,
  ž: 0x9e,
  Ÿ: 0x9f,
};

function widthOf(text: string, font: Font, size: number): number {
  const widths = font === 2 ? BOLD_WIDTHS : REGULAR_WIDTHS;
  let total = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    const width = code >= 32 && code <= 126 ? (widths[code - 32] ?? 556) : 556;
    total += width;
  }
  return (total / 1000) * size;
}

// Break a paragraph into lines that fit the column. A word longer than the
// column is split by character, so a pasted address cannot run off the page.
function wrapText(text: string, font: Font, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";

  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (widthOf(candidate, font, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = "";
    if (widthOf(word, font, size) <= maxWidth) {
      line = word;
      continue;
    }
    for (const char of word) {
      if (line && widthOf(line + char, font, size) > maxWidth) {
        lines.push(line);
        line = "";
      }
      line += char;
    }
  }

  if (line) lines.push(line);
  return lines.length > 0 ? lines : [""];
}

function layoutPages(blocks: PdfBlock[]): DrawnLine[][] {
  const pages: DrawnLine[][] = [[]];
  let top = PAGE_HEIGHT - MARGIN;

  const page = () => pages[pages.length - 1] as DrawnLine[];
  const startPage = () => {
    pages.push([]);
    top = PAGE_HEIGHT - MARGIN;
  };

  for (const block of blocks) {
    if (block.kind === "space") {
      if (page().length > 0) top -= 8;
      continue;
    }

    const style = STYLES[block.kind];
    const indented = block.kind === "bullet" || block.kind === "detail";
    const width = indented ? CONTENT_WIDTH - INDENT : CONTENT_WIDTH;
    const lines = wrapText(block.text, style.font, style.size, width);
    const height = lines.length * style.leading;
    // A heading keeps at least one line of the text below it on its page, so a
    // section title is never left alone at the bottom of a page.
    const needed = style.before + height + (block.kind === "heading" ? STYLES.body.leading : 0);

    if (top - needed < BOTTOM && page().length > 0) startPage();
    if (page().length > 0) top -= style.before;

    lines.forEach((text, index) => {
      const isBullet = block.kind === "bullet";
      const first = index === 0;
      page().push({
        text: isBullet && first ? `• ${text}` : text,
        x: isBullet && first ? MARGIN : MARGIN + (indented ? INDENT : 0),
        y: top - style.size - index * style.leading,
        font: style.font,
        size: style.size,
        gray: style.gray,
      });
    });

    top -= height + style.after;
  }

  return pages;
}

function encodeText(text: string): string {
  let out = "";
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    const byte =
      (code >= 32 && code <= 126) || (code >= 160 && code <= 255)
        ? code
        : (WIN_ANSI_SPECIALS[char] ?? 0x3f); // "?" for anything WinAnsi cannot show

    if (char === "(" || char === ")" || char === "\\") out += `\\${char}`;
    else if (byte < 32 || byte > 126) out += `\\${byte.toString(8).padStart(3, "0")}`;
    else out += char;
  }
  return out;
}

function contentStream(lines: DrawnLine[]): string {
  let out = "";
  for (const line of lines) {
    out +=
      `${line.gray} g\nBT\n/F${line.font} ${line.size} Tf\n` +
      `1 0 0 1 ${line.x.toFixed(2)} ${line.y.toFixed(2)} Tm\n` +
      `(${encodeText(line.text)}) Tj\nET\n`;
  }
  return out;
}

export function buildPdfDocument(blocks: PdfBlock[]): Uint8Array<ArrayBuffer> {
  const pages = layoutPages(blocks);

  // Object 1 is the catalog, 2 the page tree, 3 and 4 the two fonts, then a
  // page object and its content stream for every laid-out page.
  const pageObjects: number[] = [];
  const contentObjects: number[] = [];
  let next = 5;
  for (let index = 0; index < pages.length; index += 1) {
    pageObjects.push(next);
    contentObjects.push(next + 1);
    next += 2;
  }

  const kids = pageObjects.map((object) => `${object} 0 R`).join(" ");
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  ];

  pages.forEach((lines, index) => {
    const content = contentStream(lines);
    objects[pageObjects[index]! - 1] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjects[index]} 0 R >>`;
    objects[contentObjects[index]! - 1] =
      `<< /Length ${content.length} >>\nstream\n${content}endstream`;
  });

  let pdf = `%PDF-1.4\n%${String.fromCharCode(0xe2, 0xe3, 0xcf, 0xd3)}\n`;
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  const bytes = new Uint8Array(pdf.length);
  for (let index = 0; index < pdf.length; index += 1) {
    bytes[index] = pdf.charCodeAt(index) & 0xff;
  }
  return bytes;
}
