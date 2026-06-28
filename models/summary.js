// Pure helpers to summarise the cached Bergamot model files for the options
// page: group raw file URLs by language pair and total their on-disk sizes.

/**
 * Parse the language pair from a model file URL (".../models/enru/...").
 * @param {string} url
 * @returns {{from: string, to: string}|null}
 */
export function pairFromUrl(url) {
  const m = /\/models\/([a-z]{2})([a-z]{2})\//.exec(url || "");
  return m ? { from: m[1], to: m[2] } : null;
}

/**
 * @param {{key: string, size: number}[]} entries cached file keys + byte sizes
 * @returns {{pairs: {from,to,bytes,keys}[], totalBytes: number}}
 *   pairs sorted by code; internal keys ("__…") are ignored.
 */
export function summarizeModels(entries) {
  const byPair = new Map();
  let totalBytes = 0;
  for (const { key, size } of entries) {
    if (key.startsWith("__")) continue; // registry cache etc.
    totalBytes += size;
    const p = pairFromUrl(key);
    const id = p ? p.from + p.to : "other";
    if (!byPair.has(id)) byPair.set(id, { from: p?.from ?? null, to: p?.to ?? null, bytes: 0, keys: [] });
    const e = byPair.get(id);
    e.bytes += size;
    e.keys.push(key);
  }
  const pairs = [...byPair.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
  return { pairs, totalBytes };
}

/** @param {number} n bytes @returns {string} */
export function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}
