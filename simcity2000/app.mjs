// SPDX-License-Identifier: GPL-2.0-or-later
import { DosSession } from './session.mjs';
import { CityStore, readPreferences, writePreferences } from './storage.mjs';
import { inspectCity, dosName, sameBytes, MAX_CITY_BYTES } from './cities.mjs';

const $ = id => document.getElementById(id), canvas = $('screen');
const store = await new CityStore().open(), prefs = readPreferences();
let session = null, state = 'idle', snapshot = new Map(), captureTask = null;
let pollTimer, statusTimer, exportPending = false, pendingCity = null, dialogWasPlaying = false, fileWasPlaying = false;
let pointer = null;

function status(text, error = false) {
  clearTimeout(statusTimer); $('status').textContent = text; $('status').classList.toggle('error', error);
  if (!error && text) statusTimer = setTimeout(() => { $('status').textContent = ''; }, 15000);
}
function render() {
  document.body.dataset.state = state;
  const ready = ['playing', 'paused'].includes(state), paused = state === 'paused';
  $('overlay').hidden = state === 'playing'; $('start').hidden = !['idle', 'ended', 'error'].includes(state); $('resume').hidden = !paused;
  $('overlay-title').textContent = state === 'loading' ? 'Loading…' : paused ? 'Paused' : state === 'ended' ? 'Game closed' : state === 'error' ? 'Unable to start' : 'SimCity 2000';
  $('overlay-detail').textContent = state === 'idle' ? 'Mouse and keyboard' : state === 'error' ? 'Try Start again or reload the page.' : '';
  $('pause').disabled = !ready; $('pause').textContent = paused ? 'Resume' : 'Pause'; $('pause').setAttribute('aria-pressed', String(paused));
  $('save').disabled = !ready; $('restart').disabled = !ready; $('open-file').disabled = state === 'loading'; $('cities-button').disabled = state === 'loading';
  $('mute').textContent = prefs.muted ? 'Sound off' : 'Sound on'; $('mute').setAttribute('aria-pressed', String(!prefs.muted));
}
function focusGame() { if (state === 'playing') canvas.focus({ preventScroll: true }); }
function releasePointer() { const captured = pointer; pointer = null; if (captured !== null && canvas.hasPointerCapture(captured)) canvas.releasePointerCapture(captured); }
function pause() { if (state !== 'playing') return; session.pause(); releasePointer(); state = 'paused'; render(); }
function resume() { if (state !== 'paused') return; session.resume(); session.mute(prefs.muted); state = 'playing'; render(); focusGame(); }

