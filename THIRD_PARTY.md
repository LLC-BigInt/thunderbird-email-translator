# Third-party components & build reproducibility (for ATN review)

Mail Translator is MIT-licensed (see `LICENSE`). It bundles the following
third-party components, each under its own license:

| Component | Location in package | License | Source |
|-----------|--------------------|---------|--------|
| `@browsermt/bergamot-translator` (WASM NMT engine + worker, incl. `bergamot-translator-worker.wasm`) | `engine/vendor/` | MPL-2.0 | npm `@browsermt/bergamot-translator` |
| `pdf.js` (`pdfjs-dist`, legacy build, minified by upstream) | `pdf/vendor/pdf.min.mjs`, `pdf/vendor/pdf.worker.min.mjs` | Apache-2.0 | npm `pdfjs-dist` |
| `franc` (language detection) | bundled into `lang/vendor/franc.bundle.js` | MIT | npm `franc` |

The default Bergamot model registry/host is
`https://bergamot.s3.amazonaws.com/models/index.json`; model files download on
first use of a language pair and are cached in IndexedDB (offline thereafter).
No user content is ever sent to any server — translation runs fully on-device.

## Generated / bundled files and how to reproduce them

These files in the package are **build outputs**, generated from source in this
repository with [esbuild](https://esbuild.github.io/):

| Generated file | Built from |
|----------------|-----------|
| `lang/vendor/franc.bundle.js` | `lang/franc-entry.js` (re-exports npm `franc`) |
| `content/content.bundle.js` | `content/content-entry.js` → `content/dom.js`, `lang/auto.js` |
| `compose/compose.bundle.js` | `compose/compose-entry.js` → `content/dom.js` |

To reproduce from a clean checkout:

```bash
npm install        # dev tooling only (esbuild, web-ext, jsdom, fake-indexeddb, franc)
npm run bundle     # regenerates the three *.bundle.js files above
npm test           # 62 unit tests
npm run build:ext  # produces the submitted .xpi in web-ext-artifacts/
```

`engine/vendor/` and `pdf/vendor/` are vendored verbatim from the npm packages
named above (not modified). `node_modules` are dev-only and are **not** shipped;
all runtime code is bundled/vendored into the package.

## Known validator warnings (all expected — 0 errors)

- **"Invalid permissions" for `messagesModify` / `messagesRead` / `compose`** and
  **"API not supported"** for `composeScripts`, `messageDisplay*`, `messageDisplayAction.openPopup`,
  `messages.getAttachmentFile` — these are **Thunderbird** permissions/APIs; the Firefox-based
  linter doesn't know them. They are valid and required for a mail extension.
- **"Unsafe assignment to innerHTML"** (`content/dom.js`, `lang/caps.js`, `background.js`,
  bundles) — inherent to translating a message *in place*: we replace a block's HTML with its
  translated HTML (and read a block's text via a detached `<template>`). Content originates from
  the already-rendered message; no external/user-injected HTML is introduced.
- **`eval` / `Function` constructor / dynamic `import`** — only inside the vendored libraries
  (`engine/vendor/worker/…` Bergamot WASM glue, `pdf/vendor/pdf*.min.mjs`), unmodified upstream.
