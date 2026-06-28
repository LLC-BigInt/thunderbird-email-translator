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

  // lang/auto.js
  function shouldOffer(detected, known, target) {
    if (!detected) return false;
    if (detected === target) return false;
    const understood = known && known.length ? known : [target];
    return !understood.includes(detected);
  }

  // content/content-entry.js
  if (!window.__mtInjected) {
    let showBar = function(text, { error = false, toggle = false, offer = null } = {}) {
      let bar = document.getElementById("mt-bar");
      if (!bar) {
        savedPaddingTop = document.body.style.paddingTop;
        bar = document.createElement("div");
        bar.id = "mt-bar";
        bar.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:2147483647;display:flex;gap:10px;align-items:center;justify-content:space-between;padding:6px 10px;font:13px/1.3 sans-serif;box-sizing:border-box;background:#1b6b3a;color:#fff;box-shadow:0 1px 4px rgba(0,0,0,.3)";
        document.body.appendChild(bar);
      }
      bar.style.background = error ? "#9b2226" : "#1b6b3a";
      const label = document.createElement("span");
      label.textContent = text;
      const actions = document.createElement("span");
      actions.style.cssText = "display:flex;gap:8px;flex:0 0 auto";
      if (offer) {
        const tr = button("Translate");
        tr.style.cssText += ";background:#fff;color:#1b6b3a;border-color:#fff;font-weight:700";
        tr.onclick = () => run(offer.lang, offer.to);
        actions.appendChild(tr);
      }
      if (toggle && session) {
        let showingOriginal = false;
        const tBtn = button(showingOriginal ? "Show translation" : "Show original");
        tBtn.onclick = () => {
          showingOriginal = !showingOriginal;
          if (showingOriginal) session.showOriginal();
          else session.showTranslation();
          tBtn.textContent = showingOriginal ? "Show translation" : "Show original";
        };
        actions.appendChild(tBtn);
      }
      if (!error) {
        const donate = button("\u2665 Donate");
        donate.style.cssText += ";background:#fff;color:#1b6b3a;border-color:#fff;font-weight:700";
        donate.title = "Support Mail Translator";
        donate.onclick = () => browser.runtime.sendMessage({ cmd: "mt-donate" });
        actions.appendChild(donate);
      }
      const close = button("\u2715");
      close.onclick = () => {
        if (session) session.showOriginal();
        document.body.style.paddingTop = savedPaddingTop ?? "";
        bar.remove();
      };
      actions.appendChild(close);
      bar.replaceChildren(label, actions);
      document.body.style.paddingTop = bar.offsetHeight + "px";
    }, button = function(text) {
      const b = document.createElement("button");
      b.textContent = text;
      b.style.cssText = "cursor:pointer;border:1px solid rgba(255,255,255,.6);background:transparent;color:#fff;border-radius:4px;padding:2px 8px;font:inherit";
      return b;
    };
    window.__mtInjected = true;
    let session = null;
    browser.runtime.onMessage.addListener((msg) => {
      if (msg?.cmd === "mt-start") {
        run(msg.from, msg.to);
      } else if (msg?.cmd === "mt-auto") {
        autoRun(msg.mode, msg.to, msg.known);
      }
    });
    async function autoRun(mode, to, known) {
      if (document.getElementById("mt-bar")) return;
      const text = (document.body.innerText || "").trim().slice(0, 2e3);
      if (text.length < 20) return;
      let det;
      try {
        det = await browser.runtime.sendMessage({ cmd: "mt-detect", text });
      } catch {
        return;
      }
      if (!shouldOffer(det?.lang, known, to)) return;
      if (mode === "auto") run(det.lang, to);
      else showBar(`This message is in ${det.name || det.lang}.`, {
        offer: { lang: det.lang, to }
      });
    }
    async function run(from, to) {
      const { skipQuotes = true } = await browser.storage.local.get("skipQuotes");
      const blocks = collectBlocks(document.body, { skipQuotes });
      if (!blocks.length) {
        showBar("No translatable text found.", { error: true });
        return;
      }
      session = new TranslationSession(blocks);
      showBar("Translating\u2026");
      let resp;
      try {
        resp = await browser.runtime.sendMessage({
          cmd: "mt-translate",
          htmls: session.originals,
          text: blocks.map((b) => b.textContent).join("\n"),
          from,
          to
        });
      } catch (e) {
        showBar("Translation failed: " + e.message, { error: true });
        return;
      }
      if (!resp || !resp.ok) {
        showBar("Translation failed: " + (resp?.error || "unknown error"), { error: true });
        return;
      }
      session.apply(resp.translations);
      showBar(`Translated ${resp.src} \u2192 ${to}`, { toggle: true });
    }
    let savedPaddingTop = null;
  }
})();
