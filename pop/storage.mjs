// SPDX-License-Identifier: GPL-2.0-or-later
export const SAVE_KEY = 'mod-it:pop:dos10:checkpoint1';
const PREFS_KEY = 'mod-it:pop:preferences1';
export function validCheckpoint(bytes) {
  if(!(bytes instanceof Uint8Array)||bytes.length!==8)return false;
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  return view.getUint16(0,true)<=60&&view.getUint16(2,true)<=720&&view.getUint16(4,true)>=3&&view.getUint16(4,true)<=13&&view.getUint16(6,true)>=1&&view.getUint16(6,true)<=10;
}
export function readPreferences(storage) {
  try { const data = JSON.parse((storage ?? globalThis.localStorage).getItem(PREFS_KEY)); return { sound:data?.sound === 'speaker' ? 'speaker' : 'adlib', muted:data?.muted === true }; }
  catch { return { sound:'adlib', muted:false }; }
}
export function writePreferences(value, storage) {
  try { (storage ?? globalThis.localStorage).setItem(PREFS_KEY,JSON.stringify({sound:value.sound,muted:value.muted})); } catch { /* Preferences are optional. */ }
}
export function readCheckpoint(storage) {
  try {
    const data=JSON.parse((storage ?? globalThis.localStorage).getItem(SAVE_KEY));
    if (data?.version !== 1 || typeof data.bytes !== 'string' || data.bytes.length > 11000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data.bytes)) return null;
    const bytes=Uint8Array.from(atob(data.bytes),c=>c.charCodeAt(0));
    if (!validCheckpoint(bytes)) return null;
    return {bytes,savedAt:typeof data.savedAt === 'string' ? data.savedAt : ''};
  } catch { return null; }
}
export function writeCheckpoint(bytes,storage) {
  if (!validCheckpoint(bytes)) throw new Error('Invalid game save.');
  try { (storage ?? globalThis.localStorage).setItem(SAVE_KEY,JSON.stringify({version:1,bytes:btoa(String.fromCharCode(...bytes)),savedAt:new Date().toISOString()})); }
  catch { throw new Error('This browser cannot save progress. Allow site storage and try again.'); }
}
export function sameBytes(a,b) { return Boolean(a && b && a.length === b.length && a.every((value,i)=>value === b[i])); }
