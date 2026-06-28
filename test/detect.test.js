import { test } from "node:test";
import assert from "node:assert/strict";
import { francAll } from "franc";
import { detectLanguage } from "../lang/detect-core.js";

// Detection runs on the whole message body, so the samples here are
// paragraph-length — representative of real email text, where franc is
// reliable. (Very short fragments are ambiguous; see the last tests.)

test("detects English", () => {
  const text =
    "Good morning families. Please note that classes will start one hour " +
    "later than usual tomorrow because of scheduled maintenance. Kindly " +
    "adjust your schedule and let the children know in advance.";
  assert.equal(detectLanguage(text, francAll), "en");
});

test("detects Russian", () => {
  const text =
    "Добрый день, уважаемые родители. Сообщаем, что завтра занятия в школе " +
    "начнутся на час позже обычного из-за планового технического " +
    "обслуживания. Просим учесть это изменение в расписании.";
  assert.equal(detectLanguage(text, francAll), "ru");
});

test("detects German", () => {
  const text =
    "Guten Morgen, liebe Eltern. Wir möchten Sie darüber informieren, dass " +
    "der Unterricht morgen aufgrund einer planmäßigen Wartung eine Stunde " +
    "später als gewöhnlich beginnt. Bitte berücksichtigen Sie das.";
  assert.equal(detectLanguage(text, francAll), "de");
});

test("returns null for empty or too-short text", () => {
  assert.equal(detectLanguage("", francAll), null);
  assert.equal(detectLanguage("   ", francAll), null);
  assert.equal(detectLanguage("hi", francAll), null);
});

test("never returns a language outside the supported set", () => {
  const result = detectLanguage(
    "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do.",
    francAll,
  );
  assert.ok(result === null || /^[a-z]{2}$/.test(result));
});

// --- preference tie-break (the ru-vs-bg fix) ----------------------------

test("short Russian is misread as Bulgarian without a hint", () => {
  // Documents the underlying franc ambiguity that the preference fixes.
  assert.equal(detectLanguage("тест перевода перед отправкой", francAll), "bg");
});

test("a preferred language wins the tie on short Cyrillic text", () => {
  assert.equal(
    detectLanguage("тест перевода перед отправкой", francAll, ["en", "ru"]),
    "ru",
  );
});

test("preference does not hijack a clearly different language", () => {
  // German text must stay German even when the user prefers ru/en.
  const text =
    "Guten Morgen, liebe Eltern. Wir möchten Sie darüber informieren, dass " +
    "der Unterricht morgen eine Stunde später beginnt.";
  assert.equal(detectLanguage(text, francAll, ["ru", "en"]), "de");
});
