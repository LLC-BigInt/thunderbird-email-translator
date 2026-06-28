import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import {
  normalizeShout,
  restoreShout,
  normalizeShoutHtml,
  restoreShoutHtml,
} from "../lang/caps.js";

// --- plain-text normalization -------------------------------------------

test("normalizeShout lowercases ALL-CAPS words so the model keeps them", () => {
  const { text, fullyShout } = normalizeShout(
    "Friday June 26th - Saturday, June 27th ONLY 2026",
  );
  assert.equal(text, "Friday June 26th - Saturday, June 27th only 2026");
  assert.equal(fullyShout, false); // mixed-case segment
});

test("normalizeShout flags a fully-shouting segment", () => {
  const { text, fullyShout } = normalizeShout("LIMITED TIME OFFER - SALE ENDS SOON");
  assert.equal(text, "limited time offer - sale ends soon");
  assert.equal(fullyShout, true);
});

test("normalizeShout leaves single capitals and acronym-free text alone", () => {
  const a = normalizeShout("I am here");
  assert.equal(a.text, "I am here");
  assert.equal(a.fullyShout, false);

  const b = normalizeShout("This offer is free today");
  assert.equal(b.text, "This offer is free today");
  assert.equal(b.fullyShout, false);
});

test("restoreShout re-uppercases only when the segment was fully shouting", () => {
  assert.equal(restoreShout("ограниченное предложение", true), "ОГРАНИЧЕННОЕ ПРЕДЛОЖЕНИЕ");
  assert.equal(restoreShout("только", false), "только");
});

// --- HTML (per-text-node) normalization ---------------------------------

const doc = new JSDOM("<body></body>").window.document;

test("normalizeShoutHtml de-shouts each text node and tracks per-node flags", () => {
  const { html, flags } = normalizeShoutHtml(
    "June 27th <b>ONLY</b> 2026",
    doc,
  );
  assert.equal(html, "June 27th <b>only</b> 2026");
  // text nodes in order: "June 27th ", "ONLY", " 2026"
  assert.deepEqual(flags, [false, true, false]);
});

test("restoreShoutHtml re-uppercases the styled emphasis word in place", () => {
  // Simulates translated HTML where Bergamot preserved the <b> wrapper.
  const out = restoreShoutHtml("27 июня <b>только</b> 2026", [false, true, false], doc);
  assert.equal(out, "27 июня <b>ТОЛЬКО</b> 2026");
});

test("restoreShoutHtml skips restoration safely when node count differs", () => {
  // Bergamot collapsed structure -> different node count -> leave normalized case.
  const out = restoreShoutHtml("27 июня только", [false, true, false], doc);
  assert.equal(out, "27 июня только");
});

test("round trip leaves tag-free text with no shouting untouched", () => {
  const { html, flags } = normalizeShoutHtml("Hello <i>world</i>", doc);
  assert.equal(html, "Hello <i>world</i>");
  assert.equal(restoreShoutHtml(html, flags, doc), "Hello <i>world</i>");
});
