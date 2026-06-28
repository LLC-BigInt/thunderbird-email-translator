// Extension-facing detector: binds the bundled franc to the tested core.
import { francAll } from "./vendor/franc.bundle.js";
import { detectLanguage } from "./detect-core.js";

/**
 * @param {string} text
 * @param {string[]} [prefer] 2-letter codes to bias toward on a near-tie
 *   (the languages the user reads / targets).
 * @returns {string|null} 2-letter code or null
 */
export function detect(text, prefer = []) {
  return detectLanguage(text, francAll, prefer);
}
