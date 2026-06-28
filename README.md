<div align="center">

<img src="assets/icon-128.png" width="96" alt="Email Translator logo">

<h1>Email Translator — Translate Offline &amp; Private</h1>

<p><strong>Private, on-device email translation for Thunderbird.</strong></p>

<p>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-green.svg"></a>
  <a href="https://www.thunderbird.net/"><img alt="Thunderbird 115+" src="https://img.shields.io/badge/Thunderbird-115%2B-1373d9"></a>
  <a href="https://github.com/LLC-BigInt/thunderbird-email-translator/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/LLC-BigInt/thunderbird-email-translator?label=release"></a>
  <a href="https://www.payments.bigint.pro/donate"><img alt="Donate" src="https://img.shields.io/badge/%E2%99%A5-Donate-ff5e5e"></a>
</p>

<p><b>English</b> · <a href="README_RU.md">Русский</a></p>

</div>

A [Thunderbird](https://www.thunderbird.net/) add-on that translates your email
**on your device**. Message content never leaves your computer — there is no cloud,
no account, and no tracking. Open a message, pick a language, and the body is
translated **in place, keeping the original layout** (the same way Firefox translates
a web page).

Powered by **[Bergamot](https://github.com/browsermt/bergamot-translator)** — the
WASM neural-translation engine behind Firefox Translations.

## Screenshots

<p align="center">
  <a href="assets/screenshot-1.png"><img src="assets/screenshot-1.png" width="150" alt="Screenshot 1"></a>
  <a href="assets/screenshot-2.png"><img src="assets/screenshot-2.png" width="150" alt="Screenshot 2"></a>
  <a href="assets/screenshot-3.png"><img src="assets/screenshot-3.png" width="150" alt="Screenshot 3"></a>
  <a href="assets/screenshot-4.png"><img src="assets/screenshot-4.png" width="150" alt="Screenshot 4"></a>
  <a href="assets/screenshot-5.png"><img src="assets/screenshot-5.png" width="150" alt="Screenshot 5"></a>
</p>

<sub><i>Click any image to enlarge.</i></sub>

---

## Features

- **Private & offline.** Translation runs locally. Only the language model is
  downloaded once (on first use of a pair), then everything is offline.
- **Translate the message body** in place, with a **Show original** toggle.
- **Translate while composing** — select text in the composer and translate it in
  place.
- **Translate PDF attachments** — renders each page and overlays the translated text
  on the original layout.
- **Auto-detect foreign mail** — offers (or auto-runs) translation for incoming
  messages in a language you don't read.
- **Skips quotes & signatures** so replies stay clean.
- **Many languages**, with automatic **English-pivot** for pairs without a direct
  model (e.g. `ru→de` = `ru→en→de`).
- **Model manager** in settings — see cached models, sizes, and clear them anytime.

---

## Install

### From Thunderbird Add-ons (recommended)
Search **“Email Translator”** in Thunderbird → *Add-ons and Themes*, or install from
[addons.thunderbird.net](https://addons.thunderbird.net/). Updates come automatically.

### From a release `.xpi`
1. Download the latest `email-translator-<version>.xpi` from the
   [**Releases**](https://github.com/LLC-BigInt/thunderbird-email-translator/releases/latest)
   page.
2. In Thunderbird: **Settings ▸ General ▸ Config Editor** → set
   `xpinstall.signatures.required` to `false` (release builds here are unsigned;
   signed copies come from the store).
3. **Add-ons and Themes ▸ ⚙ ▸ Install Add-on From File…** → pick the `.xpi`.

**Requires Thunderbird 115 or newer.**

---

## Usage

1. Open a message → click **Translate…** in the header (or right-click the body →
   **Translate…**).
2. Choose the target language and click **Translate**. The first use of a language
   pair downloads its model (a few seconds); after that it's instant and offline.
3. Use **Show original / Show translation** in the bar to toggle, or **✕** to close.

Other entry points: right-click a selection while composing → **Translate selection
to ▸ <language>**; right-click a PDF attachment → **Translate PDF…**. Manage default
language and cached models on the add-on's **options page**.

---

## Build from source

Runtime dependencies are **bundled** into the package; `node_modules` is dev-only.

```bash
npm install         # dev tooling (esbuild, web-ext, test deps)
npm test            # unit tests (node --test)
npm run bundle      # rebuild bundled scripts after editing lang/ content/ compose/
npm run lint:ext    # web-ext lint
npm run build:ext   # build → web-ext-artifacts/email-translator-<version>.xpi
./run_addon.sh      # launch in Thunderbird via web-ext for development
```

For development you can also load it unbuilt: Thunderbird → **Tools ▸ Developer
Tools ▸ Debug Add-ons** → **Load Temporary Add-on…** → pick `manifest.json`.

### Project layout
```
manifest.json   MV2 manifest (min TB 115)
background.js   menus, popup routing, detect + translate orchestration
popup/          language-picker popup
content/        message-body block extraction + in-place translation & toggle
compose/        translate selection in the composer
pdf/            PDF attachment viewer with translated overlay
engine/         Bergamot WASM engine wrapper + IndexedDB model cache
lang/           language list, ISO mapping, offline detection (franc)
models/         model registry + IndexedDB storage
options/        default language, model manager, donate
```

---

## Privacy

The text of your email is **never sent anywhere**. The only network request is the
one-time download of a translation model from the public Bergamot model bucket on
first use of a language pair; models are then cached locally in IndexedDB and reused
offline. No analytics, no accounts, no tracking.

---

## Third-party code

Vendored libraries (disclosed in [`THIRD_PARTY.md`](THIRD_PARTY.md)):

- **Bergamot** translator + WASM worker — MPL-2.0
- **pdf.js** — Apache-2.0
- **franc** language detection — MIT

## License

[MIT](LICENSE) © BigInt

## Support & donations

This add-on is free. If it helps you, you can support development at
**[payments.bigint.pro/donate](https://www.payments.bigint.pro/donate)**.
Issues and contributions are welcome on
[GitHub](https://github.com/LLC-BigInt/thunderbird-email-translator/issues).
