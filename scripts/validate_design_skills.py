"""Validate the project skill inventory and integrity without network or archive access.

Requires Python 3 and PyYAML (already available in the configured environment).
Run from any directory: python scripts/validate_design_skills.py
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    raise SystemExit("PyYAML is unavailable; use the configured Python runtime with PyYAML.")

ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / ".agents" / "skills"
MANIFEST = ROOT / ".agents" / "skills-manifest.json"


def check() -> list[str]:
    errors: list[str] = []
    inventory = json.loads(MANIFEST.read_text(encoding="utf-8"))
    entries = inventory["skills"]
    expected = {entry["name"] for entry in entries}
    if len(expected) != len(entries):
        errors.append("Duplicate names in inventory")
    actual = {path.name for path in SKILLS.iterdir() if path.is_dir()}
    if actual != expected:
        errors.append(f"Inventory mismatch: missing={sorted(expected - actual)}, extra={sorted(actual - expected)}")

    for entry in entries:
        name = entry["name"]
        directory = SKILLS / name
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name) or len(name) > 64:
            errors.append(f"{name}: invalid name")
            continue
        if not directory.is_dir():
            continue
        if directory.is_symlink() or directory.resolve().parent != SKILLS.resolve():
            errors.append(f"{name}: expected ordinary folder inside .agents/skills")
            continue
        entrypoint = directory / "SKILL.md"
        if not entrypoint.is_file():
            errors.append(f"{name}: missing SKILL.md")
            continue
        content = entrypoint.read_text(encoding="utf-8")
        match = re.match(r"\A---\n(.*?)\n---(?:\n|$)", content, re.S)
        if not match:
            errors.append(f"{name}: invalid YAML frontmatter delimiters")
            continue
        try:
            metadata = yaml.safe_load(match.group(1))
        except yaml.YAMLError as exc:
            errors.append(f"{name}: invalid YAML: {exc}")
            continue
        if not isinstance(metadata, dict):
            errors.append(f"{name}: frontmatter must be a mapping")
            continue
        if metadata.get("name") != name:
            errors.append(f"{name}: manifest name and folder differ")
        description = metadata.get("description")
        if not isinstance(description, str) or not description.strip() or len(description) > 1024:
            errors.append(f"{name}: description must be nonempty text up to 1024 characters")
        if "[TODO:" in content:
            errors.append(f"{name}: unfinished scaffold")
        body = content[match.end():]
        for target in re.findall(r"\[[^\]]*\]\(([^)]+)\)", body):
            target = target.split("#", 1)[0].split(" \"", 1)[0]
            if not target or re.match(r"[a-zA-Z][\w+.-]*:", target) or target.startswith("/"):
                continue
            resolved = (directory / target).resolve()
            if not resolved.is_relative_to(directory.resolve()):
                errors.append(f"{name}: reference escapes skill: {target}")
            elif not resolved.exists():
                errors.append(f"{name}: missing referenced file: {target}")

        ui = directory / "agents" / "openai.yaml"
        if ui.is_file():
            try:
                config = yaml.safe_load(ui.read_text(encoding="utf-8"))
                if not isinstance(config, dict):
                    errors.append(f"{name}: openai.yaml must be a mapping")
                elif entry["kind"] == "local" and config.get("policy", {}).get("allow_implicit_invocation", True) is not True:
                    errors.append(f"{name}: automatic invocation must remain enabled")
                if isinstance(config, dict):
                    for field in ("icon_small", "icon_large"):
                        icon = config.get("interface", {}).get(field)
                        if icon and not (directory / icon).is_file():
                            errors.append(f"{name}: missing {field}: {icon}")
            except yaml.YAMLError as exc:
                errors.append(f"{name}: invalid openai.yaml: {exc}")

        files = {}
        for path in directory.rglob("*"):
            if path.is_symlink():
                errors.append(f"{name}: unexpected symbolic link: {path.name}")
            elif path.is_file() and "__pycache__" not in path.parts and path.suffix != ".pyc":
                files[path.relative_to(directory).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
        if files != entry["files"]:
            missing = sorted(entry["files"].keys() - files.keys())
            extra = sorted(files.keys() - entry["files"].keys())
            changed = sorted(key for key in files.keys() & entry["files"].keys() if files[key] != entry["files"][key])
            errors.append(f"{name}: integrity mismatch: missing={missing}, extra={extra}, changed={changed}")
        if entry["kind"] == "upstream" and not (entry.get("ref") or entry.get("package_version")):
            errors.append(f"{name}: missing pinned source revision/version")

    lock = json.loads((ROOT / "skills-lock.json").read_text(encoding="utf-8"))
    for name, source in lock["skills"].items():
        entry = next((item for item in entries if item["name"] == name), None)
        if not entry or source["ref"] != entry.get("ref") or source["source"] != entry.get("source"):
            errors.append(f"{name}: skills-lock.json differs from inventory")

    required_rules = (ROOT / "AGENTS.md").read_text(encoding="utf-8")
    for section in ("A. Project Identity", "B. Professional Role", "C. Priority Hierarchy", "D. Prototype Boundaries", "E. Product and UX Reasoning", "F. Information Architecture", "G. UI / Design System", "H. React Implementation", "I. Requirements and Assumptions", "J. Skill Routing", "K. Working Method", "L. Verification", "M. Communication"):
        if f"## {section}" not in required_rules:
            errors.append(f"AGENTS.md: missing requested section {section}")
    return errors


if __name__ == "__main__":
    try:
        failures = check()
    except (OSError, KeyError, ValueError) as exc:
        raise SystemExit(f"Skill validation failed: {exc}")
    if failures:
        print("\n".join(f"ERROR: {failure}" for failure in failures))
        sys.exit(1)
    count = len(json.loads(MANIFEST.read_text(encoding="utf-8"))["skills"])
    print(f"Validated {count} project skills: frontmatter, paths, references, metadata, SHA-256 inventory, lock and AGENTS.md.")
