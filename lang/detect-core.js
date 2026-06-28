// Offline source-language detection, restricted to the languages we can
// actually translate. `francAllFn` is injected so this stays testable with the
// real franc in Node and the bundled franc in the extension.
import { SUPPORTED_ISO3, iso3To1, iso1To3 } from "./iso.js";

// Below this many characters franc's guess is unreliable; treat as unknown.
const MIN_LENGTH = 12;

// franc scores the best guess at 1 and the rest lower. A "preferred" language
// (one the user reads / targets) this close to the best wins the tie — franc
// frequently confuses similar Cyrillic languages (ru vs bg) on short text.
const PREFER_THRESHOLD = 0.82;

/**
 * @param {string} text
 * @param {(value: string, options?: object) => [string, number][]} francAllFn
 *   franc's ranked detector (francAll): returns [iso3, score] pairs, best first.
 * @param {string[]} [prefer] 2-letter codes to bias toward on a near-tie.
 * @returns {string|null} 2-letter language code, or null if undetermined
 */
export function detectLanguage(text, francAllFn, prefer = []) {
  const trimmed = (text || "").trim();
  if (trimmed.length < MIN_LENGTH) return null;

  const ranked = francAllFn(trimmed, { only: SUPPORTED_ISO3, minLength: MIN_LENGTH });
  if (!ranked || !ranked.length) return null;
  const [topIso] = ranked[0];
  if (!topIso || topIso === "und") return null;

  // Bias toward languages the user actually deals with, but only when one of
  // them scores nearly as high as franc's best guess.
  const preferIso3 = new Set(prefer.map(iso1To3).filter(Boolean));
  if (preferIso3.size) {
    for (const [iso3, score] of ranked) {
      if (score < PREFER_THRESHOLD) break; // ranked high→low: nothing closer left
      if (preferIso3.has(iso3)) return iso3To1(iso3);
    }
  }
  return iso3To1(topIso);
}
