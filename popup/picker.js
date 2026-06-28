// Language-picker popup. Populates selectors from the shared language list,
// remembers the last target language, and hands off to the background on
// Translate (the popup then closes — orchestration lives in the background).
import { LANGUAGES } from "../lang/languages.js";

const fromSel = document.getElementById("mt-from");
const toSel = document.getElementById("mt-to");
const status = document.getElementById("mt-status");

const sorted = [...LANGUAGES].sort((a, b) => a.name.localeCompare(b.name));
for (const { iso1, name } of sorted) {
  fromSel.add(new Option(name, iso1));
  toSel.add(new Option(name, iso1));
}

// Restore the last-used languages (set here or on the options page).
const { targetLang = "en", sourceLang = "auto" } = await browser.storage.local.get([
  "targetLang",
  "sourceLang",
]);
const has = (sel, val) => [...sel.options].some((o) => o.value === val);
fromSel.value = has(fromSel, sourceLang) ? sourceLang : "auto";
toSel.value = has(toSel, targetLang) ? targetLang : "en";

document.getElementById("mt-translate").addEventListener("click", async () => {
  const from = fromSel.value;
  const to = toSel.value;
  await browser.storage.local.set({ targetLang: to, sourceLang: from });
  status.textContent = "Translating…";
  await browser.runtime.sendMessage({ cmd: "mt-trigger", from, to });
  window.close();
});
