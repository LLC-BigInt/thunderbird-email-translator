import { test } from "node:test";
import assert from "node:assert/strict";
import { lookupPhrase } from "../lang/phrasebook.js";

test("translates common greetings directly, bypassing the model", () => {
  assert.equal(lookupPhrase("привет", "ru", "en"), "Hi");
  assert.equal(lookupPhrase("спасибо", "ru", "en"), "Thank you");
  assert.equal(lookupPhrase("hello", "en", "ru"), "Здравствуйте");
});

test("is case-insensitive and ignores trailing punctuation/space", () => {
  assert.equal(lookupPhrase("Привет!", "ru", "en"), "Hi");
  assert.equal(lookupPhrase("  СПАСИБО. ", "ru", "en"), "Thank you");
});

test("returns null for anything that isn't a known whole phrase", () => {
  assert.equal(lookupPhrase("тестовый перевод перед отправкой", "ru", "en"), null);
  assert.equal(lookupPhrase("привет мир", "ru", "en"), null);
  assert.equal(lookupPhrase("", "ru", "en"), null);
});

test("returns null for language pairs it doesn't cover", () => {
  assert.equal(lookupPhrase("привет", "ru", "de"), null);
  assert.equal(lookupPhrase("hola", "es", "en"), null);
});
