// TranslatorBacking that persists downloaded model files (and the registry)
// in IndexedDB, so each language pair is fetched from the network only once and
// translation works fully offline afterwards.
import { TranslatorBacking } from "./vendor/translator.js";
import { idbGet, idbPut } from "../models/idb.js";

const REGISTRY_KEY = "__registry__";

export class CachedBacking extends TranslatorBacking {
  // Model files: serve from IndexedDB if present, otherwise download (with the
  // base class's checksum verification) and store for next time.
  async fetch(url, checksum, extra) {
    const cached = await idbGet(url);
    if (cached) return cached;

    const buffer = await super.fetch(url, checksum, extra);
    try {
      await idbPut(url, buffer);
    } catch (e) {
      // Out of quota / private mode: translation still works this session.
      console.warn("Mail Translator: could not cache model file", url, e);
    }
    return buffer;
  }

  // Registry: cache the parsed list so language availability survives offline.
  async loadModelRegistery() {
    try {
      const pairs = await super.loadModelRegistery();
      const blob = new TextEncoder().encode(JSON.stringify(pairs)).buffer;
      await idbPut(REGISTRY_KEY, blob);
      return pairs;
    } catch (e) {
      const cached = await idbGet(REGISTRY_KEY);
      if (!cached) throw e;
      return JSON.parse(new TextDecoder().decode(cached));
    }
  }
}
