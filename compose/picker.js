// Popover for the composer toolbar button: pick a target language and translate
// the whole message. Talks to the compose script (mt-compose-all).
import { LANGUAGES } from "../lang/languages.js";

const targetSel = document.getElementById("mt-compose-target");
const translateBtn = document.getElementById("mt-translate-all");
const restoreBtn = document.getElementById("mt-restore");

for (const { iso1, name } of [...LANGUAGES].sort((a, b) => a.name.localeCompare(b.name))) {
  targetSel.add(new Option(name, iso1));
}

// Default to the last compose target, falling back to the general target language.
const { composeTarget, targetLang = "en" } = await browser.storage.local.get([
  "composeTarget",
  "targetLang",
]);
targetSel.value = composeTarget || targetLang;

targetSel.addEventListener("change", () =>
  browser.storage.local.set({ composeTarget: targetSel.value }),
);

translateBtn.addEventListener("click", async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    await browser.tabs.sendMessage(tab.id, { cmd: "mt-compose-all", to: targetSel.value });
  }
  window.close();
});

restoreBtn.addEventListener("click", async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab) await browser.tabs.sendMessage(tab.id, { cmd: "mt-compose-restore" });
  window.close();
});
