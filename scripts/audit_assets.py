"""Inventory an untouched FFDec export; only generated outputs are written."""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import json
import math
import os
from pathlib import Path
import re
from urllib.parse import quote

DEFAULT_SOURCE = Path(r"D:\nova flash em html\arquivos")
IMAGE_EXTENSIONS = {".png", ".svg", ".jpg", ".jpeg", ".gif", ".webp"}


def walk_files(root: Path):
    """Traverse names and metadata only; never open source files."""
    def fail(error):
        raise error
    for directory, dirs, files in os.walk(root, onerror=fail):
        dirs.sort()
        for name in sorted(files):
            yield Path(directory) / name


def exported_url(path: str) -> str:
    return "/exported/" + quote(path, safe="/")


def original_identifier(relative: str):
    # Only FFDec's explicit character IDs are inferred, never guessed symbols.
    for component in reversed(relative.split("/")):
        match = re.match(r"Define[A-Za-z0-9]+_(\d+)(?:[_.]|$)", component)
        if match:
            return int(match.group(1))
    return None


def frame_key(path: str):
    return [int(part) if part.isdigit() else part.lower()
            for part in re.split(r"(\d+)", path)]


def timeline_fps(path: Path, header_limit=65536):
    """Read only a bounded JSON header and decode actual top-level properties.

    FFDec puts fps before its potentially enormous timelines object. If that
    order changes, report the bound instead of guessing a value from a regex.
    """
    try:
        with path.open("r", encoding="utf-8-sig") as stream:
            text = stream.read(header_limit + 1)
        limited = len(text) > header_limit
        text = text[:header_limit]
        decoder = json.JSONDecoder()
        position = len(text) - len(text.lstrip())
        if not text[position:].startswith("{"):
            return None, "invalid"
        position += 1
        while position < len(text):
            while position < len(text) and text[position].isspace():
                position += 1
            if position < len(text) and text[position] == "}":
                return None, "missing"
            key, position = decoder.raw_decode(text, position)
            while position < len(text) and text[position].isspace():
                position += 1
            if not isinstance(key, str) or text[position:position + 1] != ":":
                return None, "invalid"
            position += 1
            while position < len(text) and text[position].isspace():
                position += 1
            value, position = decoder.raw_decode(text, position)
            if key == "fps":
                valid = (isinstance(value, (int, float)) and not isinstance(value, bool)
                         and math.isfinite(value) and value > 0)
                return (value, "available") if valid else (None, "invalid")
            while position < len(text) and text[position].isspace():
                position += 1
            if text[position:position + 1] == "}":
                return None, "missing"
            if text[position:position + 1] != ",":
                return None, "invalid"
            position += 1
        return None, "header-limit" if limited else "invalid"
    except json.JSONDecodeError:
        return None, "header-limit" if limited else "invalid"
    except (OSError, UnicodeError):
        return None, "error"


def audit(source: Path, output: Path, catalog_path: Path, image_limit: int = 100):
    source = source.resolve(strict=True)
    if not source.is_dir():
        raise ValueError("Source must be a directory")
    if image_limit < 0:
        raise ValueError("image_limit must be non-negative")
    for destination in (output, catalog_path):
        if destination.resolve().is_relative_to(source):
            raise ValueError("Outputs must be outside the read-only source")
    output.mkdir(parents=True, exist_ok=True)
    catalog_path.parent.mkdir(parents=True, exist_ok=True)
    modules = {}
    types = Counter()
    total_bytes = total_files = 0
    with (output / "inventory.jsonl").open("w", encoding="utf-8", newline="\n") as inventory:
        for file in walk_files(source):
            relative = file.relative_to(source).as_posix()
            module_path = relative.split("/")[0] if "/" in relative else "."
            module = modules.setdefault(module_path, {
                "name": module_path.rsplit("__", 1)[0], "path": module_path,
                "counts": {"files": 0, "bytes": 0, "images": 0, "sprites": 0,
                           "timelines": 0, "byType": {}},
                "images": [], "sprites": [], "timelines": [], "timelineUrl": None,
                "fps": None, "fpsStatus": "missing",
                "_sprites": {},
            })
            size = file.stat().st_size
            kind = file.suffix.lower().lstrip(".") or "extensionless"
            record = {"path": relative, "type": kind, "size": size,
                      "module": module_path, "originalIdentifier": original_identifier(relative),
                      "usage": "unknown", "status": "available-not-migrated"}
            inventory.write(json.dumps(record, ensure_ascii=False) + "\n")
            counts = module["counts"]
            counts["files"] += 1
            counts["bytes"] += size
            counts["byType"][kind] = counts["byType"].get(kind, 0) + 1
            types[kind] += 1
            total_files += 1
            total_bytes += size
            if file.suffix.lower() in IMAGE_EXTENSIONS:
                counts["images"] += 1
                if len(module["images"]) < image_limit:
                    module["images"].append({"path": relative, "url": exported_url(relative)})
            if file.suffix.lower() == ".png" and "sprites" in file.relative_to(source).parts:
                parent = file.parent.relative_to(source).as_posix()
                module["_sprites"].setdefault(parent, []).append(relative)
            if file.name == "timeline.json":
                url = exported_url(relative)
                module["timelines"].append({"path": relative, "url": url})
                counts["timelines"] += 1
                if module["timelineUrl"] is None:
                    module["timelineUrl"] = url
                    module["fps"], module["fpsStatus"] = timeline_fps(file)
    for module in modules.values():
        for path, frames in sorted(module.pop("_sprites").items()):
            module["sprites"].append({"id": path.rsplit("/", 1)[-1], "path": path,
                                      "frames": [exported_url(p) for p in sorted(frames, key=frame_key)]})
        module["counts"]["sprites"] = len(module["sprites"])
        module["imagesTruncated"] = module["counts"]["images"] > len(module["images"])
    timestamp = datetime.now(timezone.utc).isoformat()
    summary = {"schemaVersion": 1, "generatedAt": timestamp, "source": str(source),
               "files": total_files, "bytes": total_bytes, "modules": len(modules),
               "byType": dict(sorted(types.items())), "status": "available-not-migrated",
               "usage": "unknown", "imageLimitPerModule": image_limit,
               "fpsStatusCounts": dict(Counter(m["fpsStatus"] for m in modules.values())),
               "fpsIssues": [{"module": m["path"], "status": m["fpsStatus"]}
                             for m in modules.values() if m["fpsStatus"] != "available"]}
    catalog = {"schemaVersion": 1, "generatedAt": timestamp, "baseUrl": "/exported/",
               "imageLimitPerModule": image_limit, "modules": list(modules.values())}
    (output / "audit.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    return summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, nargs="?", default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=Path("generated"))
    parser.add_argument("--catalog", type=Path, default=Path("public/migration/catalog.json"))
    parser.add_argument("--image-limit", type=int, default=100)
    args = parser.parse_args()
    print(json.dumps(audit(args.source, args.output, args.catalog, args.image_limit), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
