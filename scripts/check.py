#!/usr/bin/env python3
"""Dependency-free structural checks for ThreadScout for Reddit."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
PLUGIN_ROOT = ROOT / "plugins" / "threadscout-for-reddit"
MARKETPLACE = ROOT / ".agents" / "plugins" / "marketplace.json"
MANIFEST = PLUGIN_ROOT / ".codex-plugin" / "plugin.json"
SKILL = PLUGIN_ROOT / "skills" / "reddit-agent" / "SKILL.md"
OPENAI_YAML = PLUGIN_ROOT / "skills" / "reddit-agent" / "agents" / "openai.yaml"
MCP_CONFIG = PLUGIN_ROOT / ".mcp.json"
MCP_SERVER = PLUGIN_ROOT / "server" / "index.mjs"
SEMVER = re.compile(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$")


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    for path in (MARKETPLACE, MANIFEST, SKILL, OPENAI_YAML, MCP_CONFIG, MCP_SERVER, ROOT / "README.md", ROOT / "LICENSE", ROOT / "PRIVACY.md"):
        if not path.is_file():
            fail(f"missing {path.relative_to(ROOT)}")

    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        fail(f"invalid plugin manifest: {error}")

    if manifest.get("name") != "threadscout-for-reddit":
        fail("manifest name must be threadscout-for-reddit")
    if not SEMVER.fullmatch(str(manifest.get("version", ""))):
        fail("manifest version must be strict semantic versioning")
    if manifest.get("skills") != "./skills/":
        fail("manifest must expose ./skills/")
    if manifest.get("mcpServers") != "./.mcp.json":
        fail("manifest must expose ./.mcp.json")
    if manifest.get("version") != "0.2.0":
        fail("manifest version must match the account-capable release")

    try:
        mcp = json.loads(MCP_CONFIG.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        fail(f"invalid MCP configuration: {error}")
    reddit_server = mcp.get("mcpServers", {}).get("reddit-account", {})
    if reddit_server.get("command") != "node" or reddit_server.get("args") != ["./server/index.mjs"]:
        fail("MCP configuration must launch the bundled Reddit server")

    try:
        marketplace = json.loads(MARKETPLACE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        fail(f"invalid marketplace manifest: {error}")
    entries = marketplace.get("plugins", [])
    if len(entries) != 1 or entries[0].get("name") != "threadscout-for-reddit":
        fail("marketplace must contain exactly the threadscout-for-reddit entry")
    if entries[0].get("source", {}).get("path") != "./plugins/threadscout-for-reddit":
        fail("marketplace source must point to ./plugins/threadscout-for-reddit")

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

    for relative in ("references/research.md", "references/writing.md", "references/account.md"):
        if relative not in skill_text:
            fail(f"SKILL.md does not route to {relative}")
        if not (SKILL.parent / relative).is_file():
            fail(f"missing {relative}")

    server_text = (PLUGIN_ROOT / "server" / "tools.mjs").read_text(encoding="utf-8")
    if 'name: "reddit_vote"' in server_text or '"vote"' in json.dumps(mcp):
        fail("automated Reddit voting must not be exposed")

    print("ThreadScout for Reddit plugin checks passed.")


if __name__ == "__main__":
    main()
