import json
import tempfile
import unittest
from pathlib import Path
from scripts.prepare_html5_assets import prepare


class PortableAssetsTests(unittest.TestCase):
    def test_preview_and_copy_only_browser_resources(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / "exports"
            source.mkdir()
            (source / "DefineSprite_1").mkdir()
            (source / "DefineSprite_1" / "1.png").write_bytes(b"PNG content")
            (source / "Main.as").write_text("secret", encoding="utf-8")
            (source / "Main.swf").write_bytes(b"FWS")
            dest = root / "output" / "public" / "exported"

            preview = prepare(source, dest)
            self.assertEqual(preview["status"], "dry-run")
            self.assertEqual(preview["files"], 1)
            self.assertEqual(preview["excludedUnsafeOrNonBrowserFiles"], 2)
            self.assertFalse(dest.exists())

            result = prepare(source, dest, apply=True)
            self.assertEqual(result["status"], "copied")
            self.assertTrue((dest / "DefineSprite_1" / "1.png").exists())
            self.assertFalse((dest / "Main.as").exists())
            manifest = json.loads(
                (dest.parent / "migration" / "portable-assets.json").read_text(encoding="utf-8"))
            self.assertNotIn(str(source), json.dumps(manifest))
            self.assertEqual(manifest["resources"][0]["url"],
                             "/exported/DefineSprite_1/1.png")
            self.assertEqual(prepare(source, dest, apply=True)["files"], 1)

    def test_refuses_overlapping_paths(self):
        with tempfile.TemporaryDirectory() as temp:
            src = Path(temp) / "source"
            src.mkdir()
            with self.assertRaises(ValueError):
                prepare(src, src / "public", apply=True)


if __name__ == "__main__":
    unittest.main()
