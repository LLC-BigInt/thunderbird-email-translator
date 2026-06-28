import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldOffer } from "../lang/auto.js";

test("offers when the detected language is foreign", () => {
  assert.equal(shouldOffer("de", ["ru", "en"], "ru"), true);
});

test("does not offer when detected language is the target", () => {
  assert.equal(shouldOffer("ru", ["ru", "en"], "ru"), false);
});

test("does not offer when detected language is one the user understands", () => {
  assert.equal(shouldOffer("en", ["ru", "en"], "ru"), false);
});

test("does not offer when detection failed", () => {
  assert.equal(shouldOffer(null, ["ru"], "ru"), false);
  assert.equal(shouldOffer("", ["ru"], "ru"), false);
});

test("treats a missing known list as 'only the target is understood'", () => {
  assert.equal(shouldOffer("en", undefined, "ru"), true);
  assert.equal(shouldOffer("ru", undefined, "ru"), false);
});
