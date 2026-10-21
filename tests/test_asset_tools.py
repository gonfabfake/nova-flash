import json
from contextlib import closing
from pathlib import Path
import sqlite3
import tempfile
import unittest

from scripts.audit_assets import audit, original_identifier, timeline_fps
from scripts.rag_index import index, search


class AssetToolsTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / "source"
        self.source.mkdir()

    def put(self, relative, content):
        path = self.source / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return path

    def test_complete_inventory_catalog_and_natural_frames(self):
        self.put("hall__abc/recursos/sprites/DefineSprite_7_hero/10.png", b"ten")
        self.put("hall__abc/recursos/sprites/DefineSprite_7_hero/2.png", b"two")
        self.put("hall__abc/timeline.json", b'{"fps": 30, "timelines": {}}')
        self.put("hall__abc/export.log", b"not read")
        summary = audit(self.source, self.root / "out", self.root / "catalog.json", 1)
        self.assertEqual(summary["files"], 4)
        records = [json.loads(line) for line in (self.root / "out/inventory.jsonl").read_text().splitlines()]
        self.assertTrue(all(r["status"] == "available-not-migrated" for r in records))
        module = json.loads((self.root / "catalog.json").read_text())["modules"][0]
        self.assertEqual(module["name"], "hall")
        self.assertEqual(module["counts"]["images"], 2)
        self.assertEqual(len(module["images"]), 1)
        self.assertTrue(module["imagesTruncated"])
        self.assertTrue(module["sprites"][0]["frames"][0].endswith("/2.png"))
        self.assertEqual(module["timelineUrl"], "/exported/hall__abc/timeline.json")
        self.assertEqual(module["fps"], 30)
        self.assertEqual(module["fpsStatus"], "available")
        self.assertEqual(original_identifier("x/DefineSprite_7_hero/2.png"), 7)
        self.assertIsNone(original_identifier("x/2.png"))

    def test_fps_never_invents_metadata(self):
        for content, expected in [(b"{}", (None, "missing")),
                                  (b'{"fps": "24"}', (None, "invalid")),
                                  (b'{"fps": true}', (None, "invalid")),
                                  (b'{"fps": -1}', (None, "invalid")),
                                  (b'{"fps": 29.97}', (29.97, "available")),
                                  (b'{"nested": {"fps": 24}}', (None, "missing"))]:
            path = self.put("timeline.json", content)
            self.assertEqual(timeline_fps(path), expected)
        path = self.put("timeline.json", b'{"large":"' + b"x" * 100 + b'", "fps":24}')
        self.assertEqual(timeline_fps(path, 32), (None, "header-limit"))

    def test_incremental_search_update_delete_and_safety(self):
        file = self.put("scripts/Hall.as", b"hall Socket connection")
        self.put("export.log", b"Socket log")
        self.put("credentials.json", b'{"Socket":"secret"}')
        self.put("logs/test.txt", b"Socket log")
        db = self.root / "index.sqlite3"
        first = index(self.source, db)
        self.assertEqual(first["stats"]["documents"], 1)
        self.assertEqual(search(db, "Socket")[0]["path"], "scripts/Hall.as")
        second = index(self.source, db)
        self.assertEqual(second["stats"]["unchanged"], 1)
        file.write_text("replacement contents", encoding="utf-8")
        index(self.source, db)
        self.assertEqual(search(db, "Socket"), [])
        file.unlink()
        self.assertEqual(index(self.source, db)["stats"]["deleted"], 1)

    def test_limits_and_chunk_truncation(self):
        self.put("large.xml", b"x" * 101)
        self.put("chunk.txt", b"hall " * 10)
        self.put("binary.txt", b"\x00ignored")
        db = self.root / "index.sqlite3"
        result = index(self.source, db, max_file_bytes=100, chunk_chars=10, overlap=2, max_chunks=2)
        self.assertEqual(result["stats"]["skipped_large"], 1)
        self.assertEqual(result["stats"]["skipped_binary"], 1)
        self.assertEqual(result["stats"]["truncated"], 1)
        self.assertEqual(result["stats"]["chunks"], 2)
        with closing(sqlite3.connect(db)) as connection:
            self.assertEqual(connection.execute("SELECT truncated FROM documents").fetchone()[0], 1)

    def test_source_cannot_receive_outputs(self):
        with self.assertRaises(ValueError):
            audit(self.source, self.source / "out", self.root / "catalog.json")
        with self.assertRaises(ValueError):
            index(self.source, self.source / "index.sqlite3")


if __name__ == "__main__":
    unittest.main()
