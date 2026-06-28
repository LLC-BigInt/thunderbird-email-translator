// Tiny IndexedDB key→ArrayBuffer store used to persist downloaded Bergamot
// model files so a language pair is downloaded only once, then works offline.

const DB_NAME = "mail-translator";
const STORE = "models";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode) {
  return db.transaction(STORE, mode).objectStore(STORE);
}

function asPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** @returns {Promise<ArrayBuffer|null>} */
export async function idbGet(key) {
  const db = await openDb();
  const result = await asPromise(tx(db, "readonly").get(key));
  return result ?? null;
}

/** @param {string} key @param {ArrayBuffer} value */
export async function idbPut(key, value) {
  const db = await openDb();
  await asPromise(tx(db, "readwrite").put(value, key));
}

/** @returns {Promise<string[]>} */
export async function idbKeys() {
  const db = await openDb();
  return await asPromise(tx(db, "readonly").getAllKeys());
}

export async function idbClear() {
  const db = await openDb();
  await asPromise(tx(db, "readwrite").clear());
}

/** @param {string} key */
export async function idbDelete(key) {
  const db = await openDb();
  await asPromise(tx(db, "readwrite").delete(key));
}

/**
 * Every entry as {key, size} without holding all buffers in memory — the cursor
 * reads one value at a time, we record its byte length and move on.
 * @returns {Promise<{key: string, size: number}[]>}
 */
export async function idbEntries() {
  const db = await openDb();
  return await new Promise((resolve, reject) => {
    const out = [];
    const req = tx(db, "readonly").openCursor();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) {
        resolve(out);
        return;
      }
      const value = cursor.value;
      const size = value && value.byteLength ? value.byteLength : 0;
      out.push({ key: cursor.key, size });
      cursor.continue();
    };
  });
}
