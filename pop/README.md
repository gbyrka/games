# POP

An unlisted, standalone entry at **https://mod-it.games/games/pop/**.
It runs the original **Prince of Persia for DOS 1.0**, with all its original
game files, inside a locally hosted DOSBox/WebAssembly emulator. No gameplay,
enemy behavior, animation sequence, trap, sound or level has been reimplemented.

The source archives are pinned and their hashes checked. All 26 packaged DOS
files are unmodified, and all 16 records in the original `LEVELS.DAT` are included
(campaign, demo and special records). Details: [CREDITS.md](CREDITS.md).

## Run locally

Serve the parent workspace:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open <http://localhost:8765/games/pop/>. The site must be served over HTTPS or
localhost for Web Crypto and AudioWorklet. Current Chrome, Firefox, Edge and
Safari with a physical keyboard are the target. A software keyboard is not
provided.

## Play

- Choose **Start**, then use the original title-screen controls to begin.
- Arrow keys move, jump, climb, crouch and parry. Shift walks carefully, grabs
  ledges, drinks potions and attacks. Both Shift keys and the numeric keypad are
  forwarded. The Controls dialog includes original shortcuts.
- Click the game screen to focus keyboard input. While the screen has focus,
  game shortcuts are prevented from scrolling or reloading the page where the
  browser permits interception. Toolbar buttons also cover save/load when a
  browser reserves Ctrl+L for the address bar.
- **Pause** suspends the emulator. Switching tabs or losing window focus also
  pauses it and releases all held keys; returning requires Resume. The original
  Escape pause is still forwarded to the game independently.
- The sound device can be **AdLib** or **PC Speaker**. Changing hardware takes
  effect on the next restart. Sound on/off mutes the emulator without modifying
  game data. Audio playback uses js-dos's official AudioWorklet, including its
  buffering/resampling for the browser's output sample rate.
- Native fullscreen is supported. The display uses crisp pixel scaling and a
  4:3 presentation, matching a DOS VGA display rather than square-pixel 8:5.

## Original checkpoints

The original game saves on **levels 3–13**. Save checkpoint sends Ctrl+G and
preserves the original eight-byte `PRINCE.SAV` in first-party local storage.
Native Ctrl+G is also detected; a periodic check catches changes to the file.

A checkpoint preserves the level, remaining time and beginning-of-level health,
not the exact room/animation state. **Continue** loads this file into DOS before
launch and sends the original Ctrl+L at the title screen. **Load checkpoint**
restarts the emulator and performs the same operation, because this DOS version
loads only from its title screen. Restart does not delete the saved checkpoint.
Browser storage refusal does not prevent play; failed saves display an error.

Save key: `mod-it:pop:dos10:checkpoint1`. Preferences key:
`mod-it:pop:preferences1`. The save is validated against the original structure
before loading. Clearing site data removes the save. High-score files and full
emulator RAM snapshots are not persisted by this shell.

## Architecture and fidelity

- `session.mjs` lazily loads unmodified, local `emulators 8.5.3`, verifies the
  game bundle SHA-256 and starts DOSBox in a worker. Video frames are copied
  directly to the canvas. Keyboard events are forwarded as js-dos key codes.
- `settings.mjs` selects VGA, normal 386 emulation at a fixed **3000 cycles**,
  no frame skipping, and the selected sound hardware. The original executable
  runs with `adlib` or `stdsnd`; no cheats, demo mode or game fixes are enabled.
- `app.mjs` provides loading/error states, focus, pause, restart, sound, help,
  fullscreen and checkpoint controls. No game logic is implemented in the shell.
- No account, application backend, third-party runtime download, tracking or
  advertising is required. The initial page does not download the emulator or
  game until Start is chosen. Runtime assets total roughly 2 MB before HTTP
  compression. External source sites are used only by the development rebuild.

Using the original executable retains its rules and algorithms. This does not
establish cycle-for-cycle equivalence with every historical PC: browser input
latency, audio buffering, monitor aspect and the chosen emulated CPU profile can
affect the experience. No claim is made that every level has been manually
played through end to end on every browser.

## Deployment

Commit/deploy this directory as part of the **games** repository root. Existing
project-site routing places it at `/games/pop/`. There is no catalog card,
homepage link or sitemap addition, and the entry has `noindex,nofollow`; knowing
the URL is sufficient to open it. It is unlisted, not password protected.

`pop/config.json` owns this page's release independently of the catalog. Before
deploying changes to the shell, increment its version. The boot loader reads
configuration without caching, versions the CSS/modules together and installs
an import map so dependencies use the same release. Emulator assets are pinned
to version 8.5.3. Include the `data/`, `vendor/`, credits and license files.
No site settings, remote branches or deployment are changed by this work.

## Checks

```sh
python3 pop/tests/assets.test.py
node --test --test-isolation=none pop/tests/shell.test.mjs
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node pop/tests/browser.mjs
```

Run from the games repository root. Playwright is a development dependency only.
Set `POP_ENGINE=webkit` to run the browser scenarios in WebKit. Screenshots are
saved in gitignored `pop/test-results/`.

Asset tests verify the complete level-resource directory and every original
file/runtime hash. Shell tests verify keyboard mapping/release, sound config,
checkpoint corruption and denied storage. Browser tests use the real DOS binary,
video, native keyboard and AudioWorklet; check movement, AdLib/PC Speaker sound,
pause/fullscreen, original level-3 save/continue, storage refusal and a damaged
download. Only a test-created instance enables the original binary's level-skip
mode to reach level 3; production contains no test API or altered game binary.

## Rebuild assets

```sh
python3 pop/tools/prepare.py
```

Pinned downloads are cached in `/tmp/pop-build` by default; `--cache` changes
that directory. Rebuilding produces identical file and bundle hashes.
