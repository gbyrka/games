# Freedoom: Phase 2

Standalone browser player at `/games/freedoom/`. Play loads the local campaign
and engine. Dwasm stores saves in the current origin's IndexedDB.

## Upstream build and game data

* `data/freedoom2.wad` is from the
  [Freedoom 0.13.0 release](https://github.com/freedoom/freedoom/releases/tag/v0.13.0).
  SHA-256: `a8772e088847032510d97ba2312406a6998f21cbab44d4ff10696faa9c0ecd4b`.
* `vendor/dwasm/index.{js,wasm,data}` are the gzip-decoded upstream Dwasm 2.2.0
  web files, built April 17, 2026. The bundled source archive is upstream
  revision [ddf0347](https://github.com/GMH-Code/Dwasm/tree/ddf0347a4fc115b11ffb1c5710768b7c47c46698),
  whose README documents the Emscripten build and its dependencies.
* The in-page [credits](credits.html) link to both licenses and the source.

To run locally, start `node gbyrka.github.io/tools/preview.mjs` from the
workspace root and open `http://127.0.0.1:8000/games/freedoom/`.
