// Structure-preserving extraction of translatable blocks from a message body,
// and in-place application of translations with an original/translation toggle.
//
// Strategy (same idea as Firefox's page translation): pick *leaf* block-level
// elements — block elements that don't contain another block — and translate
// their innerHTML as a unit. Inline markup (<b>, <a>, …) rides along and is
// preserved by Bergamot's HTML translation mode; the surrounding layout is
// never touched.

const BLOCK_TAGS = [
  "p", "li", "td", "th", "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "dd", "dt", "caption", "figcaption", "pre", "div",
];
const BLOCK_SELECTOR = BLOCK_TAGS.join(",");

// Quoted reply history (<blockquote type="cite">) and signatures
// (<div class="moz-signature">) — skipped when the user opts out of translating them.
const QUOTE_SELECTOR = "blockquote, .moz-signature";

/**
 * @param {Element} root
 * @param {{skipQuotes?: boolean}} [opts] when skipQuotes is set, leave quoted
 *   history and signatures untranslated.
 * @returns {Element[]} leaf blocks containing non-whitespace text
 */
export function collectBlocks(root, { skipQuotes = false } = {}) {
  const candidates = root.querySelectorAll(BLOCK_SELECTOR);
  const blocks = [];
  for (const el of candidates) {
    if (el.querySelector(BLOCK_SELECTOR)) continue; // not a leaf block
    if (!el.textContent || !el.textContent.trim()) continue; // empty
    if (skipQuotes && el.closest(QUOTE_SELECTOR)) continue; // quote / signature
    blocks.push(el);
  }
  return blocks;
}

/**
 * Holds the original HTML of a set of blocks and lets the caller swap between
 * the original and the translated text.
 */
export class TranslationSession {
  /** @param {Element[]} blocks */
  constructor(blocks) {
    this.blocks = blocks;
    this.originals = blocks.map((b) => b.innerHTML);
    this.translations = null;
  }

  /** @param {string[]} translations one translated HTML string per block */
  apply(translations) {
    this.translations = translations;
    this.showTranslation();
  }

  showTranslation() {
    if (!this.translations) return;
    this.blocks.forEach((b, i) => {
      if (this.translations[i] != null) b.innerHTML = this.translations[i];
    });
  }

  showOriginal() {
    this.blocks.forEach((b, i) => {
      b.innerHTML = this.originals[i];
    });
  }
}
