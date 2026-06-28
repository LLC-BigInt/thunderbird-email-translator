// Curated translations for very short, common phrases (greetings, closings).
// NMT mistranslates or repeats these when they arrive in isolation
// ("привет" -> "Hi, hey, hey,"). We match a WHOLE block exactly (case- and
// trailing-punctuation-insensitive); real sentences fall through to the model.

const BOOK = {
  ru: {
    en: {
      "привет": "Hi",
      "здравствуйте": "Hello",
      "здравствуй": "Hello",
      "доброе утро": "Good morning",
      "добрый день": "Good afternoon",
      "добрый вечер": "Good evening",
      "спасибо": "Thank you",
      "большое спасибо": "Thank you very much",
      "пока": "Bye",
      "до свидания": "Goodbye",
      "с уважением": "Best regards",
      "всего доброго": "All the best",
      "удачи": "Good luck",
    },
  },
  en: {
    ru: {
      "hi": "Привет",
      "hey": "Привет",
      "hello": "Здравствуйте",
      "good morning": "Доброе утро",
      "good afternoon": "Добрый день",
      "good evening": "Добрый вечер",
      "thanks": "Спасибо",
      "thank you": "Спасибо",
      "thank you very much": "Большое спасибо",
      "bye": "Пока",
      "goodbye": "До свидания",
      "best regards": "С уважением",
      "regards": "С уважением",
    },
  },
};

function normalize(text) {
  return (text || "").trim().toLowerCase().replace(/[!.,;:…\s]+$/u, "").trim();
}

/**
 * @param {string} text  a whole text block / segment
 * @param {string} from  source 2-letter code
 * @param {string} to    target 2-letter code
 * @returns {string|null} a direct translation, or null to fall through to NMT
 */
export function lookupPhrase(text, from, to) {
  const norm = normalize(text);
  if (!norm) return null;
  return BOOK[from]?.[to]?.[norm] ?? null;
}
