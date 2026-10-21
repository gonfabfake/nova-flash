"""Bounded, incremental lexical retrieval with SQLite FTS5, not embeddings."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import sqlite3

EXTENSIONS = {".as", ".xml", ".json", ".csv", ".txt"}
EXCLUDED_DIRS = {".git", "node_modules", "logs", "log", "secrets", ".ssh", ".aws"}
SECRET_NAME = re.compile(r"(^|[._-])(secret[s]?|credential[s]?|password[s]?|token[s]?|private[-_]?key)([._-]|$)", re.I)


def eligible(path: Path):
    return (path.suffix.lower() in EXTENSIONS and not path.name.lower().startswith(".env")
            and not SECRET_NAME.search(path.name))


def connect(database: Path):
    database.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(database)
    db.execute("PRAGMA journal_mode=WAL")
    db.executescript("""
        CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY, path TEXT UNIQUE NOT NULL, size INTEGER NOT NULL,
            mtime_ns INTEGER NOT NULL, chunks INTEGER NOT NULL, truncated INTEGER NOT NULL);
        CREATE VIRTUAL TABLE IF NOT EXISTS chunks USING fts5(
            text, path, document_id UNINDEXED, ordinal UNINDEXED,
            tokenize='unicode61');
    """)
    return db


def delete_document(db, doc_id, path):
    # document_id is UNINDEXED in FTS5. Narrow via the indexed path first;
    # a plain document_id predicate scans every chunk for every changed file.
    phrase = 'path : "' + path.replace('"', '""') + '"'
    rows = db.execute("SELECT rowid FROM chunks WHERE chunks MATCH ? AND document_id=?",
                      (phrase, doc_id)).fetchall()
    db.executemany("DELETE FROM chunks WHERE rowid=?", rows)
    db.execute("DELETE FROM documents WHERE id=?", (doc_id,))


def index(source: Path, database: Path, max_file_bytes=2 * 1024 * 1024,
          chunk_chars=2000, overlap=200, max_chunks=128):
    source = source.resolve(strict=True)
    if not source.is_dir():
        raise ValueError("Source must be a directory")
    if database.resolve().is_relative_to(source):
        raise ValueError("Database must be outside the read-only source")
    if max_file_bytes < 1 or chunk_chars < 1 or not 0 <= overlap < chunk_chars or max_chunks < 1:
        raise ValueError("Invalid indexing limits")
    db = connect(database)
    configuration = json.dumps([str(source), max_file_bytes, chunk_chars, overlap, max_chunks])
    stats = dict(indexed=0, unchanged=0, skipped_large=0, skipped_binary=0,
                 truncated=0, deleted=0, errors=0)
    errors = []
    try:
        previous = db.execute("SELECT value FROM metadata WHERE key='configuration'").fetchone()
        rebuild = previous is None or previous[0] != configuration
        seen = set()
        for directory, dirs, files in os.walk(source, onerror=lambda error: (_ for _ in ()).throw(error)):
            dirs[:] = sorted(d for d in dirs if d.lower() not in EXCLUDED_DIRS)
            for name in sorted(files):
                path = Path(directory) / name
                if not eligible(path):
                    continue
                relative = path.relative_to(source).as_posix()
                seen.add(relative)
                old = db.execute("SELECT id,size,mtime_ns FROM documents WHERE path=?", (relative,)).fetchone()
                try:
                    stat = path.stat()
                    if old and not rebuild and (stat.st_size, stat.st_mtime_ns) == old[1:]:
                        stats["unchanged"] += 1
                        continue
                    # Remove stale text even if a previously indexed file now exceeds limits.
                    if old:
                        delete_document(db, old[0], relative)
                    if stat.st_size > max_file_bytes:
                        stats["skipped_large"] += 1
                        continue
                    with path.open("rb") as stream:
                        raw = stream.read(max_file_bytes + 1)
                    if len(raw) > max_file_bytes:
                        stats["skipped_large"] += 1
                        continue
                    if b"\x00" in raw:
                        stats["skipped_binary"] += 1
                        continue
                    text = raw.decode("utf-8-sig", errors="replace")
                    starts = range(0, len(text), chunk_chars - overlap)
                    count = min(len(starts), max_chunks)
                    truncated = len(starts) > max_chunks
                    cursor = db.execute("INSERT INTO documents(path,size,mtime_ns,chunks,truncated) VALUES(?,?,?,?,?)",
                                        (relative, stat.st_size, stat.st_mtime_ns, count, int(truncated)))
                    doc_id = cursor.lastrowid
                    db.executemany("INSERT INTO chunks(text,path,document_id,ordinal) VALUES(?,?,?,?)",
                                   ((text[start:start + chunk_chars], relative, doc_id, ordinal)
                                    for ordinal, start in enumerate(starts[:max_chunks])))
                    stats["indexed"] += 1
                    stats["truncated"] += int(truncated)
                    if stats["indexed"] % 250 == 0:
                        db.commit()
                except OSError as error:
                    stats["errors"] += 1
                    errors.append({"path": relative, "error": str(error)})
        for doc_id, path in db.execute("SELECT id,path FROM documents").fetchall():
            if path not in seen:
                delete_document(db, doc_id, path)
                stats["deleted"] += 1
        db.execute("INSERT OR REPLACE INTO metadata VALUES('configuration', ?)", (configuration,))
        db.commit()
        stats["documents"] = db.execute("SELECT COUNT(*) FROM documents").fetchone()[0]
        stats["chunks"] = db.execute("SELECT COUNT(*) FROM chunks").fetchone()[0]
    finally:
        db.close()
    return {"generatedAt": datetime.now(timezone.utc).isoformat(), "source": str(source),
            "database": str(database), "stats": stats, "errors": errors,
            "limits": {"maxFileBytes": max_file_bytes, "chunkChars": chunk_chars,
                       "overlapChars": overlap, "maxChunksPerFile": max_chunks}}


def search(database: Path, query: str, limit=10):
    if not database.is_file():
        raise ValueError("Index not found; run index first")
    if not query.strip() or limit < 1:
        raise ValueError("Provide a non-empty query and positive limit")
    db = sqlite3.connect(f"{database.resolve().as_uri()}?mode=ro", uri=True)
    try:
        # Literal phrase search: user text is never interpreted as FTS operators.
        phrase = '"' + query.replace('"', '""') + '"'
        rows = db.execute("""SELECT path, ordinal, snippet(chunks,0,'[',']',' … ',32), bm25(chunks)
                             FROM chunks WHERE chunks MATCH ? ORDER BY bm25(chunks) LIMIT ?""", (phrase, limit))
        return [{"path": path, "chunk": ordinal, "snippet": snippet, "score": score}
                for path, ordinal, snippet, score in rows]
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path, default=Path("generated/rag.sqlite3"))
    sub = parser.add_subparsers(dest="command", required=True)
    indexing = sub.add_parser("index")
    indexing.add_argument("path", type=Path)
    indexing.add_argument("--max-file-bytes", type=int, default=2 * 1024 * 1024)
    indexing.add_argument("--chunk-chars", type=int, default=2000)
    indexing.add_argument("--overlap", type=int, default=200)
    indexing.add_argument("--max-chunks", type=int, default=128)
    indexing.add_argument("--report", type=Path, default=Path("generated/rag-index.json"))
    searching = sub.add_parser("search")
    searching.add_argument("query")
    searching.add_argument("--limit", type=int, default=10)
    args = parser.parse_args()
    if args.command == "index":
        result = index(args.path, args.database, args.max_file_bytes, args.chunk_chars, args.overlap, args.max_chunks)
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    else:
        result = search(args.database, args.query, args.limit)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
