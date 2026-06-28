// Thin wrapper around the Bergamot BatchTranslator, using the IndexedDB-backed
// CachedBacking. Lives in the background page; the WASM worker is spawned lazily
// on first translation. The library handles English-pivoting internally.
import { BatchTranslator } from "./vendor/translator.js";
import { CachedBacking } from "./cached-backing.js";
import {
  normalizeShout,
  restoreShout,
  normalizeShoutHtml,
  restoreShoutHtml,
} from "../lang/caps.js";

let translator = null;
let backing = null;

function ensure() {
  if (!translator) {
    backing = new CachedBacking({});
    translator = new BatchTranslator({}, backing);
  }
  return translator;
}

/**
 * Translate an array of HTML block strings, preserving inline markup.
 * @param {string[]} htmls
 * @param {string} from 2-letter source code
 * @param {string} to   2-letter target code
 * @returns {Promise<string[]>}
 */
export async function translateBlocks(htmls, from, to) {
  if (from === to) return htmls.slice();
  const t = ensure();
  const responses = await Promise.all(
    htmls.map(async (html) => {
      // De-shout ALL-CAPS words per text node so the model doesn't drop them,
      // then re-apply shouting to the matching nodes of the translation.
      const { html: norm, flags } = normalizeShoutHtml(html, document);
      const r = await t.translate({ from, to, text: norm, html: true });
      return restoreShoutHtml(r.target.text, flags, document);
    }),
  );
  return responses;
}

/**
 * Translate a single plain-text string (no HTML) — used for the compose
 * selection feature.
 * @returns {Promise<string>}
 */
export async function translateText(text, from, to) {
  if (from === to) return text;
  const t = ensure();
  const { text: norm, fullyShout } = normalizeShout(text);
  const res = await t.translate({ from, to, text: norm, html: false });
  return restoreShout(res.target.text, fullyShout);
}

/**
 * Translate many plain-text strings (e.g. one per PDF line). Empty strings pass
 * through untouched.
 * @returns {Promise<string[]>}
 */
export async function translateTexts(texts, from, to) {
  if (from === to) return texts.slice();
  const t = ensure();
  // allSettled so one bad line can't blank the whole page — failed lines keep
  // their original text.
  const shout = texts.map((text) => normalizeShout(text || ""));
  const results = await Promise.allSettled(
    texts.map((text, i) =>
      text && text.trim()
        ? t.translate({ from, to, text: shout[i].text, html: false })
        : Promise.resolve({ target: { text } }),
    ),
  );
  return results.map((r, i) =>
    r.status === "fulfilled"
      ? restoreShout(r.value.target.text, shout[i].fullyShout)
      : texts[i],
  );
}

/** @returns {Promise<{from:string,to:string}[]>} parsed registry pairs */
export async function registryPairs() {
  ensure();
  const reg = await backing.registry;
  return reg.map(({ from, to }) => ({ from, to }));
}
