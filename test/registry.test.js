import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRegistry, resolvePath, reachableTargets } from "../models/registry.js";

// Registry shape mirrors the Bergamot index.json: keys like "enru" → en→ru.
const INDEX = {
  enru: { model: { name: "enru.bin" } },
  ruen: { model: { name: "ruen.bin" } },
  ende: { model: { name: "ende.bin" } },
  deen: { model: { name: "deen.bin" } },
  enfr: { model: { name: "enfr.bin" } },
};

test("parseRegistry splits the 4-char key into from/to", () => {
  const pairs = parseRegistry(INDEX);
  assert.deepEqual(pairs[0], { from: "en", to: "ru" });
  assert.equal(pairs.length, 5);
});

test("resolvePath returns a single step for a direct model", () => {
  const pairs = parseRegistry(INDEX);
  assert.deepEqual(resolvePath(pairs, "en", "ru"), [{ from: "en", to: "ru" }]);
});

test("resolvePath pivots through English when no direct model exists", () => {
  const pairs = parseRegistry(INDEX);
  assert.deepEqual(resolvePath(pairs, "ru", "de"), [
    { from: "ru", to: "en" },
    { from: "en", to: "de" },
  ]);
});

test("resolvePath returns [] when source equals target", () => {
  const pairs = parseRegistry(INDEX);
  assert.deepEqual(resolvePath(pairs, "en", "en"), []);
});

test("resolvePath returns null when the pair is unreachable", () => {
  const pairs = parseRegistry(INDEX);
  assert.equal(resolvePath(pairs, "ru", "ja"), null); // no ja models at all
});

test("reachableTargets lists direct + pivoted targets from a source", () => {
  const pairs = parseRegistry(INDEX);
  // From ru: ru→en (direct), ru→en→de, ru→en→fr (pivot). Not ru itself.
  assert.deepEqual(reachableTargets(pairs, "ru"), ["de", "en", "fr"]);
});
