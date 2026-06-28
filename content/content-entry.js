// Content script injected into the displayed message. Extracts translatable
// blocks, asks the background engine to translate them, applies the result in
// place, and shows a small bar with an original/translation toggle.
//
// Bundled (esbuild → content.bundle.js) because injected scripts are classic,
// not ES modules.
import { collectBlocks, TranslationSession } from "./dom.js";
import { shouldOffer } from "../lang/auto.js";

// executeScript may run this file more than once; only wire up listeners once.
if (!window.__mtInjected) {
  window.__mtInjected = true;

  let session = null;

  browser.runtime.onMessage.addListener((msg) => {
    if (msg?.cmd === "mt-start") {
      run(msg.from, msg.to);
    } else if (msg?.cmd === "mt-auto") {
      autoRun(msg.mode, msg.to, msg.known);
    }
  });

  // Auto / offer-to-translate: detect the message language and either translate
  // it (mode "auto") or show an offer bar (mode "ask").
  async function autoRun(mode, to, known) {
    if (document.getElementById("mt-bar")) return; // already acting on this message
    const text = (document.body.innerText || "").trim().slice(0, 2000);
    if (text.length < 20) return; // too little to detect reliably

    let det;
    try {
      det = await browser.runtime.sendMessage({ cmd: "mt-detect", text });
    } catch {
      return;
    }
    if (!shouldOffer(det?.lang, known, to)) return;

    if (mode === "auto") run(det.lang, to);
    else showBar(`This message is in ${det.name || det.lang}.`, {
      offer: { lang: det.lang, to },
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
    showBar("Translating…");

    let resp;
    try {
      resp = await browser.runtime.sendMessage({
        cmd: "mt-translate",
        htmls: session.originals,
        text: blocks.map((b) => b.textContent).join("\n"),
        from,
        to,
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
    showBar(`Translated ${resp.src} → ${to}`, { toggle: true });
  }

  // --- Minimal in-message status/toggle bar -------------------------------
  let savedPaddingTop = null;

  function showBar(text, { error = false, toggle = false, offer = null } = {}) {
    let bar = document.getElementById("mt-bar");
    if (!bar) {
      // Remember the body's original top padding so we can restore it on close.
      savedPaddingTop = document.body.style.paddingTop;
      bar = document.createElement("div");
      bar.id = "mt-bar";
      bar.style.cssText =
        "position:fixed;top:0;left:0;right:0;z-index:2147483647;" +
        "display:flex;gap:10px;align-items:center;justify-content:space-between;" +
        "padding:6px 10px;font:13px/1.3 sans-serif;box-sizing:border-box;" +
        "background:#1b6b3a;color:#fff;box-shadow:0 1px 4px rgba(0,0,0,.3)";
      document.body.appendChild(bar);
    }
    bar.style.background = error ? "#9b2226" : "#1b6b3a";

    const label = document.createElement("span");
    label.textContent = text;

    const actions = document.createElement("span");
    actions.style.cssText = "display:flex;gap:8px;flex:0 0 auto";

    if (offer) {
      const tr = button("Translate");
      tr.style.cssText +=
        ";background:#fff;color:#1b6b3a;border-color:#fff;font-weight:700";
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
      const donate = button("♥ Donate");
      donate.style.cssText +=
        ";background:#fff;color:#1b6b3a;border-color:#fff;font-weight:700";
      donate.title = "Support Mail Translator";
      donate.onclick = () => browser.runtime.sendMessage({ cmd: "mt-donate" });
      actions.appendChild(donate);
    }

    const close = button("✕");
    close.onclick = () => {
      if (session) session.showOriginal();
      document.body.style.paddingTop = savedPaddingTop ?? "";
      bar.remove();
    };
    actions.appendChild(close);

    bar.replaceChildren(label, actions);

    // Push the message content down so the fixed bar never covers the first
    // lines. Measured after layout; re-applied on every status update.
    document.body.style.paddingTop = bar.offsetHeight + "px";
  }

  function button(text) {
    const b = document.createElement("button");
    b.textContent = text;
    b.style.cssText =
      "cursor:pointer;border:1px solid rgba(255,255,255,.6);background:transparent;" +
      "color:#fff;border-radius:4px;padding:2px 8px;font:inherit";
    return b;
  }
}
