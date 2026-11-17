// SPDX-License-Identifier: GPL-2.0-or-later
import { inspectCity, safeCityPath } from './cities.mjs';
const PREF_KEY = 'mod-it:simcity2000:preferences1';
export function readPreferences() {
  try { const value = JSON.parse(localStorage.getItem(PREF_KEY)); return { muted: value?.muted === true }; }
  catch { return { muted: false }; }
}
export function writePreferences(value) {
  try { localStorage.setItem(PREF_KEY, JSON.stringify({ muted: value.muted === true })); } catch { /* Optional. */ }
}

export class CityStore {
  constructor() { this.records = new Map(); this.db = null; this.durable = false; }
  async open() {
    try {
      this.db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('mod-it:simcity2000:cities1', 1);
        let expired = false;
        const timer = setTimeout(() => { expired = true; reject(new Error('Storage timed out.')); }, 4000);
        const fail = () => { expired = true; clearTimeout(timer); reject(request.error ?? new Error('Storage unavailable.')); };
        request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('cities')) request.result.createObjectStore('cities', { keyPath: 'path' }); };
        request.onerror = fail; request.onblocked = fail;
        request.onsuccess = () => { clearTimeout(timer); if (expired) request.result.close(); else resolve(request.result); };
      });
      this.db.onversionchange = () => { this.db.close(); this.db = null; this.durable = false; };
      const records = await this.transaction('readonly', store => store.getAll());
      for (const record of records) {
        try { if (!safeCityPath(record.path)) continue; inspectCity(record.bytes); this.records.set(record.path, { ...record, bytes: new Uint8Array(record.bytes) }); } catch { /* Ignore damaged local entries. */ }
      }
      this.durable = true;
    } catch { this.db?.close(); this.db = null; this.durable = false; }
    return this;
  }
  transaction(mode, action) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('cities', mode), request = action(tx.objectStore('cities'));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = tx.onabort = () => reject(tx.error ?? new Error('Storage unavailable.'));
    });
  }
  list() { return [...this.records.values()].sort((a, b) => b.updated - a.updated); }
  async put(path, input, updated = Date.now()) {
    if (!safeCityPath(path)) throw new Error('Invalid city filename.');
    const bytes = new Uint8Array(input), { name } = inspectCity(bytes);
    const record = { path, bytes, name, updated };
    this.records.set(path, record);
    if (this.db) {
      try { await this.transaction('readwrite', store => store.put(record)); }
      catch { this.durable = false; }
    }
    return record;
  }
}
