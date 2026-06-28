// Shared web-ext config: keep dev/doc/source files out of the built package and
// out of lint runs (run via `npx web-ext lint` / `npx web-ext build`). Only the
// bundled outputs (franc.bundle.js, content.bundle.js) and runtime modules ship.
module.exports = {
  ignoreFiles: [
    "README.md",
    "README_RU.md",
    "PROJECT_NOTES.md",
    "THIRD_PARTY.md",
    "run_addon.sh",
    "web-ext-config.cjs",
    "web-ext-artifacts",
    "assets",
    "assets/**",
    ".gitignore",
    ".git",
    ".git/**",
    "package.json",
    "package-lock.json",
    "node_modules",
    "node_modules/**",
    "test",
    "test/**",
    "_*.mjs",
    "**/_*.mjs",
    "lang/franc-entry.js",
    "content/content-entry.js",
    "compose/compose-entry.js",
    "engine/vendor/main.js",
    "engine/vendor/worker/package.json",
    "icons/icon.png",
    "icons/glassmorphism_variant.png",
  ],
};