function download(record) {
  const url = URL.createObjectURL(new Blob([record.bytes], { type: 'application/octet-stream' }));
  const link = document.createElement('a'); link.href = url; link.download = record.path.split('/').at(-1); document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
async function capture() {
  if (captureTask) return captureTask;
  if (!session?.ci || !['playing', 'paused'].includes(state)) return;
  const current = session;
  captureTask = (async () => {
    const committed = exportPending ? await current.finishSave() : [];
    const forced = new Set(committed.map(file => file.path));
    const files = [...committed, ...await current.cityFiles()];
    for (const file of files) {
      if (session !== current) return;
      if (sameBytes(snapshot.get(file.path), file.bytes) && !forced.has(file.path)) continue;
      forced.delete(file.path);
      snapshot.set(file.path, file.bytes);
      const record = await store.put(file.path, file.bytes);
      if (exportPending) { download(record); exportPending = false; }
      status(store.durable ? `${file.path.split('/').at(-1)} saved. Download again from Saved cities.` : `${file.path.split('/').at(-1)} saved for this session. Download it to keep a copy.`);
    }
  })();
  try { await captureTask; } catch (error) { status(error.message, true); } finally { captureTask = null; }
}
async function start(city = null) {
  if (state === 'loading') return;
  await capture(); state = 'loading'; render(); status(''); clearInterval(pollTimer); exportPending = false;
  const previous = session; session = null; await previous?.close();
  const next = new DosSession(canvas, {
    onExit: () => { if (session === next) { state = 'ended'; clearInterval(pollTimer); render(); } },
    onError: message => { if (session === next) status(message, true); },
  });
  session = next;
  try {
    await next.start(store.list());
    if (session !== next) return;
    snapshot = new Map((await next.cityFiles()).map(file => [file.path, file.bytes]));
    next.mute(prefs.muted);
    if (city) await next.openCity(city.path);
    state = 'playing'; render(); focusGame();
    pollTimer = setInterval(() => void capture(), 1500);
    if (document.hidden) pause();
  } catch (error) {
    if (session === next) { clearInterval(pollTimer); void next.close(); state = 'error'; render(); status(error.message, true); }
  }
}
async function save() {
  if (!session?.ci) return;
  if (state === 'paused') resume();
  exportPending = true; status('Confirm Save in the game. Your .SC2 file will download after the save.');
  await session.shortcut('S'); focusGame();
}
function showDialog(id) { dialogWasPlaying ||= state === 'playing'; pause(); $(id).showModal(); }
function closeDialog(node, restore = true) { node.close(); if (restore && dialogWasPlaying) resume(); if (restore) dialogWasPlaying = false; }
function chooseCity(record) {
  pendingCity = record;
  if (['playing', 'paused'].includes(state)) { $('replace-name').textContent = record.name || record.path.split('/').at(-1); showDialog('replace-dialog'); }
  else { pendingCity = null; void start(record); }
}
async function listCities() {
  await capture();
  const list = $('city-list'); list.replaceChildren();
  $('storage-note').textContent = store.durable ? 'Saved in this browser. Download .SC2 files to keep a copy or move to another device.' : 'Browser storage is unavailable. Download .SC2 files to keep your cities after closing this page.';
  for (const record of store.list()) {
    const row = document.createElement('div'); row.className = 'city-row';
    const label = document.createElement('div'), name = document.createElement('strong'), detail = document.createElement('small');
    name.textContent = record.name || record.path.split('/').at(-1);
    detail.textContent = `${record.path.split('/').at(-1)} · ${new Date(record.updated).toLocaleString()}`;
    label.append(name, detail);
    const open = document.createElement('button'); open.type = 'button'; open.textContent = 'Open';
    open.addEventListener('click', () => { closeDialog($('cities-dialog'), false); chooseCity(record); });
    const save = document.createElement('button'); save.type = 'button'; save.textContent = 'Download'; save.addEventListener('click', () => download(record));
    row.append(label, open, save); list.append(row);
  }
  if (!store.list().length) { const empty = document.createElement('p'); empty.className = 'city-empty'; empty.textContent = 'No saved cities yet. Save a city in the game or open a .SC2 file.'; list.append(empty); }
  showDialog('cities-dialog');
}

$('start').addEventListener('click', () => void start()); $('resume').addEventListener('click', resume);
$('pause').addEventListener('click', () => state === 'playing' ? pause() : resume()); $('save').addEventListener('click', () => void save());
$('restart').addEventListener('click', () => showDialog('restart-dialog'));
$('confirm-restart').addEventListener('click', () => { closeDialog($('restart-dialog'), false); dialogWasPlaying = false; void start(); });
$('open-file').addEventListener('click', () => { fileWasPlaying = state === 'playing'; pause(); $('city-file').value = ''; $('city-file').click(); });
$('city-file').addEventListener('cancel', () => { if (fileWasPlaying) resume(); });
$('city-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) { if (fileWasPlaying) resume(); return; }
  try {
    if (file.size > MAX_CITY_BYTES) throw new Error('This city file is too large. Choose a .SC2 file under 2 MB.');
    const bytes = new Uint8Array(await file.arrayBuffer()); inspectCity(bytes);
    const name = dosName(file.name, store.list().filter(record => record.path.startsWith('SC2000/SAVES/')).map(record => record.path.split('/').at(-1)));
    const record = await store.put(`SC2000/SAVES/${name}`, bytes); dialogWasPlaying = fileWasPlaying; chooseCity(record);
  } catch (error) { status(error.message, true); if (fileWasPlaying) resume(); }
});
$('confirm-open').addEventListener('click', () => { const city = pendingCity; pendingCity = null; closeDialog($('replace-dialog'), false); dialogWasPlaying = false; if (city) void start(city); });
$('cities-button').addEventListener('click', () => void listCities()); $('controls-button').addEventListener('click', () => showDialog('controls-dialog'));
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => closeDialog(button.closest('dialog'))));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(dialog); }));
$('mute').addEventListener('click', () => { prefs.muted = !prefs.muted; session?.mute(prefs.muted); writePreferences(prefs); render(); focusGame(); });
$('fullscreen').addEventListener('click', async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('player').requestFullscreen(); focusGame(); }
  catch { status('Fullscreen is unavailable in this browser.'); }
});
document.addEventListener('fullscreenchange', () => { $('fullscreen').textContent = document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen'; });

function movePointer(event) { const rect = canvas.getBoundingClientRect(); session?.mouseMove((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height); }
canvas.addEventListener('pointermove', event => { if (state === 'playing' && (pointer === null || pointer === event.pointerId)) { event.preventDefault(); movePointer(event); } });
canvas.addEventListener('pointerdown', event => {
  if (state !== 'playing' || (pointer !== null && pointer !== event.pointerId)) return;
  event.preventDefault(); focusGame(); pointer = event.pointerId; canvas.setPointerCapture(pointer); movePointer(event); session.mouseButton(event.button, true);
});
canvas.addEventListener('pointerup', event => { if (pointer !== event.pointerId) return; event.preventDefault(); movePointer(event); session?.mouseButton(event.button, false); if (!event.buttons) releasePointer(); });
canvas.addEventListener('pointercancel', () => { session?.releaseInput(); releasePointer(); });
canvas.addEventListener('lostpointercapture', () => { if (pointer !== null) session?.releaseButtons(); pointer = null; });
canvas.addEventListener('contextmenu', event => event.preventDefault()); canvas.addEventListener('blur', () => session?.releaseInput());
canvas.addEventListener('wheel', event => event.preventDefault(), { passive: false });
document.addEventListener('keydown', event => {
  if (document.activeElement === canvas && state === 'playing' && session.keyDown(event)) {
    event.preventDefault();
    if (event.altKey && event.code === 'KeyS') exportPending = true;
  }
});
document.addEventListener('keyup', event => { if (session?.keyUp(event)) event.preventDefault(); });
window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); void capture(); } });
window.addEventListener('pagehide', () => { clearInterval(pollTimer); pause(); });
window.addEventListener('pageshow', event => { if (event.persisted && session?.ci && ['playing', 'paused'].includes(state)) { pause(); clearInterval(pollTimer); pollTimer = setInterval(() => void capture(), 1500); } });
render();
