// Mail Translator — background orchestration.
//
// Entry points (toolbar button popup + body context menu) both end with the
// popup sending an "mt-trigger". The background then injects the content script
// into the open message, which extracts blocks and asks back for translation.
import { detect } from "./lang/detect.js";
import { translateBlocks, translateText, translateTexts } from "./engine/engine.js";
import { LANGUAGES } from "./lang/languages.js";
import { lookupPhrase } from "./lang/phrasebook.js";
import { DONATE_URL } from "./donate.js";

console.log("Mail Translator: background page loaded");

// Inject the compose helper into composer windows. The "compose_scripts"
// manifest key only exists from TB 151, so register programmatically (TB 82+).
// Note: this applies to composers opened *after* registration — reopen any
// composer that was already open.
browser.composeScripts
  .register({ js: [{ file: "compose/compose.bundle.js" }] })
  .catch((e) => console.error("Mail Translator: composeScripts.register failed", e));

const MENU_ID = "mt-translate";
const COMPOSE_PARENT = "mt-compose-parent";
const COMPOSE_PREFIX = "mt-cto-"; // + iso1
const PDF_MENU = "mt-pdf";

const isPdf = (a) =>
  a && (a.contentType === "application/pdf" || /\.pdf$/i.test(a.name || ""));

// Reading: right-click the displayed message body (content document → generic
// page/selection contexts).
browser.menus.create({
  id: MENU_ID,
  title: "Translate…",
  contexts: ["page", "selection"],
});

// Composing: right-click selected text in the editor → "Translate selection
// to ▸ <language>". Each language is a child item.
browser.menus.create({
  id: COMPOSE_PARENT,
  title: "Translate selection to",
  contexts: ["compose_body"],
});
for (const { iso1, name } of [...LANGUAGES].sort((a, b) => a.name.localeCompare(b.name))) {
  browser.menus.create({
    id: COMPOSE_PREFIX + iso1,
    parentId: COMPOSE_PARENT,
    title: name,
    contexts: ["compose_body"],
  });
}

// Attachments: right-click a PDF attachment → "Translate PDF…" (opens a viewer
// tab that extracts the text and shows the translation next to the original).
browser.menus.create({
  id: PDF_MENU,
  title: "Translate PDF…",
  contexts: ["message_attachments"],
});

browser.menus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === PDF_MENU) {
    const pdfs = (info.attachments || []).filter(isPdf);
    if (!pdfs.length) {
      fail("Select a PDF attachment to translate.");
      return;
    }
    try {
      const message = await resolveDisplayedMessage(tab);
      if (!message) {
        fail("Open the message containing the PDF first, then right-click the attachment.");
        return;
      }
      const att = pdfs[0];
      const url =
        browser.runtime.getURL("pdf/view.html") +
        `?msg=${message.id}&part=${encodeURIComponent(att.partName)}` +
        `&name=${encodeURIComponent(att.name || "document.pdf")}`;
      await browser.tabs.create({ url });
    } catch (e) {
      fail("Could not open the PDF", e);
    }
    return;
  }
  if (info.menuItemId === MENU_ID) {
    try {
      await browser.messageDisplayAction.openPopup();
    } catch (e) {
      console.error("Mail Translator: could not open the translate popup", e);
    }
    return;
  }
  if (typeof info.menuItemId === "string" && info.menuItemId.startsWith(COMPOSE_PREFIX)) {
    const to = info.menuItemId.slice(COMPOSE_PREFIX.length);
    try {
      await browser.tabs.sendMessage(tab.id, { cmd: "mt-compose", to });
    } catch (e) {
      fail("Could not translate selection", e);
    }
  }
});

// Auto / offer-to-translate: when a message is displayed, detect its language
// and (depending on the user's mode) translate it or offer to. Deduped per tab
// so it fires once per opened message.
const lastShown = new Map(); // tab.id -> message.id

browser.messageDisplay.onMessageDisplayed.addListener(async (tab, message) => {
  try {
    const { autoMode = "ask", knownLangs, targetLang = "en" } =
      await browser.storage.local.get(["autoMode", "knownLangs", "targetLang"]);
    if (autoMode === "off") return;
    if (lastShown.get(tab.id) === message.id) return;
    lastShown.set(tab.id, message.id);

    await browser.tabs.executeScript(tab.id, { file: "content/content.bundle.js" });
    await browser.tabs.sendMessage(tab.id, {
      cmd: "mt-auto",
      mode: autoMode,
      to: targetLang,
      known: knownLangs && knownLangs.length ? knownLangs : [targetLang],
    });
  } catch (e) {
    // Some message-display tabs (special views) reject content scripts — ignore.
    console.debug("Mail Translator: auto-detect skipped", e?.message || e);
  }
});

browser.runtime.onMessage.addListener((msg) => {
  if (msg?.cmd === "mt-trigger") {
    startTranslation(msg).catch((e) => fail("Could not start translation", e));
    return; // popup is already closing; no response needed
  }
  if (msg?.cmd === "mt-detect") {
    return detectLanguage(msg.text); // promise → content auto-handler
  }
  if (msg?.cmd === "mt-translate") {
    return translateRequest(msg); // promise → response back to content script
  }
  if (msg?.cmd === "mt-translate-text") {
    return translateTextRequest(msg); // promise → response back to compose script
  }
  if (msg?.cmd === "mt-translate-lines") {
    return translateLinesRequest(msg); // promise → response back to the PDF viewer
  }
  if (msg?.cmd === "mt-notify") {
    fail(msg.message);
    return;
  }
  if (msg?.cmd === "mt-donate") {
    browser.tabs.create({ url: DONATE_URL });
    return;
  }
});

