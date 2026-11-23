'use strict';

const player = document.querySelector('#player');
const canvas = document.querySelector('#canvas');
const startScreen = document.querySelector('#start-screen');
const play = document.querySelector('#play');
const status = document.querySelector('#status');
const displayStatus = document.querySelector('#display-status');
const fullscreen = document.querySelector('#fullscreen');
const mouseHint = document.querySelector('#mouse-hint');

const engineDirectory = 'vendor/dwasm/';
const wadName = 'freedoom2.wad';
const requestPointerLock = canvas.requestPointerLock?.bind(canvas);
let state = 'idle';

// SDL requests pointer lock during startup. Let the explicit canvas click
// request it instead, while keeping SDL's pointer-lock change listener intact.
if (requestPointerLock) canvas.requestPointerLock = () => {};

function announce(element, message) {
  element.textContent = message;
  element.hidden = !message;
}

function showRestart(message) {
  state = 'finished';
  if (document.pointerLockElement === canvas) document.exitPointerLock();
  announce(status, message);
  startScreen.hidden = false;
  play.textContent = 'Reload game';
  play.hidden = false;
  play.focus();
}

function captureMouse() {
  if (state !== 'playing' || document.pointerLockElement === canvas || !requestPointerLock) return;
  try {
    const request = requestPointerLock();
    request?.catch(() => {}); // Browsers require a fresh activation after Esc.
  } catch {
    // Keyboard turning remains available when mouse capture is blocked.
  }
}

window.Module = {
  canvas,
  arguments: ['-iwad', '/' + wadName, '-window', '-geom', '960x540w'],
  locateFile: (name) => engineDirectory + name,
  setStatus(message) {
    if (state === 'loading') announce(status, message ? 'Starting Freedoom…' : '');
  },
  onAbort(reason) {
    console.error(reason);
    showRestart('The game could not start. Reload the page and try again.');
  },
  hideConsole() {
    state = 'playing';
    startScreen.hidden = true;
    announce(status, '');
    canvas.focus({preventScroll: true});
  },
  softExit(code) {
    showRestart(code === 0 ? 'Game ended.' : 'The game stopped. Reload the page to try again.');
  }
};

play.addEventListener('click', async () => {
  if (state === 'finished') {
    location.reload();
    return;
  }
  if (state !== 'idle') return;
  state = 'loading';
  play.hidden = true;
  announce(status, 'Loading campaign…');

  try {
    const response = await fetch('data/' + wadName);
    if (!response.ok) throw new Error('Campaign download failed: ' + response.status);
    let wad = new Uint8Array(await response.arrayBuffer());
    if (wad.length !== 28787748 || new TextDecoder().decode(wad.subarray(0, 4)) !== 'IWAD') {
      throw new Error('Invalid Freedoom campaign data');
    }

    window.Module.onRuntimeInitialized = () => {
      // Dwasm exposes its Emscripten filesystem to the page before main().
      FS.writeFile('/' + wadName, wad, {canOwn: true});
      wad = null;
      announce(status, 'Starting Freedoom…');
    };

    const script = document.createElement('script');
    script.src = engineDirectory + 'index.js';
    script.onerror = () => showRestart('The game engine could not load. Reload the page and try again.');
    document.head.append(script);
  } catch (error) {
    console.error(error);
    showRestart('The campaign could not load. Reload the page and try again.');
  }
});

canvas.addEventListener('click', () => {
  canvas.focus({preventScroll: true});
  captureMouse();
});
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

document.addEventListener('pointerlockchange', () => {
  mouseHint.textContent = document.pointerLockElement === canvas
    ? 'Mouse captured. Press Esc to release.'
    : 'Click the game to capture the mouse.';
});

async function toggleFullscreen() {
  if (!document.fullscreenEnabled) return;
  try {
    if (document.fullscreenElement === player) {
      await document.exitFullscreen();
    } else {
      await player.requestFullscreen();
    }
    if (state === 'playing') canvas.focus({preventScroll: true});
    announce(displayStatus, '');
  } catch {
    announce(displayStatus, 'Full screen is unavailable in this browser window.');
  }
}

fullscreen.hidden = !document.fullscreenEnabled;
fullscreen.addEventListener('click', toggleFullscreen);

document.addEventListener('fullscreenchange', () => {
  const active = document.fullscreenElement === player;
  fullscreen.querySelector('span').textContent = active ? 'Exit full screen' : 'Full screen';
  if (!active && document.pointerLockElement === canvas) document.exitPointerLock();
});

window.addEventListener('keydown', (event) => {
  const playerFocused = player.contains(document.activeElement) || document.fullscreenElement === player;
  if (!playerFocused || !document.fullscreenEnabled || event.code !== 'KeyV' ||
      event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  if (!event.repeat) void toggleFullscreen();
}, {capture: true});

canvas.addEventListener('keydown', (event) => {
  // Tab opens the map. Shift+Tab can move focus out of the canvas.
  if (state === 'playing' && event.key === 'Tab' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
    event.preventDefault();
  }
});
