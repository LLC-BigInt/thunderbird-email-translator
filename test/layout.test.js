import { test } from "node:test";
import assert from "node:assert/strict";
import { multiplyTransform, groupLines } from "../pdf/layout.js";

test("multiplyTransform composes identity to the second matrix", () => {
  assert.deepEqual(multiplyTransform([1, 0, 0, 1, 0, 0], [1, 0, 0, 1, 5, 6]), [1, 0, 0, 1, 5, 6]);
});

test("multiplyTransform applies scale to translation", () => {
  assert.deepEqual(multiplyTransform([2, 0, 0, 2, 0, 0], [1, 0, 0, 1, 3, 4]), [2, 0, 0, 2, 6, 8]);
});

test("groupLines merges items sharing a baseline, left-to-right, with a width", () => {
  const placed = [
    { str: "world", left: 60, right: 110, top: 5, fontHeight: 10, baseline: 15 },
    { str: "Hello", left: 10, right: 50, top: 5, fontHeight: 10, baseline: 15 },
    { str: "Next", left: 10, right: 45, top: 25, fontHeight: 10, baseline: 35 },
  ];
  const lines = groupLines(placed);
  assert.equal(lines.length, 2);
  assert.equal(lines[0].text, "Hello world");
  assert.equal(lines[0].left, 10);
  assert.equal(lines[0].width, 100); // 110 - 10
  assert.equal(lines[1].text, "Next");
});

test("groupLines tolerates small baseline jitter within a line", () => {
  const placed = [
    { str: "A", left: 10, right: 20, top: 0, fontHeight: 10, baseline: 20 },
    { str: "B", left: 30, right: 40, top: 0, fontHeight: 10, baseline: 22 },
  ];
  assert.equal(groupLines(placed).length, 1);
});

test("groupLines splits side-by-side columns separated by a big gap", () => {
  // Same baseline, but a wide horizontal gap → two separate lines (columns).
  const placed = [
    { str: "Left", left: 10, right: 60, top: 0, fontHeight: 10, baseline: 20 },
    { str: "Right", left: 400, right: 460, top: 0, fontHeight: 10, baseline: 20 },
  ];
  const lines = groupLines(placed);
  assert.equal(lines.length, 2);
  assert.deepEqual(lines.map((l) => l.text).sort(), ["Left", "Right"]);
});
