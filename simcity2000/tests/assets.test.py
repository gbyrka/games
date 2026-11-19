import hashlib
import io
import json
from pathlib import Path
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]


class GameAssets(unittest.TestCase):
    def test_every_original_game_and_runtime_file_matches_manifest(self):
        manifest = json.loads((ROOT / 'data/manifest.json').read_text())
        raw = (ROOT / 'data/simcity2000-dos.zip').read_bytes()
        self.assertEqual(len(raw), manifest['bundle']['bytes'])
        self.assertEqual(hashlib.sha256(raw).hexdigest(), manifest['bundle']['sha256'])
        with zipfile.ZipFile(io.BytesIO(raw)) as archive:
            self.assertEqual(len(manifest['files']), 134)
            seen = set()
            for entry in archive.infolist():
                if entry.is_dir():
                    parent = str(Path(entry.filename.rstrip('/')).parent)
                    self.assertTrue(parent == '.' or parent + '/' in seen)
                    seen.add(entry.filename)
                    continue
                self.assertIn(str(Path(entry.filename).parent) + '/', seen)
                data = archive.read(entry)
                self.assertEqual({'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}, manifest['files'][entry.filename])
            exe = archive.read('SC2000/SC2000.EXE')
            self.assertTrue(exe.startswith(b'MZ'))
            self.assertIn(b'owner of Version 1.01', exe)
            self.assertIn(b'Save City As...', exe)
            self.assertIn(b'Start New City', exe)
            self.assertEqual(len([n for n in archive.namelist() if n.endswith('.SCN')]), 15)
            cfg = archive.read('SC2000/SC2000.CFG')
            self.assertIn(b'VIDEONAME=VESA Super VGA', cfg)
            self.assertIn(b'MUSICDRIVER=A32SP2FM.DLL', cfg)
            self.assertIn(b'SFXDRIVER=A32SBPDG.DLL', cfg)
        for name, expected in manifest['runtime'].items():
            data = (ROOT / 'vendor' / name).read_bytes()
            self.assertEqual({'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}, expected)

    def test_public_entry_is_listed_and_runtime_is_local(self):
        html = (ROOT / 'index.html').read_text()
        self.assertIn('index,follow', html)
        self.assertNotIn('noindex', html)
        self.assertIn('https://mod-it.games/games/simcity2000/', html)
        catalog = (ROOT.parents[1] / 'gbyrka.github.io/index.html').read_text()
        self.assertIn('href="/games/simcity2000/"', catalog)
        self.assertIn('id="simcity-title">SimCity</h3>', catalog)
        self.assertIn('https://mod-it.games/games/assets/simcity-social.jpg', html)
        self.assertTrue((ROOT.parent / 'assets/simcity-social.jpg').exists())
        self.assertNotIn('simcity2000', (ROOT.parent / 'config.json').read_text().lower())
        self.assertNotIn('<iframe', html)
        self.assertTrue((ROOT.parent / '.nojekyll').exists())


if __name__ == '__main__':
    unittest.main()
