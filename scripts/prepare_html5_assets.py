"""Prepare a self-contained HTML5 asset directory from FFDec exports.

Only browser-safe resources are copied. SWF, AS3, XML and credentials are never
published. Sources are read-only; run with --apply to write.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from pathlib import Path
from urllib.parse import quote

ALLOWED = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp3",
           ".wav", ".ogg", ".woff", ".woff2", ".ttf"}
CHUNK = 1024 * 1024


def digest(path: Path) -> str:
    checksum = hashlib.sha256()
    with path.open("rb") as stream:
        for part in iter(lambda: stream.read(CHUNK), b""):
            checksum.update(part)
    return checksum.hexdigest()


def prepare(source: Path, dest: Path, *, apply: bool = False,
            max_total_mb: int = 2048) -> dict:
    source = source.resolve(strict=True)
    if not source.is_dir():
        raise ValueError("Origem deve ser uma pasta")
    dest = dest.resolve()
    if dest == source or dest.is_relative_to(source) or source.is_relative_to(dest):
        raise ValueError("A origem e a saída não podem conter uma à outra")
    if max_total_mb <= 0:
        raise ValueError("O limite deve ser maior que zero")
    files = []
    excluded = 0
    total = 0
    for item in sorted(source.rglob("*")):
        if item.is_symlink():
            raise ValueError(f"Link simbólico não permitido: {item}")
        if not item.is_file():
            continue
        if item.suffix.lower() not in ALLOWED:
            excluded += 1
            continue
        relative = item.relative_to(source)
        size = item.stat().st_size
        total += size
        if total > max_total_mb * 1024 * 1024:
            raise ValueError("Tamanho máximo excedido. Revise os recursos.")
        files.append((item, relative, size))

    manifest = []
    for original, relative, size in files:
        target = dest / relative
        sha = digest(original)
        manifest.append({
            "path": relative.as_posix(),
            "url": "/exported/" + quote(relative.as_posix(), safe="/"),
            "bytes": size,
            "sha256": sha,
        })
        if apply:
            target.parent.mkdir(parents=True, exist_ok=True)
            if target.exists() and digest(target) == sha:
                continue
            shutil.copy2(original, target)

    result = {
        "status": "copied" if apply else "dry-run",
        "files": len(files),
        "bytes": total,
        "excludedUnsafeOrNonBrowserFiles": excluded,
        "source": str(source),
        "destination": str(dest),
        "resources": manifest,
    }
    if apply:
        output = dest.parent / "migration" / "portable-assets.json"
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps({"schemaVersion": 1, "resources": manifest}, ensure_ascii=False, indent=2) + "\n",
                          encoding="utf-8")
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Pasta com exportações FFDec")
    parser.add_argument("--destination", type=Path, default=Path("public/exported"))
    parser.add_argument("--max-total-mb", type=int, default=2048)
    parser.add_argument("--apply", action="store_true",
                        help="Copiar os recursos; sem isto somente simula")
    args = parser.parse_args()
    result = prepare(args.source, args.destination, apply=args.apply,
                     max_total_mb=args.max_total_mb)
    print(json.dumps({key: value for key, value in result.items()
                      if key != "resources"}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
