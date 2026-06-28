// Mapping between franc's ISO 639-3 codes and the 2-letter codes used by the
// Bergamot model registry. Derived from the canonical LANGUAGES list.
import { LANGUAGES } from "./languages.js";

const ISO3_TO_1 = new Map(LANGUAGES.map((l) => [l.iso3, l.iso1]));
const ISO1_TO_3 = new Map(LANGUAGES.map((l) => [l.iso1, l.iso3]));

export const SUPPORTED_ISO1 = LANGUAGES.map((l) => l.iso1);
export const SUPPORTED_ISO3 = LANGUAGES.map((l) => l.iso3);

/** ISO 639-3 (franc) → 2-letter registry code, or null if unsupported. */
export function iso3To1(code) {
  return ISO3_TO_1.get(code) ?? null;
}

/** 2-letter registry code → ISO 639-3 (franc), or null if unsupported. */
export function iso1To3(code) {
  return ISO1_TO_3.get(code) ?? null;
}
