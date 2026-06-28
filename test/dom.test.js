import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { collectBlocks, TranslationSession } from "../content/dom.js";

function bodyOf(html) {
  return new JSDOM(`<body>${html}</body>`).window.document.body;
}

test("collectBlocks returns leaf blocks with their inline markup", () => {
  const root = bodyOf("<div><p>Hello <b>world</b></p></div>");
  const blocks = collectBlocks(root);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].innerHTML, "Hello <b>world</b>");
});

test("collectBlocks skips empty / whitespace-only blocks", () => {
  const root = bodyOf("<p>Real text</p><p>   </p><p></p>");
  const blocks = collectBlocks(root);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].textContent, "Real text");
});

test("collectBlocks captures each list item separately", () => {
  const root = bodyOf("<ul><li>One</li><li>Two</li></ul>");
  const blocks = collectBlocks(root);
  assert.deepEqual(blocks.map((b) => b.textContent), ["One", "Two"]);
});

test("collectBlocks does not return a container that holds other blocks", () => {
  const root = bodyOf("<div><p>Inside</p></div>");
  const blocks = collectBlocks(root);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].tagName, "P");
});

test("collectBlocks ignores script and style content", () => {
  const root = bodyOf("<p>Visible</p><script>var x=1;</script><style>.a{}</style>");
  const blocks = collectBlocks(root);
  assert.deepEqual(blocks.map((b) => b.textContent), ["Visible"]);
});

test("collectBlocks skips quotes and signatures when skipQuotes is set", () => {
  const root = bodyOf(
    "<p>New reply</p>" +
      '<blockquote type="cite"><p>Quoted history</p></blockquote>' +
      '<div class="moz-signature"><p>Best, Bob</p></div>',
  );
  const blocks = collectBlocks(root, { skipQuotes: true });
  assert.deepEqual(blocks.map((b) => b.textContent), ["New reply"]);
});

test("collectBlocks skips a blockquote that is itself a leaf block", () => {
  const root = bodyOf("<p>New reply</p><blockquote>Just quoted text</blockquote>");
  const blocks = collectBlocks(root, { skipQuotes: true });
  assert.deepEqual(blocks.map((b) => b.textContent), ["New reply"]);
});

test("collectBlocks keeps quotes and signatures by default", () => {
  const root = bodyOf(
    "<p>New reply</p>" +
      '<blockquote type="cite"><p>Quoted history</p></blockquote>' +
      '<div class="moz-signature"><p>Best, Bob</p></div>',
  );
  const blocks = collectBlocks(root);
  assert.deepEqual(blocks.map((b) => b.textContent), [
    "New reply",
    "Quoted history",
    "Best, Bob",
  ]);
});

test("TranslationSession applies translations and toggles back to original", () => {
  const root = bodyOf("<p>Hello</p><p>Bye</p>");
  const blocks = collectBlocks(root);
  const session = new TranslationSession(blocks);

  session.apply(["Bonjour", "Au revoir"]);
  assert.deepEqual(blocks.map((b) => b.innerHTML), ["Bonjour", "Au revoir"]);

  session.showOriginal();
  assert.deepEqual(blocks.map((b) => b.innerHTML), ["Hello", "Bye"]);

  session.showTranslation();
  assert.deepEqual(blocks.map((b) => b.innerHTML), ["Bonjour", "Au revoir"]);
});

test("TranslationSession exposes the original block HTML for translation", () => {
  const root = bodyOf("<p>Hello <i>there</i></p>");
  const session = new TranslationSession(collectBlocks(root));
  assert.deepEqual(session.originals, ["Hello <i>there</i>"]);
});
