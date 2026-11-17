# POP — credits and pinned components

This page runs **Prince of Persia for MS-DOS, version 1.0**, by Jordan Mechner,
originally published by Brøderbund. The original title, copyright notice,
graphics, sound, level data, game logic and executable are retained.

## Original game data

Archive source: [Internet Archive — Prince of Persia (1990)](https://archive.org/details/msdos_Prince_of_Persia_1990).

- Original archive: `Prince_of_Persia_1990.zip`.
- SHA-256: `a07ef61798ee7b08a54aec7686503e088e29fa665eec31db0dcf46a648580495`.
- 26 required DOS files are copied byte-for-byte into `data/prince-dos.zip`.
- Installer executables, desktop configuration and archive launcher files are
  omitted. No game executable, sprite, sound or level data is patched.
- `LEVELS.DAT` contains resource IDs 2000–2015: the campaign and its additional
  demo/special level records. They are all included.
- Individual file sizes and hashes: [data/manifest.json](data/manifest.json).

The repository's MIT license does not apply to the original game files.
The game's original attribution and notices are preserved.

## Emulator

Uses the **DOSBox backend of js-dos emulators 8.5.3**, by Alexander Guryanov
and the DOSBox/js-dos contributors, under GPL-2.0. It runs locally in a Web
Worker using WebAssembly. No hosted player service, API key or CDN is used.

- [Source repository](https://github.com/js-dos/emulators).
- [Pinned npm source package](https://registry.npmjs.org/emulators/-/emulators-8.5.3.tgz).
- Runtime build identity: `8.5.3 (aeecd448025fcd8fc2843a780660a8f7)`.
- Package SHA-256: `800538dce814cbeed75a54e98ba6db9248ab5d9fb598b1b0cf1e6fe82b6f9c58`.
- License: [vendor/COPYING.txt](vendor/COPYING.txt).
- The unmodified TypeScript source map is included as `vendor/emulators.js.map`.
  The upstream repository includes the DOSBox sources and build instructions.
- Vendored runtime files and hashes are listed in `data/manifest.json`.

The browser-shell JavaScript in this directory is GPL-2.0-or-later, as marked
in its source headers. The rest of the catalog retains its existing license.

## Reproduction

`python3 tools/prepare.py` downloads the two pinned archives, verifies their
SHA-256 values, copies the emulator runtime, validates the complete level
resource directory and writes a deterministic game zip and manifest. Python 3
is a development tool only; the published page is entirely static.
