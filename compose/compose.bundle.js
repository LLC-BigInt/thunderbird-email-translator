(() => {
  // content/dom.js
  var BLOCK_TAGS = [
    "p",
    "li",
    "td",
    "th",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "blockquote",
    "dd",
    "dt",
    "caption",
    "figcaption",
    "pre",
    "div"
  ];
  var BLOCK_SELECTOR = BLOCK_TAGS.join(",");
  var QUOTE_SELECTOR = "blockquote, .moz-signature";
  function collectBlocks(root, { skipQuotes = false } = {}) {
    const candidates = root.querySelectorAll(BLOCK_SELECTOR);
    const blocks = [];
    for (const el of candidates) {
      if (el.querySelector(BLOCK_SELECTOR)) continue;
      if (!el.textContent || !el.textContent.trim()) continue;
      if (skipQuotes && el.closest(QUOTE_SELECTOR)) continue;
      blocks.push(el);
    }
    return blocks;
  }
  var TranslationSession = class {
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
  };

  // compose/compose-entry.js
  if (!window.__mtComposeInjected) {
    let restoreOriginal = function() {
      if (!composeSession) {
        notify("Nothing to restore \u2014 translate the message first.");
        return;
      }
      composeSession.showOriginal();
      composeSession = null;
    }, notify = function(message) {
      browser.runtime.sendMessage({ cmd: "mt-notify", message });
    };
    window.__mtComposeInjected = true;
    let composeSession = null;
    browser.runtime.onMessage.addListener(async (msg) => {
      if (msg?.cmd === "mt-compose") return translateSelection(msg.to);
      if (msg?.cmd === "mt-compose-all") return translateWholeMessage(msg.to);
      if (msg?.cmd === "mt-compose-restore") return restoreOriginal();
    });
    async function translateSelection(to) {
      const selection = window.getSelection();
      const text = selection ? selection.toString().trim() : "";
      if (!text) {
        notify("Select some text first.");
        return;
      }
      const resp = await browser.runtime.sendMessage({
        cmd: "mt-translate-text",
        text,
        from: "auto",
        to
      });
      if (!resp || !resp.ok) {
        notify("Translation failed: " + (resp?.error || "unknown error"));
        return;
      }
      document.execCommand("insertText", false, resp.text);
    }
    async function translateWholeMessage(to) {
      const { skipQuotes = true } = await browser.storage.local.get("skipQuotes");
      const blocks = collectBlocks(document.body, { skipQuotes });
      if (!blocks.length) {
        notify("Nothing to translate in this message.");
        return;
      }
      const session = new TranslationSession(blocks);
      const resp = await browser.runtime.sendMessage({
        cmd: "mt-translate",
        htmls: session.originals,
        text: blocks.map((b) => b.textContent).join("\n"),
        from: "auto",
        to
      });
      if (!resp || !resp.ok) {
        notify("Translation failed: " + (resp?.error || "unknown error"));
        return;
      }
      session.apply(resp.translations);
      composeSession = session;
    }
  }
})();
