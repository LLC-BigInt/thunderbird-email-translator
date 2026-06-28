// Decision logic for the auto / offer-to-translate feature: given a detected
// source language, the languages the user understands, and the target language,
// decide whether we should offer (or perform) a translation.

/**
 * @param {string|null|undefined} detected  detected source language (iso1)
 * @param {string[]|undefined} known         languages the user understands (iso1)
 * @param {string} target                    default target language (iso1)
 * @returns {boolean} true when the message is in a language worth translating.
 */
export function shouldOffer(detected, known, target) {
  if (!detected) return false;
  if (detected === target) return false;
  const understood = known && known.length ? known : [target];
  return !understood.includes(detected);
}
