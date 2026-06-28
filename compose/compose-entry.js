// Compose script (auto-injected into every compose window via the
// "compose_scripts" manifest key). On request from the background — triggered
// by the "Translate selection to ▸ <lang>" context menu — it translates the
// current selection in place using the same on-device engine as Phase 1.
//
// Bundled (esbuild → compose.bundle.js) since compose scripts are classic.
import { collectBlocks, TranslationSession } from "../content/dom.js";

if (!window.__mtComposeInjected) {
  window.__mtComposeInjected = true;

  // Kept for the life of the composer so the popover can restore the original
  // text for editing (we can't show an in-body toggle bar — it would be sent).
  let composeSession = null;

  browser.runtime.onMessage.addListener(async (msg) => {
    if (msg?.cmd === "mt-compose") return translateSelection(msg.to);
    if (msg?.cmd === "mt-compose-all") return translateWholeMessage(msg.to);
    if (msg?.cmd === "mt-compose-restore") return restoreOriginal();
  });

  function restoreOriginal() {
    if (!composeSession) {
      notify("Nothing to restore — translate the message first.");
      return;
    }
    composeSession.showOriginal();
    composeSession = null;
  }

  // 4a: translate the current selection in place.
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
      to,
    });
    if (!resp || !resp.ok) {
      notify("Translation failed: " + (resp?.error || "unknown error"));
      return;
    }

    // Replace the (still active) selection with the translated text. insertText
    // keeps it within the editable compose body and preserves undo.
    document.execCommand("insertText", false, resp.text);
  }

  // 3: translate the whole message body in place, reusing the reading-side
  // block machinery so quotes/signatures are skipped and markup is preserved.
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
      to,
    });
    if (!resp || !resp.ok) {
      notify("Translation failed: " + (resp?.error || "unknown error"));
      return;
    }

    session.apply(resp.translations);
    composeSession = session; // remember so the popover can restore the original
  }

  function notify(message) {
    browser.runtime.sendMessage({ cmd: "mt-notify", message });
  }
}
