// SPDX-License-Identifier: GPL-2.0-or-later
// Only the file envelope is inspected. The original DOS program owns city simulation.
export const MAX_CITY_BYTES = 2 * 1024 * 1024;
const ascii = (bytes, start, length) => String.fromCharCode(...bytes.subarray(start, start + length));

export function inspectCity(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length < 12 || bytes.length > MAX_CITY_BYTES || ascii(bytes, 0, 4) !== 'FORM' || ascii(bytes, 8, 4) !== 'SCDH') {
    throw new Error('Choose a SimCity 2000 city file (.SC2).');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(4) + 8 !== bytes.length) throw new Error('This city file is incomplete or damaged.');
  const chunks = new Map();
  let pos = 12;
  // SC2 chunks are packed without the optional IFF even-byte padding.
  while (pos < bytes.length) {
    if (pos + 8 > bytes.length) throw new Error('This city file has an incomplete section.');
    const id = ascii(bytes, pos, 4), length = view.getUint32(pos + 4);
    if (!/^[A-Z0-9 ]{4}$/.test(id) || length > bytes.length - pos - 8) throw new Error('This city file has a damaged section.');
    if (chunks.has(id) && !['TEXT'].includes(id)) throw new Error('This city file has duplicate sections.');
    chunks.set(id, bytes.subarray(pos + 8, pos + 8 + length));
    pos += 8 + length;
  }
  for (const id of ['MISC', 'ALTM', 'XTER', 'XBLD', 'XZON']) {
    if (!chunks.get(id)?.length) throw new Error('This file is missing city data.');
  }
  if (chunks.has('SCEN')) throw new Error('Choose a saved city (.SC2), rather than a scenario (.SCN).');
  if (chunks.get('ALTM').length !== 32768) throw new Error('This city has an invalid terrain map.');
  const title = chunks.get('CNAM');
  const name = title ? ascii(title, 1, Math.min(31, title.length - 1)).split('\0')[0].replace(/[\x00-\x1f\x7f]/g, '').trim() : '';
  return { name, chunks };
}

export function sameBytes(a, b) {
  return Boolean(a && b && a.length === b.length && a.every((value, i) => value === b[i]));
}

export function dosName(filename, used = []) {
  const stem = String(filename).split(/[\\/]/).at(-1).replace(/\.sc2$/i, '').toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 8) || 'CITY';
  const occupied = new Set(used.map(name => name.toUpperCase()));
  if (!occupied.has(stem + '.SC2')) return stem + '.SC2';
  for (let i = 1; i < 10000; i++) {
    const suffix = String(i), candidate = stem.slice(0, 8 - suffix.length) + suffix + '.SC2';
    if (!occupied.has(candidate)) return candidate;
  }
  throw new Error('Too many city files with the same name.');
}

export function safeCityPath(path) {
  return /^SC2000\/(?:[A-Z0-9_-]{1,8}\/)*[A-Z0-9_-]{1,8}\.SC2$/i.test(path);
}
