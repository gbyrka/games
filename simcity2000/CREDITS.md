# SimCity 2000 — credits and pinned components

Runs **SimCity 2000 for MS-DOS, version 1.01**, by Maxis. The original game
executable, graphics, music, effects, simulation, example cities and all 15
scenarios supplied on this CD are retained. This is the full 1994 UK CD-ROM
edition, rather than the playable demo or a recreation of its simulation.

## Original installation

Source: [Internet Archive — original 1994 Maxis UK CD-ROM](https://archive.org/details/sc2kcd_en).

- Original ISO: `sc2kcd_en.iso`, 3,727,360 bytes.
- SHA-256: `08c287767a0030ed2e3906333ba8fe943d6cd18f991729bd5eaafd7264bd194e`.
- CD label: `SC2KUKENG`, “PC CD-ROM VERSION 1.0”. The installed game identifies
  itself as **1.01**.
- Installed with the original `INSTALL.EXE`: VESA Super VGA, Sound Blaster 16
  music and sound effects, default SimMayor / SimBusiness installation fields.
- All 134 installed files are included byte for byte. No game binary patch,
  replacement asset, demo executable or modified simulation is used.
- Game bundle SHA-256:
  `9bafe4cc3168dd8388e4ad32e4d8219404410448273dba6acb30c399f1653a6a`.
- Per-file and runtime sizes/hashes: [data/manifest.json](data/manifest.json).

The game's original attribution and notices are preserved. The repository's
MIT license and the emulator's GPL do not apply to the original game files.

## Emulator and browser code

**js-dos emulators 8.5.3**, DOSBox WebAssembly backend, by Alexander Guryanov
and the DOSBox/js-dos contributors, GPL-2.0.

- [Upstream source and build instructions](https://github.com/js-dos/emulators).
- [Pinned upstream package](https://registry.npmjs.org/emulators/-/emulators-8.5.3.tgz).
- Package SHA-256: `800538dce814cbeed75a54e98ba6db9248ab5d9fb598b1b0cf1e6fe82b6f9c58`.
- Runtime build: `8.5.3 (aeecd448025fcd8fc2843a780660a8f7)`.
- Unmodified runtime and TypeScript source map are hosted in `vendor/`.
- [Emulator license](vendor/COPYING.txt).

The browser-shell JavaScript is GPL-2.0-or-later, as marked in source headers.
City file validation follows the original IFF envelope; background reference:
[OpenCity2k's independently researched file specification](https://github.com/OpenCity2k/SC2k-docs/blob/master/sc2%20file%20spec.md).
The original DOS executable reads, writes and interprets actual city contents.
