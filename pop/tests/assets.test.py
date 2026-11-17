import hashlib
import json
from pathlib import Path
import struct
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]


class PackagedGame(unittest.TestCase):
    def setUp(self):
        self.manifest = json.loads((ROOT / 'data/manifest.json').read_text())

    def test_pinned_bundle_and_every_original_file(self):
        raw = (ROOT / 'data/prince-dos.zip').read_bytes()
        self.assertEqual(len(raw), self.manifest['bundle']['bytes'])
        self.assertEqual(hashlib.sha256(raw).hexdigest(), self.manifest['bundle']['sha256'])
        with zipfile.ZipFile(ROOT / 'data/prince-dos.zip') as archive:
            self.assertEqual(set(archive.namelist()), set(self.manifest['files']))
            self.assertEqual(len(archive.namelist()), 26)
            for name, expected in self.manifest['files'].items():
                with self.subTest(file=name):
                    self.assertNotIn('/', name)
                    data = archive.read(name)
                    self.assertEqual(len(data), expected['bytes'])
                    self.assertEqual(hashlib.sha256(data).hexdigest(), expected['sha256'])
            self.assertTrue(archive.read('PRINCE.EXE').startswith(b'MZ'))
            self.assertIn(b'PRINCE OF PERSIA  V1.0', archive.read('PRINCE.EXE'))

    def test_complete_original_level_resource_directory(self):
        with zipfile.ZipFile(ROOT / 'data/prince-dos.zip') as archive:
            levels = archive.read('LEVELS.DAT')
        offset, size = struct.unpack_from('<IH', levels)
        count, = struct.unpack_from('<H', levels, offset)
        self.assertEqual(count, 16)
        self.assertEqual(size, 2 + count * 8)
        resources = []
        for i in range(count):
            resource, start, length = struct.unpack_from('<HIH', levels, offset + 2 + i * 8)
            self.assertLessEqual(start + length, offset)
            self.assertGreaterEqual(length, 2304)
            resources.append(resource)
        self.assertEqual(resources, list(range(2000, 2016)))

    def test_all_runtime_binaries_are_pinned(self):
        for name, expected in self.manifest['runtime'].items():
            with self.subTest(file=name):
                raw = (ROOT / 'vendor' / name).read_bytes()
                self.assertEqual(len(raw), expected['bytes'])
                self.assertEqual(hashlib.sha256(raw).hexdigest(), expected['sha256'])

    def test_direct_unlisted_entry_and_local_runtime(self):
        html = (ROOT / 'index.html').read_text()
        self.assertIn('https://mod-it.games/games/pop/', html)
        self.assertIn('noindex,nofollow', html)
        self.assertNotIn('googlesyndication', html)
        self.assertNotIn('googletagmanager', html)
        self.assertNotIn('pop/', (ROOT.parent / 'index.html').read_text())
        config = json.loads((ROOT / 'config.json').read_text())
        for name in config['modules']:
            self.assertTrue((ROOT / name).is_file())


if __name__ == '__main__':
    unittest.main()
