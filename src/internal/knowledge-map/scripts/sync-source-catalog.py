#!/usr/bin/env python3
"""Regenerate the knowledge-map source catalogue from the reviewed source index."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
CATALOG = ROOT / "docs-ref/knowledge/catalog"
OUTPUT = ROOT / "src/internal/knowledge-map/data/sources.json"
AS_OF = "2026-10-16"

LEGACY_ALIASES = {
    "g19": ("D019", "manual"),
    "alpha18": ("D024", "manual"),
    "alpha-current": ("D024", "manual"),
    "gm25": ("D013", "manual"),
    "map-current": ("D013", "manual"),
    "video-oct14": ("modules/geology/maps/reference-video-memory.md", "video-audit"),
    "design-review": ("quality/questions.md", "review"),
    "section-current": ("D017", "manual"),
    "bgd-current": ("D008", "manual"),
    "menu-current": ("D003", "decision"),
    "team-current": ("D002", "decision"),
}


def main() -> None:
    manifest_path = CATALOG / "manifest.json"
    index_path = CATALOG / "knowledge-index.json"
    manifest_bytes = manifest_path.read_bytes()
    manifest = json.loads(manifest_bytes)
    index = json.loads(index_path.read_text(encoding="utf-8"))
    manifest_sha = hashlib.sha256(manifest_bytes).hexdigest()
    if index.get("manifest_sha256") != manifest_sha:
        raise SystemExit("knowledge-index.json was not generated from the current manifest")

    rows = index.get("rows", [])
    rows_by_id = {row["source_id"]: row for row in rows}
    expected = sorted(
        (row for row in rows if row.get("kind") in {"document", "video"}),
        key=lambda row: row["source_id"],
    )
    if len(expected) != 122 or len(rows_by_id) != len(rows):
        raise SystemExit("Expected 122 unique document/video rows in knowledge-index.json")

    sources: list[dict[str, str]] = []
    for row in expected:
        source_id = row["source_id"]
        kind = "video-audit" if row["kind"] == "video" else "manual"
        if source_id in {"D002", "D003"}:
            kind = "decision"
        elif source_id in {"D001", "D004", "D005", "D006", "D023"}:
            kind = "review"
        review_path = f"docs-ref/knowledge/{row['review']}"
        source_path = Path(row["review"])
        if not (ROOT / "docs-ref/knowledge" / source_path).is_file():
            raise SystemExit(f"Missing review for {source_id}: {review_path}")
        basename = row["original_path"].replace("\\", "/").rsplit("/", 1)[-1]
        sources.append({
            "id": source_id.lower(),
            "title": f"{source_id} · {basename}",
            "kind": kind,
            "reference": f"{review_path} · исходный ID {source_id}",
            "asOf": AS_OF,
        })

    for alias, (target, kind) in LEGACY_ALIASES.items():
        if target.startswith("D"):
            row = rows_by_id.get(target)
            if not row:
                raise SystemExit(f"Missing alias target row: {target}")
            target_path = f"docs-ref/knowledge/{row['review']}"
            basename = row["original_path"].replace("\\", "/").rsplit("/", 1)[-1]
            title = f"{alias} · alias → {target} · {basename}"
            reference = f"{target_path} · исходный ID {target}; совместимый alias {alias}"
        else:
            target_path = f"docs-ref/knowledge/{target}"
            title = f"{alias} · alias → {target} · память по V001–V006"
            reference = f"{target_path} · память по V001–V006; не отдельное свидетельство встречи 14.10; совместимый alias {alias}"
        if not (ROOT / target_path).is_file():
            raise SystemExit(f"Missing alias target: {target_path}")
        sources.append({
            "id": alias,
            "title": title,
            "kind": kind,
            "reference": reference,
            "asOf": AS_OF,
        })

    OUTPUT.write_text(json.dumps(sources, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(sources)} sources: 40 documents, 82 videos, {len(LEGACY_ALIASES)} aliases")


if __name__ == "__main__":
    main()
