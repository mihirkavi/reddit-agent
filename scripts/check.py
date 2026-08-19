#!/usr/bin/env python3
"""Dependency-free structural checks for the Reddit Agent plugin."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
PLUGIN_ROOT = ROOT / "plugins" / "reddit-agent"
MARKETPLACE = ROOT / ".agents" / "plugins" / "marketplace.json"
MANIFEST = PLUGIN_ROOT / ".codex-plugin" / "plugin.json"
SKILL = PLUGIN_ROOT / "skills" / "reddit-agent" / "SKILL.md"
OPENAI_YAML = PLUGIN_ROOT / "skills" / "reddit-agent" / "agents" / "openai.yaml"
SEMVER = re.compile(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$")


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    for path in (MARKETPLACE, MANIFEST, SKILL, OPENAI_YAML, ROOT / "README.md", ROOT / "LICENSE"):
        if not path.is_file():
            fail(f"missing {path.relative_to(ROOT)}")

    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        fail(f"invalid plugin manifest: {error}")

    if manifest.get("name") != "reddit-agent":
        fail("manifest name must be reddit-agent")
    if not SEMVER.fullmatch(str(manifest.get("version", ""))):
        fail("manifest version must be strict semantic versioning")
    if manifest.get("skills") != "./skills/":
        fail("manifest must expose ./skills/")

    try:
        marketplace = json.loads(MARKETPLACE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        fail(f"invalid marketplace manifest: {error}")
    entries = marketplace.get("plugins", [])
    if len(entries) != 1 or entries[0].get("name") != "reddit-agent":
        fail("marketplace must contain exactly the reddit-agent entry")
    if entries[0].get("source", {}).get("path") != "./plugins/reddit-agent":
        fail("marketplace source must point to ./plugins/reddit-agent")

    required_interface = {
        "displayName",
        "shortDescription",
        "longDescription",
        "developerName",
        "category",
        "capabilities",
        "defaultPrompt",
    }
    missing = required_interface - set(manifest.get("interface", {}))
    if missing:
        fail(f"manifest interface missing: {', '.join(sorted(missing))}")

    skill_text = SKILL.read_text(encoding="utf-8")
    if not skill_text.startswith("---\n"):
        fail("SKILL.md must begin with YAML frontmatter")
    if "name: reddit-agent" not in skill_text.split("---", 2)[1]:
        fail("SKILL.md frontmatter name must be reddit-agent")
    if "[TODO:" in skill_text or "[TODO:" in MANIFEST.read_text(encoding="utf-8"):
        fail("unfinished TODO placeholder found")

    for relative in ("references/research.md", "references/writing.md"):
        if relative not in skill_text:
            fail(f"SKILL.md does not route to {relative}")
        if not (SKILL.parent / relative).is_file():
            fail(f"missing {relative}")

    print("Reddit Agent plugin checks passed.")


if __name__ == "__main__":
    main()
