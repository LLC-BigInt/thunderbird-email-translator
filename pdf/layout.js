// Pure geometry helpers for overlaying translated text on a rendered PDF page.

/**
 * Multiply two 2D affine transforms [a,b,c,d,e,f] (same convention as pdf.js
 * Util.transform): result = m1 ∘ m2.
 */
export function multiplyTransform(m1, m2) {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

/**
 * Group positioned text items into lines. Items join a line when they share
 * ~the same baseline AND sit close horizontally; a large horizontal gap starts
 * a new segment, so side-by-side columns stay separate (not merged into one
 * very wide line). Each item carries {str,left,top,right,fontHeight,baseline}.
 * Returns lines with an added {width} (the box to cover/fit the translation in).
 */
export function groupLines(placed, gapFactor = 2.5) {
  const sorted = [...placed].sort(
    (a, b) => a.baseline - b.baseline || a.left - b.left,
  );

  const lines = [];
  for (const it of sorted) {
    const right = it.right ?? it.left + (it.width ?? 0);
    const last = lines[lines.length - 1];
    const sameLine =
      last &&
      Math.abs(it.baseline - last.baseline) <= last.fontHeight * 0.6 &&
      it.left - last.right <= last.fontHeight * gapFactor;

    if (sameLine) {
      last.text += " " + it.str;
      last.left = Math.min(last.left, it.left);
      last.top = Math.min(last.top, it.top);
      last.right = Math.max(last.right, right);
      last.fontHeight = Math.max(last.fontHeight, it.fontHeight);
    } else {
      lines.push({
        left: it.left,
        top: it.top,
        right,
        fontHeight: it.fontHeight,
        baseline: it.baseline,
        text: it.str,
      });
    }
  }

  return lines.map((l) => ({ ...l, width: Math.max(l.right - l.left, l.fontHeight) }));
}
