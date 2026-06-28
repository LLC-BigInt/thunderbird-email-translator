import { test } from "node:test";
import assert from "node:assert/strict";
import { pairFromUrl, summarizeModels, formatBytes } from "../models/summary.js";

const URL = "https://bergamot.s3.amazonaws.com/models";

test("pairFromUrl parses the language pair from a model file URL", () => {
  assert.deepEqual(pairFromUrl(`${URL}/enru/model.enru.intgemm.alphas.bin`), {
    from: "en",
    to: "ru",
  });
  assert.equal(pairFromUrl("https://example.com/nope.bin"), null);
});

test("summarizeModels groups cached files by pair and sums their sizes", () => {
  const entries = [
    { key: `${URL}/enru/model.enru.bin`, size: 17_000_000 },
    { key: `${URL}/enru/lex.enru.bin`, size: 3_000_000 },
    { key: `${URL}/enru/vocab.enru.spm`, size: 1_000_000 },
    { key: `${URL}/deen/model.deen.bin`, size: 10_000_000 },
    { key: "__registry__", size: 500 }, // internal — must be ignored
  ];
  const { pairs, totalBytes } = summarizeModels(entries);
  assert.equal(totalBytes, 31_000_000);
  assert.deepEqual(pairs, [
    { from: "de", to: "en", bytes: 10_000_000, keys: [`${URL}/deen/model.deen.bin`] },
    {
      from: "en",
      to: "ru",
      bytes: 21_000_000,
      keys: [
        `${URL}/enru/model.enru.bin`,
        `${URL}/enru/lex.enru.bin`,
        `${URL}/enru/vocab.enru.spm`,
      ],
    },
  ]);
});

test("summarizeModels handles an empty store", () => {
  assert.deepEqual(summarizeModels([]), { pairs: [], totalBytes: 0 });
});

test("formatBytes renders human-readable sizes", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(512), "512 B");
  assert.equal(formatBytes(1024), "1.0 KB");
  assert.equal(formatBytes(21_000_000), "20.0 MB");
});
