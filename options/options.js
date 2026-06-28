// Options page: default target language, cached-model management, donate link.
import { LANGUAGES } from "../lang/languages.js";
import { idbEntries, idbClear, idbDelete } from "../models/idb.js";
import { summarizeModels, formatBytes } from "../models/summary.js";
import { DONATE_URL } from "../donate.js";

const targetSel = document.getElementById("mt-default-target");
const skipQuotes = document.getElementById("mt-skip-quotes");
const autoMode = document.getElementById("mt-auto-mode");
const knownLangsSel = document.getElementById("mt-known-langs");
const modelsList = document.getElementById("mt-models-list");
const modelsTotal = document.getElementById("mt-models-total");
const clearBtn = document.getElementById("mt-clear-models");
const donate = document.getElementById("mt-donate");

const NAMES = new Map(LANGUAGES.map((l) => [l.iso1, l.name]));
const langName = (iso) => NAMES.get(iso) || iso || "?";

donate.href = DONATE_URL;

for (const { iso1, name } of [...LANGUAGES].sort((a, b) => a.name.localeCompare(b.name))) {
  targetSel.add(new Option(name, iso1));
}

const { targetLang = "en" } = await browser.storage.local.get("targetLang");
targetSel.value = targetLang;
targetSel.addEventListener("change", () =>
  browser.storage.local.set({ targetLang: targetSel.value }),
);

const { skipQuotes: skip = true } = await browser.storage.local.get("skipQuotes");
skipQuotes.checked = skip;
skipQuotes.addEventListener("change", () =>
  browser.storage.local.set({ skipQuotes: skipQuotes.checked }),
);

// Auto / offer-to-translate settings.
const sortedLangs = [...LANGUAGES].sort((a, b) => a.name.localeCompare(b.name));
for (const { iso1, name } of sortedLangs) {
  knownLangsSel.add(new Option(name, iso1));
}

const uiLang = (browser.i18n.getUILanguage?.() || "").slice(0, 2);
const { autoMode: mode = "ask", knownLangs = [targetLang, uiLang].filter(Boolean) } =
  await browser.storage.local.get(["autoMode", "knownLangs"]);
autoMode.value = mode;
for (const opt of knownLangsSel.options) opt.selected = knownLangs.includes(opt.value);

autoMode.addEventListener("change", () =>
  browser.storage.local.set({ autoMode: autoMode.value }),
);
knownLangsSel.addEventListener("change", () =>
  browser.storage.local.set({
    knownLangs: [...knownLangsSel.selectedOptions].map((o) => o.value),
  }),
);

async function refreshModels() {
  const { pairs, totalBytes } = summarizeModels(await idbEntries());
  modelsList.replaceChildren();

  if (!pairs.length) {
    const li = document.createElement("li");
    li.className = "mt-muted";
    li.textContent =
      "No models downloaded yet. They download on first use of a language pair.";
    modelsList.appendChild(li);
    modelsTotal.textContent = "";
    clearBtn.disabled = true;
    return;
  }

  for (const pair of pairs) {
    const li = document.createElement("li");

    const label = document.createElement("span");
    label.textContent =
      pair.from && pair.to
        ? `${langName(pair.from)} → ${langName(pair.to)} — ${formatBytes(pair.bytes)}`
        : `Other files — ${formatBytes(pair.bytes)}`;

    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "Delete";
    del.addEventListener("click", async () => {
      for (const key of pair.keys) await idbDelete(key);
      await refreshModels();
    });

    li.append(label, del);
    modelsList.appendChild(li);
  }
  modelsTotal.textContent = `Total: ${formatBytes(totalBytes)} on this device.`;
  clearBtn.disabled = false;
}

clearBtn.addEventListener("click", async () => {
  await idbClear();
  await refreshModels();
});

await refreshModels();
