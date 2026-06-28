import { test } from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import { idbGet, idbPut, idbKeys, idbClear } from "../models/idb.js";

test("idbPut then idbGet round-trips an ArrayBuffer", async () => {
  const bytes = new Uint8Array([1, 2, 3, 250]).buffer;
  await idbPut("model-a", bytes);
  const out = await idbGet("model-a");
  assert.deepEqual(new Uint8Array(out), new Uint8Array([1, 2, 3, 250]));
});

test("idbGet returns null for a missing key", async () => {
  assert.equal(await idbGet("nope"), null);
});

test("idbKeys lists stored keys and idbClear empties the store", async () => {
  await idbPut("k1", new Uint8Array([1]).buffer);
  await idbPut("k2", new Uint8Array([2]).buffer);
  const keys = await idbKeys();
  assert.ok(keys.includes("k1") && keys.includes("k2"));

  await idbClear();
  assert.deepEqual(await idbKeys(), []);
});
