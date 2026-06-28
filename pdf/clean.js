// Tidy up text extracted from a PDF before translating/displaying it: drop
// lines that carry no real content (stray bullets, rule glyphs, decorative
// symbols that pdf.js emits as their own lines) and collapse blank runs.
export function cleanPdfText(raw) {
  const lines = (raw || "").split("\n").map((l) => l.trim());

  // Keep blank lines (as separators) and lines with at least one letter/digit;
  // drop lines made only of symbols/punctuation.
  const kept = lines.filter((l) => l === "" || /[\p{L}\p{N}]/u.test(l));

  // Collapse consecutive blank lines into one.
  const collapsed = [];
  for (const l of kept) {
    if (l === "" && collapsed[collapsed.length - 1] === "") continue;
    collapsed.push(l);
  }

  return collapsed.join("\n").trim();
}
