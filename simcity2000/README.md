# SimCity 2000 for the browser

Full **DOS version 1.01**, installed from the original 1994 Maxis UK CD-ROM.
Original game logic, graphics, music, sound effects, example cities and all 15
supplied scenarios run inside locally hosted DOSBox/WebAssembly. No account,
backend, hosted player, CDN, advertising or telemetry is required.

Direct route after deployment: **https://mod-it.games/games/simcity2000/**.
The page has `noindex,nofollow` and is absent from the catalog and its release
configuration. A direct link is unlisted, not password protection. No build is
required for publication: include this directory in the existing `games` Pages
repository; `.nojekyll` is already present. No deployment is performed by the
local preparation tools.

## Preview

Serve the parent directory of this repository:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open http://localhost:8765/games/simcity2000/. Use HTTPS on a public host;
`localhost` also supports the required WebAssembly, Web Audio and checksum APIs.
Current desktop Chromium and Safari/WebKit are the primary targets. A tablet
with a keyboard and mouse can use the same controls. Small touch-only screens
are not the target interface.

## Cities and files

- **Save city** sends the original **Alt+S** command. Close an in-game newspaper,
  budget or other dialog first. If the game asks for a name, confirm it there.
- The original “Game Saved As” confirmation leaves the city file open with a
  zero IFF length. The shell recognises that exact DOS 1.01 confirmation and
  dismisses it before reading the completed file. Partial writes are ignored.
- The resulting native **.SC2** file downloads to the computer. **Saved cities**
  offers another Download button, as well as Open. Repeated saves are supported.
- **Open city file** validates a file from the computer, assigns a collision-free
  DOS 8.3 name under `C:\SC2000\SAVES`, restarts the original program and opens
  it through its original title-screen Load dialog. Existing gameplay gets a
  replace confirmation first. Save current changes before opening another city.
- Complete saved files are also kept in IndexedDB and restored into DOS when
  starting again. This keeps multiple cities independently. Private mode,
  blocked storage, storage clearing or eviction can remove browser copies;
  downloaded files remain portable. If storage is unavailable, the file controls
  still work and Saved cities explains that its list lasts for this session.
- A browser copy captures the last **in-game save**, not current emulator RAM.
  Opening the page does not automatically resume an unsaved city.
- Imports are bounded to 2 MB and checked for a complete `FORM` / `SCDH` IFF
  envelope, essential city sections and the 128×128 altitude map. Scenario `.SCN`
  files and executable files are rejected. Game data is never parsed as HTML.

## Controls

Use the original mouse tools and menus. Click and drag roads/zones; hold and
drag in the menu bar to choose an item. Right-click in the map centres the view. Shift-click queries a building
or opens a tool's help. Ctrl temporarily selects the bulldozer. Arrow keys pan;
Home/End zoom; Delete/Page Down rotate. Alt+S saves, Alt+L loads, Alt+P pauses the
simulation, and Alt+1/2/3 select its speeds. The browser's Pause button freezes
all emulation; changing tabs also pauses and releases held inputs.

Click the canvas to restore keyboard focus. Help and Saved cities pause the
emulator while open. The Sound button mutes the browser output; original Music
and Sound Effects options remain in the game's Options menu. Fullscreen keeps
correct 4:3 geometry and mouse coordinates.

## Architecture

- `session.mjs`: verified local bundle, worker lifecycle, SVGA frames, original
  audio, DOS keyboard/mouse input, completed city file reads and title loading.
- `settings.mjs`: DOS key codes and the SVGA S3 / 16 MB / Sound Blaster 16
  configuration. Uses the normal CPU core at 20,000 cycles; no demo or cheat flag.
- `app.mjs`: minimal player, pause/focus, dialogs, file download/import and save
  monitoring. It does not simulate or redraw the game's city.
- `cities.mjs`, `storage.mjs`: safe city envelopes, filenames and optional local
  storage. Byte-for-byte exports are original DOS saves, not a new save format.
- `config.json`: independent versioned module release. Bump this version when
  changing game shell files; the catalog version is unaffected.

[Credits and source provenance](CREDITS.md) and [the manifest](data/manifest.json)
record the original full-edition source and all pinned game/runtime hashes.
The 1994 edition predates Special Edition's extra tools; this bundle represents
that full CD edition, not every later rerelease or expansion.

## Reproduce the installed game bundle

Python 3 and Node with Playwright are development dependencies only. The pinned
runtime is already vendored; no dependency installation is needed to play.

```sh
python3 tools/prepare.py --cache /tmp/sc2k-build
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tools/install.mjs /tmp/sc2k-build
python3 tools/prepare.py --cache /tmp/sc2k-build --installed /tmp/sc2k-build/full
```

The first step verifies the original ISO hash and prepares its unchanged CD
files. The second runs the original installer with VESA/Sound Blaster choices
and exports its installed files. The final step checks every file against the
verified manifest and recreates the deterministic ZIP, including all ancestor
directories required by the emulator's extractor. It refuses changed output.

## Verification

```sh
node tests/shell.test.mjs
python3 tests/assets.test.py
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser.mjs
SC2K_ENGINE=webkit SCREENSHOT_DIR=/tmp/sc2k-webkit \
  PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser.mjs
```

The browser test uses real DOSBox/WASM and the original unmodified game; only
observability is injected in the test browser. It covers audio, creating a new
city, actual mouse-drag construction, original city data and costs, simulation,
portable files in a fresh browser, local restoration, blocked storage, pause,
fullscreen, input and failed downloads. Screenshots and downloaded test cities
are ignored under `test-results/`. It does not certify every scenario objective,
every disaster or arbitrary third-party save compatibility.

Validation on 2026-11-17: 7 shell/file tests and 2 asset tests passed. All 8
browser scenarios were verified in Chromium and WebKit, including audible
construction effects with music off and repeated unchanged saves. The last two
(storage-denied and damaged-file cases) were rerun separately after correcting
an asynchronous dialog wait in the test. Reinstalling from the pinned ISO also
reproduced all 134 installed files and the bundle SHA-256 exactly.
