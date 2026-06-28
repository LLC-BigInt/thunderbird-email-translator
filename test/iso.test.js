import { test } from "node:test";
import assert from "node:assert/strict";
import { iso3To1, iso1To3, SUPPORTED_ISO1 } from "../lang/iso.js";

test("iso3To1 maps franc 639-3 codes to 2-letter codes", () => {
  assert.equal(iso3To1("rus"), "ru");
  assert.equal(iso3To1("eng"), "en");
  assert.equal(iso3To1("deu"), "de");
  assert.equal(iso3To1("ukr"), "uk");
});

test("iso3To1 returns null for an unsupported code", () => {
  assert.equal(iso3To1("zzz"), null);
});

test("iso1To3 is the inverse for supported languages", () => {
  assert.equal(iso1To3("ru"), "rus");
  assert.equal(iso1To3("en"), "eng");
});

test("SUPPORTED_ISO1 contains the core languages", () => {
  for (const code of ["en", "ru", "de", "uk", "fr", "es"]) {
    assert.ok(SUPPORTED_ISO1.includes(code), `missing ${code}`);
  }
});
