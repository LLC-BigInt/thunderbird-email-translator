// Work around a Bergamot NMT weakness: the model frequently DROPS or fails to
// translate ALL-CAPS words ("ONLY", "SALE", "LIMITED TIME OFFER") — common in
// promotional email. Lowercasing those words before translation makes the model
// keep them; we then re-uppercase the result so the visual "shouting" survives.
//
// Strategy:
//  - normalizeShout()  : lowercase every ALL-CAPS word in a plain-text segment,
//                        and report whether the WHOLE segment was shouting.
//  - restoreShout()    : if it was, re-uppercase the translation (we can't map
//                        single words after NMT, so we only re-shout whole-caps
//                        segments — for mixed text the word is simply preserved).
//  - normalizeShoutHtml/restoreShoutHtml: the same, but per text node, so a
//                        styled emphasis word (<b>ONLY</b> -> its own text node)
//                        becomes a fully-shouting segment and IS re-uppercased.

/** A run of letters that is all-uppercase and has at least two letters. */
function isAllCaps(word) {
  const letters = word.match(/\p{L}/gu);
  if (!letters || letters.length < 2) return false;
  return word === word.toUpperCase() && word !== word.toLowerCase();
}

/**
 * Lowercase ALL-CAPS words in a plain-text string.
 * @param {string} text
 * @returns {{text: string, fullyShout: boolean}} fullyShout = there was at least
 *   one shouting word and no multi-letter word carried lowercase (i.e. the whole
 *   segment was shouting and can be safely re-uppercased after translation).
 */
export function normalizeShout(text) {
  let hadShout = false;
  let hadGentleWord = false;
  const out = text.replace(/\p{L}+/gu, (word) => {
    if (isAllCaps(word)) {
      hadShout = true;
      return word.toLowerCase();
    }
    // A word with >= 2 letters that is not all-caps means the segment is not
    // purely shouting (single capitals like "I"/"A" don't count).
    if ((word.match(/\p{L}/gu) || []).length >= 2 && word !== word.toUpperCase()) {
      hadGentleWord = true;
    }
    return word;
  });
  return { text: out, fullyShout: hadShout && !hadGentleWord };
}

/**
 * Re-apply shouting to a translated segment when the source was fully uppercase.
 * @param {string} translated
 * @param {boolean} fullyShout
 */
export function restoreShout(translated, fullyShout) {
  return fullyShout ? translated.toUpperCase() : translated;
}

/** Collect the text nodes of a parsed fragment, in document order. */
function textNodesOf(root) {
  const nodes = [];
  const walk = (node) => {
    for (const child of node.childNodes) {
      if (child.nodeType === 3) nodes.push(child); // TEXT_NODE
      else walk(child);
    }
  };
  walk(root);
  return nodes;
}

/**
 * De-shout each text node of an HTML block. Tags/attributes are left untouched.
 * @param {string} html
 * @param {Document} doc  a Document to parse with (background page / jsdom)
 * @returns {{html: string, flags: boolean[]}} one fullyShout flag per text node.
 */
export function normalizeShoutHtml(html, doc) {
  const tpl = doc.createElement("template");
  tpl.innerHTML = html;
  const flags = [];
  for (const node of textNodesOf(tpl.content)) {
    const { text, fullyShout } = normalizeShout(node.data);
    node.data = text;
    flags.push(fullyShout);
  }
  return { html: tpl.innerHTML, flags };
}

/**
 * Re-shout the text nodes that were fully uppercase in the source. Done by node
 * index, which holds when Bergamot preserves the tag structure; if the node
 * count changed we skip restoration (the de-shouted text is still correct).
 * @param {string} html
 * @param {boolean[]} flags
 * @param {Document} doc
 */
export function restoreShoutHtml(html, flags, doc) {
  const tpl = doc.createElement("template");
  tpl.innerHTML = html;
  const nodes = textNodesOf(tpl.content);
  if (nodes.length !== flags.length) return html;
  nodes.forEach((node, i) => {
    if (flags[i]) node.data = node.data.toUpperCase();
  });
  return tpl.innerHTML;
}
