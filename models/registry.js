// Pure helpers over the Bergamot model registry (index.json). The engine
// library does its own pivoting at translation time; these helpers let the UI
// know, ahead of time, which target languages are reachable from a given
// source and what model chain a translation will need.

const PIVOT = "en";

/**
 * Parse the registry object (keys like "enru") into a list of {from,to} pairs.
 * @param {Record<string, unknown>} index
 * @returns {{from: string, to: string}[]}
 */
export function parseRegistry(index) {
  return Object.keys(index).map((key) => ({
    from: key.substring(0, 2),
    to: key.substring(2, 4),
  }));
}

function hasPair(pairs, from, to) {
  return pairs.some((p) => p.from === from && p.to === to);
}

/**
 * Resolve the model chain to translate `from` → `to`.
 * @returns {{from,to}[]|null} steps ([] if from===to, null if unreachable)
 */
export function resolvePath(pairs, from, to, pivot = PIVOT) {
  if (from === to) return [];
  if (hasPair(pairs, from, to)) return [{ from, to }];
  if (from !== pivot && to !== pivot && hasPair(pairs, from, pivot) && hasPair(pairs, pivot, to)) {
    return [
      { from, to: pivot },
      { from: pivot, to },
    ];
  }
  return null;
}

/**
 * Every target language reachable from `from` (direct or pivoted), sorted.
 * @returns {string[]}
 */
export function reachableTargets(pairs, from, pivot = PIVOT) {
  const targets = new Set();
  for (const { from: f, to } of pairs) {
    if (f === from) targets.add(to); // direct
  }
  // Pivoted: from → en → X
  if (from !== pivot && hasPair(pairs, from, pivot)) {
    for (const { from: f, to } of pairs) {
      if (f === pivot && to !== from) targets.add(to);
    }
  }
  return [...targets].sort();
}
