#!/usr/bin/env python3
"""Prepare the pinned original CD installer, or pack its verified installed files."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import struct
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = {'url': 'https://archive.org/download/sc2kcd_en/sc2kcd_en.iso', 'bytes': 3727360,
          'sha256': '08c287767a0030ed2e3906333ba8fe943d6cd18f991729bd5eaafd7264bd194e'}
STAMP = (1994, 1, 12, 0, 0, 0)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def pack(files, directories=()):
    buffer = io.BytesIO()
    dirs = {str(parent).replace('\\', '/') for name in files for parent in Path(name).parents if str(parent) != '.'} | set(directories)
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name in sorted(dirs, key=lambda value: (value.count('/'), value)):
            if name == '.':
                continue
            info = zipfile.ZipInfo(name + '/', STAMP)
            info.external_attr = (0o40755 << 16) | 0x10
            archive.writestr(info, b'')
        for name, content in sorted(files.items()):
            info = zipfile.ZipInfo(name, STAMP)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, content)
    return buffer.getvalue()


def unpack_cd(image):
    """Read the flat ISO9660 root, preserving every original CD file."""
    if image[16 * 2048 + 1:16 * 2048 + 6] != b'CD001':
        raise ValueError('Not an ISO9660 image')
    record = image[16 * 2048 + 156:16 * 2048 + 190]
    start = struct.unpack_from('<I', record, 2)[0] * 2048
    size = struct.unpack_from('<I', record, 10)[0]
    pos, files = start, {}
    while pos < start + size:
        length = image[pos]
        if not length:
            pos = (pos // 2048 + 1) * 2048
            continue
        record = image[pos:pos + length]
        pos += length
        if record[25] & 2:
            continue
        name = record[33:33 + record[32]].decode('ascii').split(';')[0]
        if '/' in name or '\\' in name or name in ('.', '..'):
            raise ValueError('Unexpected ISO filename')
        offset = struct.unpack_from('<I', record, 2)[0] * 2048
        count = struct.unpack_from('<I', record, 10)[0]
        files['CD/' + name] = image[offset:offset + count]
    return files


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--cache', type=Path, default=Path('/tmp/sc2k-build'))
    parser.add_argument('--installed', type=Path, help='Directory containing original installer output SC2000/')
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    path = args.cache / 'sc2kcd_en.iso'
    if not path.exists():
        with urllib.request.urlopen(SOURCE['url'], timeout=90) as response:
            path.write_bytes(response.read())
    image = path.read_bytes()
    if len(image) != SOURCE['bytes'] or sha(image) != SOURCE['sha256']:
        raise SystemExit('CD image checksum mismatch')
    (args.cache / 'install.zip').write_bytes(pack(unpack_cd(image)))
    if not args.installed:
        print('Original installer prepared. Run install.mjs next, then --installed <cache>/full.')
        return
    files = {p.relative_to(args.installed).as_posix(): p.read_bytes()
             for p in sorted(args.installed.rglob('*')) if p.is_file()}
    expected = json.loads((ROOT / 'data/manifest.json').read_text())
    actual = {name: {'bytes': len(data), 'sha256': sha(data)} for name, data in files.items()}
    if actual != expected['files']:
        raise SystemExit('Installer output differs from the verified full installation. No bundle overwritten.')
    packed = pack(files, ['SC2000/SAVES'])
    if sha(packed) != expected['bundle']['sha256']:
        raise SystemExit('Repacked bundle differs from the pinned bundle')
    (ROOT / 'data/simcity2000-dos.zip').write_bytes(packed)
    print(f'Reproduced {len(files)} original files, {len(packed)} bytes, SHA-256 {sha(packed)}')


if __name__ == '__main__':
    main()
