#!/usr/bin/env python3
"""Reproduce the pinned browser runtime and unmodified DOS game data. Python 3 only."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import struct
import tarfile
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    'emulators.tgz': ('https://registry.npmjs.org/emulators/-/emulators-8.5.3.tgz', '800538dce814cbeed75a54e98ba6db9248ab5d9fb598b1b0cf1e6fe82b6f9c58'),
    'prince-dos.zip': ('https://archive.org/download/msdos_Prince_of_Persia_1990/Prince_of_Persia_1990.zip', 'a07ef61798ee7b08a54aec7686503e088e29fa665eec31db0dcf46a648580495'),
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--cache', type=Path, default=Path('/tmp/pop-build'))
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    raw = {}
    for name, (url, expected) in SOURCES.items():
        path = args.cache / name
        if not path.exists():
            with urllib.request.urlopen(url, timeout=90) as response:
                path.write_bytes(response.read())
        raw[name] = path.read_bytes()
        if sha(raw[name]) != expected:
            raise SystemExit(f'Checksum mismatch: {name}')
    vendor = ROOT / 'vendor'
    vendor.mkdir(parents=True, exist_ok=True)
    runtime = {}
    with tarfile.open(fileobj=io.BytesIO(raw['emulators.tgz'])) as archive:
        for name in ['emulators.js', 'emulators.js.map', 'wdosbox.js', 'wdosbox.wasm']:
            data = archive.extractfile(f'package/dist/{name}').read()
            (vendor / name).write_bytes(data)
            runtime[name] = {'bytes': len(data), 'sha256': sha(data)}
        (vendor / 'COPYING.txt').write_bytes(archive.extractfile('package/LICENSE').read())
    data_dir = ROOT / 'data'
    data_dir.mkdir(exist_ok=True)
    files = {}
    with zipfile.ZipFile(io.BytesIO(raw['prince-dos.zip'])) as archive:
        for member in archive.infolist():
            name = Path(member.filename).name.upper()
            if name == 'PRINCE.EXE' or name.endswith('.DAT'):
                if name in files:
                    raise SystemExit(f'Duplicate DOS filename: {name}')
                files[name] = archive.read(member)
    if b'PRINCE OF PERSIA  V1.0' not in files['PRINCE.EXE']:
        raise SystemExit('Unexpected game version')
    levels = files['LEVELS.DAT']
    offset, size = struct.unpack_from('<IH', levels)
    count = struct.unpack_from('<H', levels, offset)[0]
    records = []
    for i in range(count):
        resource, start, length = struct.unpack_from('<HIH', levels, offset + 2 + i * 8)
        if start + length > offset or length not in (2304, 2305):
            raise SystemExit('Unexpected level resource')
        records.append(resource)
    if records != list(range(2000, 2016)) or size != 130:
        raise SystemExit('The complete level set is missing')
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
        for name, content in sorted(files.items()):
            info = zipfile.ZipInfo(name, date_time=(1990, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            bundle.writestr(info, content)
    packed = output.getvalue()
    (data_dir / 'prince-dos.zip').write_bytes(packed)
    manifest = {
        'game': 'Prince of Persia for MS-DOS', 'version': '1.0', 'emulator': 'emulators 8.5.3 / DOSBox',
        'sources': {name: {'url': url, 'sha256': checksum} for name, (url, checksum) in SOURCES.items()},
        'bundle': {'file': 'prince-dos.zip', 'bytes': len(packed), 'sha256': sha(packed)},
        'files': {name: {'bytes': len(content), 'sha256': sha(content)} for name, content in sorted(files.items())},
        'levelResources': records, 'runtime': runtime,
    }
    (data_dir / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(f'Prepared {len(files)} unmodified DOS files, {count} level resources, {len(packed)} byte bundle.')


if __name__ == '__main__':
    main()
