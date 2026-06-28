import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanPdfText } from "../pdf/clean.js";

test("drops lines that are only bullets/symbols/whitespace", () => {
  const out = cleanPdfText("•\n·\n  \n***\nReal text here");
  assert.equal(out, "Real text here");
});

test("keeps lines that contain letters or digits", () => {
  const out = cleanPdfText("Account Number: 552427188\n• \nPhone: 123");
  assert.equal(out, "Account Number: 552427188\nPhone: 123");
});

test("collapses runs of blank lines into a single blank line", () => {
  const out = cleanPdfText("Title\n\n\n\nBody");
  assert.equal(out, "Title\n\nBody");
});

test("trims leading/trailing blank lines", () => {
  const out = cleanPdfText("\n\nHello\n\n");
  assert.equal(out, "Hello");
});

test("returns empty string for symbol-only / empty input", () => {
  assert.equal(cleanPdfText("•\n•\n•"), "");
  assert.equal(cleanPdfText(""), "");
});