// Popup → inject content script into the active message and kick it off.
async function startTranslation({ from, to }) {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    fail("No active message tab found.");
    return;
  }
  if (tab.type === "messageCompose") {
    fail("In the composer, select text and use right-click → Translate selection to.");
    return;
  }
  // Requires the "messagesModify" permission for message-display tabs.
  await browser.tabs.executeScript(tab.id, { file: "content/content.bundle.js" });
  await browser.tabs.sendMessage(tab.id, { cmd: "mt-start", from, to });
}

// Robustly resolve the displayed message for an attachment click. getDisplayedMessage
// returns null when zero OR multiple messages are displayed, and the tab passed to the
// menu click can vary, so fall back to the plural API and the active tab.
async function resolveDisplayedMessage(tab) {
  const tryTab = async (id) => {
    if (id == null) return null;
    const one = await browser.messageDisplay.getDisplayedMessage(id).catch(() => null);
    if (one) return one;
    const many = await browser.messageDisplay.getDisplayedMessages(id).catch(() => null);
    const list = Array.isArray(many) ? many : many?.messages;
    return list && list.length ? list[0] : null;
  };

  let message = await tryTab(tab?.id);
  if (!message) {
    const [active] = await browser.tabs.query({ active: true, currentWindow: true });
    message = await tryTab(active?.id);
  }
  return message;
}

// Compose script → detect source (if "auto") and translate one plain-text string.
async function translateTextRequest({ text, from, to }) {
  try {
    let src = from;
    if (from === "auto") {
      src = detect(text, await preferredLangs());
      if (!src) return { ok: false, error: "Could not detect the source language (select a full sentence)." };
    }
    const translated = lookupPhrase(text, src, to) || (await translateText(text, src, to));
    return { ok: true, src, text: translated };
  } catch (e) {
    console.error("Mail Translator: selection translation failed", e);
    return { ok: false, error: e.message || String(e) };
  }
}

// Languages to bias detection toward (the user's target + the ones they read).
// franc confuses similar scripts on short text; this disambiguates.
async function preferredLangs() {
  const { targetLang = "en", knownLangs = [] } = await browser.storage.local.get([
    "targetLang",
    "knownLangs",
  ]);
  // The Thunderbird UI locale is a strong hint for the language the user writes
  // and reads — include it so detection works even before any configuration.
  const ui = (browser.i18n.getUILanguage?.() || "").slice(0, 2);
  return [targetLang, ...knownLangs, ui].filter(Boolean);
}

// Content auto-handler → detect language and return its iso + display name.
async function detectLanguage(text) {
  const lang = detect(text || "", await preferredLangs());
  if (!lang) return { lang: null };
  const entry = LANGUAGES.find((l) => l.iso1 === lang);
  return { lang, name: entry ? entry.name : lang };
}

// Plain text of an HTML block (background page has a DOM).
function blockText(html) {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  return (tpl.content.textContent || "").trim();
}

// Below this many characters per-block detection is unreliable — don't skip.
const MIN_BLOCK_DETECT = 12;

// Content → resolve source language (detect if "auto") and translate blocks.
// Blocks already written in the target language (e.g. an English reply
// attribution or quote inside a Russian message) are left untouched instead of
// being mangled by the wrong-direction model.
async function translateRequest({ htmls, text, from, to }) {
  try {
    const prefer = await preferredLangs();
    const texts = htmls.map(blockText);
    const keep = texts.map(
      (t) => t.length >= MIN_BLOCK_DETECT && detect(t, prefer) === to,
    );

    if (keep.every(Boolean)) return { ok: true, src: to, translations: htmls.slice() };

    let src = from;
    if (from === "auto") {
      const sample = texts.filter((_, i) => !keep[i]).join("\n") || text;
      src = detect(sample, prefer);
      if (!src) return { ok: false, error: "Could not detect the source language." };
    }

    // Direct-translate known short phrases (greetings/closings); send the rest
    // to the model. Reassemble in original order.
    const translations = new Array(htmls.length);
    const pending = [];
    const pendingPos = [];
    htmls.forEach((h, i) => {
      if (keep[i]) {
        translations[i] = h;
        return;
      }
      const phrase = lookupPhrase(texts[i], src, to);
      if (phrase) {
        translations[i] = phrase;
        return;
      }
      pendingPos.push(i);
      pending.push(h);
    });

    if (pending.length) {
      const translated = await translateBlocks(pending, src, to);
      translated.forEach((t, k) => (translations[pendingPos[k]] = t));
    }
    return { ok: true, src, translations };
  } catch (e) {
    console.error("Mail Translator: translation failed", e);
    return { ok: false, error: e.message || String(e) };
  }
}

// PDF viewer → detect source once per page, translate every line.
async function translateLinesRequest({ lines, from, to }) {
  try {
    let src = from;
    if (from === "auto") {
      src = detect(lines.join(" "), await preferredLangs());
      if (!src) return { ok: false, error: "Could not detect the source language." };
    }
    const translations = await translateTexts(lines, src, to);
    return { ok: true, src, translations };
  } catch (e) {
    console.error("Mail Translator: PDF line translation failed", e);
    return { ok: false, error: e.message || String(e) };
  }
}

// Surface errors the user would otherwise never see (e.g. when the content
// script could not be injected, so there is no in-message bar to show them in).
function fail(context, error) {
  const detail = error ? `: ${error.message || error}` : "";
  console.error(`Mail Translator: ${context}`, error || "");
  try {
    browser.notifications.create({
      type: "basic",
      iconUrl: "icons/icon-48.png",
      title: "Mail Translator",
      message: `${context}${detail}`,
    });
  } catch (e) {
    /* notifications unavailable — console already has it */
  }
}
