// Build the demo documentation PDF from demo/documentation.md.
//
// It reuses the same dependency-free PDF writer the app uses for the farmer's
// summary, so the documentation and the downloaded plan share one layout
// engine. Node 24 can load the TypeScript module directly.
//
//   node scripts/build-demo-pdf.mjs

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { buildPdfDocument } from "../src/lib/pdf.ts";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = `${root}/demo/documentation.md`;
const target = `${root}/demo/documentations.pdf`;

// A small Markdown subset is enough for the documentation: titles, headings,
// bullets, numbered steps and paragraphs.
function clean(text) {
  return text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function toBlocks(markdown) {
  const blocks = [];
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();

    if (!line) {
      if (blocks.length > 0 && blocks[blocks.length - 1].kind !== "space") {
        blocks.push({ kind: "space" });
      }
      continue;
    }

    if (line.startsWith("### ")) blocks.push({ kind: "heading", text: clean(line.slice(4)) });
    else if (line.startsWith("## ")) blocks.push({ kind: "heading", text: clean(line.slice(3)) });
    else if (line.startsWith("# ")) blocks.push({ kind: "title", text: clean(line.slice(2)) });
    else if (line.startsWith("- ")) blocks.push({ kind: "bullet", text: clean(line.slice(2)) });
    else if (/^\d+\.\s/.test(line)) {
      blocks.push({ kind: "bullet", text: clean(line.replace(/^\d+\.\s+/, "")) });
    } else blocks.push({ kind: "body", text: clean(line) });
  }

  while (blocks.length > 0 && blocks[blocks.length - 1].kind === "space") blocks.pop();
  return blocks;
}

const markdown = readFileSync(source, "utf8");
const blocks = toBlocks(markdown);

if (blocks.length === 0) {
  console.error(`No documentation found in ${source}`);
  process.exit(1);
}

mkdirSync(`${root}/demo`, { recursive: true });
writeFileSync(target, buildPdfDocument(blocks));
console.log(`Wrote ${target} (${blocks.length} blocks)`);
