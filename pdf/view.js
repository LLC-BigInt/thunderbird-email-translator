// PDF translation viewer. Renders each page as an image and overlays the
// translated text on top, at the position of the original lines — so the result
// reads like a translated copy of the document. Toggle "Show original" hides the
// overlay. Layout is approximate (translated text length differs from the
// original), not pixel-perfect.
import * as pdfjsLib from "./vendor/pdf.min.mjs";
import { LANGUAGES } from "../lang/languages.js";
import { multiplyTransform, groupLines } from "./layout.js";
import { DONATE_URL } from "../donate.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = browser.runtime.getURL(
  "pdf/vendor/pdf.worker.min.mjs",
);

const params = new URLSearchParams(location.search);
const msgId = Number(params.get("msg"));
const partName = params.get("part");
const fileName = params.get("name") || "document.pdf";

const titleEl = document.getElementById("mt-title");
const toSel = document.getElementById("mt-to");
const runBtn = document.getElementById("mt-run");
const toggleBtn = document.getElementById("mt-toggle");
const statusEl = document.getElementById("mt-status");
const pagesEl = document.getElementById("mt-pages");

const RENDER_WIDTH = 900;

titleEl.textContent = fileName;
document.title = `Translate — ${fileName}`;

for (const { iso1, name } of [...LANGUAGES].sort((a, b) => a.name.localeCompare(b.name))) {
  toSel.add(new Option(name, iso1));
}
const { targetLang = "en" } = await browser.storage.local.get("targetLang");
toSel.value = [...toSel.options].some((o) => o.value === targetLang) ? targetLang : "en";

const setStatus = (t) => (statusEl.textContent = t);

// Cached once: rendered image + positioned source lines, per page.
let prepared = null; // [{ img, width, height, lines: [{left,top,fontHeight,text}] }]

async function prepare() {
  setStatus("Reading PDF…");
  const file = await browser.messages.getAttachmentFile(msgId, partName);
  const data = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data, isEvalSupported: false }).promise;

  const out = [];
  for (let n = 1; n <= doc.numPages; n++) {
    setStatus(`Rendering page ${n} of ${doc.numPages}…`);
    const page = await doc.getPage(n);
    const scale = RENDER_WIDTH / page.getViewport({ scale: 1 }).width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;

    const content = await page.getTextContent();
    const placed = [];
    for (const it of content.items) {
      if (!it.str || !it.str.trim()) continue;
      const m = multiplyTransform(viewport.transform, it.transform);
      const fontHeight = Math.hypot(m[2], m[3]) || Math.abs(m[3]) || 10;
      const width = (it.width || 0) * scale;
      placed.push({
        str: it.str,
        left: m[4],
        right: m[4] + width,
        top: m[5] - fontHeight,
        baseline: m[5],
        fontHeight,
      });
    }
    const lines = groupLines(placed).filter((l) => /[\p{L}\p{N}]/u.test(l.text));

    out.push({ img: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height, lines });
  }
  return out;
}

async function translateAll() {
  runBtn.disabled = true;
  pagesEl.replaceChildren();
  pagesEl.classList.remove("mt-show-original");
  toggleBtn.textContent = "Show original";
  try {
    if (!prepared) prepared = await prepare();
    const to = toSel.value;

    for (let i = 0; i < prepared.length; i++) {
      setStatus(`Translating page ${i + 1} of ${prepared.length}…`);
      const page = prepared[i];
      let translations = page.lines.map((l) => l.text);
      if (page.lines.length) {
        const resp = await browser.runtime.sendMessage({
          cmd: "mt-translate-lines",
          lines: page.lines.map((l) => l.text),
          from: "auto",
          to,
        });
        if (resp?.ok) {
          translations = resp.translations;
        } else {
          // Don't silently show the original — say why.
          throw new Error(resp?.error || "no response from the translation engine");
        }
      }
      renderPage(i + 1, page, translations);
    }
    setStatus("Done.");
  } catch (e) {
    setStatus("Error: " + (e.message || e));
  } finally {
    runBtn.disabled = false;
  }
}

function renderPage(num, page, translations) {
  const label = document.createElement("div");
  label.className = "mt-page-num";
  label.textContent = `Page ${num}`;

  const canvasBox = document.createElement("div");
  canvasBox.className = "mt-canvas";
  canvasBox.style.width = page.width + "px";
  canvasBox.style.height = page.height + "px";

  const image = document.createElement("img");
  image.className = "mt-img";
  image.src = page.img;
  canvasBox.appendChild(image);

  const overlay = document.createElement("div");
  overlay.className = "mt-overlay";
  page.lines.forEach((line, idx) => {
    const h = line.fontHeight * 1.3;
    const d = document.createElement("div");
    d.className = "mt-line";
    d.style.left = line.left + "px";
    d.style.top = line.top - line.fontHeight * 0.15 + "px";
    d.style.width = line.width + "px";
    d.style.height = h + "px";
    d.style.lineHeight = h + "px";
    d.style.fontSize = line.fontHeight * 0.9 + "px";
    d.textContent = translations[idx] ?? line.text;
    overlay.appendChild(d);
    fitText(d); // squeeze the translation into the original line's width
  });
  canvasBox.appendChild(overlay);

  pagesEl.append(label, canvasBox);
}

// Horizontally compress a line so the (usually longer) translation fits the
// original slot instead of overflowing into neighbouring text.
function fitText(d) {
  const cw = d.clientWidth;
  const sw = d.scrollWidth;
  if (cw > 0 && sw > cw) {
    d.style.transformOrigin = "left center";
    d.style.transform = `scaleX(${Math.max(cw / sw, 0.5)})`;
  }
}

runBtn.addEventListener("click", () => {
  browser.storage.local.set({ targetLang: toSel.value });
  translateAll();
});

document.getElementById("mt-donate").addEventListener("click", () => {
  browser.tabs.create({ url: DONATE_URL });
});

toggleBtn.addEventListener("click", () => {
  const showingOriginal = pagesEl.classList.toggle("mt-show-original");
  toggleBtn.textContent = showingOriginal ? "Show translation" : "Show original";
});

translateAll();
