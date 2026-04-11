#!/usr/bin/env python3
"""
convert-all-agents.py - Batch convert Codex TOML agents to Hermes SKILL.md format.

Usage:
    python3 scripts/convert-all-agents.py [--output-dir DIR] [--agents-dir DIR]

Defaults:
    --agents-dir: ./agents
    --output-dir: ./skills-hermes/codex-agents
"""

import tomllib
import os
import re
import sys
import argparse
from pathlib import Path

SKILL_TEMPLATE = """---
name: {name}
description: {description}
metadata:
  hermes:
    tags: [codex-agent, {category}]
    source: codex-field-kit/{source_category}
---

# {title}

{body}
"""


def slugify(text: str) -> str:
    """Convert text to a safe directory/file name."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


def extract_first_line_desc(instructions: str) -> str:
    """Extract a short description from the first meaningful line of instructions."""
    if not instructions:
        return "Codex agent definition."
    for line in instructions.strip().split("\n"):
        line = line.strip()
        if line and not line.startswith("#"):
            # Clean up and truncate
            desc = line[:120]
            if len(line) > 120:
                desc = desc.rsplit(" ", 1)[0] + "..."
            return desc
    return "Codex agent definition."


def convert_toml_to_skillmd(
    toml_path: Path,
    agents_dir: Path,
    output_dir: Path,
    seen_names: dict,
) -> tuple[bool, str]:
    """
    Convert a single TOML agent file to SKILL.md format.

    Returns (success, message).
    """
    try:
        with open(toml_path, "rb") as f:
            data = tomllib.load(f)
    except Exception as e:
        return False, f"Parse error: {e}"

    # Extract fields
    name = data.get("name", toml_path.stem)
    desc = data.get("description", "")
    instructions = data.get("developer_instructions", "")

    # If no description, extract from instructions
    if not desc:
        desc = extract_first_line_desc(instructions)

    # Escape description for YAML: quote if it contains colons or special chars
    desc_escaped = desc.replace('"', "'")
    needs_quoting = any(c in desc for c in [':', '#', '{', '}', '[', ']', ',', '&', '*', '?', '|', '-', '<', '>', '=', '!', '%', '@', '\\'])
    if needs_quoting and not desc_escaped.startswith('"'):
        desc_escaped = f'"{desc_escaped}"'
    else:
        desc_escaped = f'"{desc_escaped}"'  # Always quote for safety

    # If no developer_instructions, check if there's at least model config
    # (these are "worker" type agents with minimal content)
    if not instructions:
        model = data.get("model", "")
        if model:
            instructions = (
                f"This is a worker agent configured for model `{model}`.\n\n"
                f"Model: {model}\n"
                f"Reasoning effort: {data.get('model_reasoning_effort', 'medium')}"
            )
        else:
            instructions = f"Agent role: {name}"

    # Determine category from directory structure
    rel_path = toml_path.relative_to(agents_dir)
    if len(rel_path.parts) > 1:
        category = rel_path.parts[0]
        source_category = category
    else:
        category = "root"
        source_category = "root"

    # Handle duplicate names with namespace prefix
    install_name = name
    if name in seen_names:
        # Namespace it
        install_name = f"{category}__{name}" if category != "root" else f"root__{name}"
        # If still duplicate, add counter
        if install_name in seen_names:
            counter = 2
            while f"{install_name}-{counter}" in seen_names:
                counter += 1
            install_name = f"{install_name}-{counter}"

    seen_names[install_name] = str(toml_path)

    # Title case the name for display
    title = name.replace("-", " ").replace("_", " ").title()

    # Generate SKILL.md content
    content = SKILL_TEMPLATE.format(
        name=install_name,
        description=desc_escaped,
        category=category,
        source_category=source_category,
        title=title,
        body=instructions,
    )

    # Write output
    skill_dir = output_dir / install_name
    skill_dir.mkdir(parents=True, exist_ok=True)
    skill_md = skill_dir / "SKILL.md"
    skill_md.write_text(content)

    return True, f"{rel_path} -> {install_name}/SKILL.md"


def main():
    parser = argparse.ArgumentParser(description="Convert Codex TOML agents to Hermes SKILL.md")
    parser.add_argument(
        "--agents-dir",
        type=Path,
        default=Path(__file__).parent.parent / "agents",
        help="Source agents directory (default: ./agents)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).parent.parent / "skills-hermes" / "codex-agents",
        help="Output directory (default: ./skills-hermes/codex-agents)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be converted without writing files",
    )
    args = parser.parse_args()

    agents_dir = args.agents_dir.resolve()
    output_dir = args.output_dir.resolve()

    if not agents_dir.is_dir():
        print(f"Error: agents directory not found: {agents_dir}", file=sys.stderr)
        sys.exit(1)

    # Find all TOML files
    toml_files = sorted(agents_dir.rglob("*.toml"))
    print(f"Found {len(toml_files)} TOML agent files in {agents_dir}")

    if args.dry_run:
        print("\nDry run -- showing what would be converted:\n")
        for f in toml_files:
            rel = f.relative_to(agents_dir)
            print(f"  {rel}")
        print(f"\nTotal: {len(toml_files)} files")
        return

    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)

    # Convert
    seen_names = {}
    success = 0
    failed = 0
    skipped = 0

    print(f"\nConverting to {output_dir}...\n")

    for toml_file in toml_files:
        ok, msg = convert_toml_to_skillmd(toml_file, agents_dir, output_dir, seen_names)
        if ok:
            success += 1
            print(f"  OK   {msg}")
        else:
            failed += 1
            print(f"  FAIL {msg}")

    print(f"\nDone: {success} converted, {failed} failed")
    print(f"Output: {output_dir}")
    print(f"Total SKILL.md directories: {len(list(output_dir.iterdir()))}")

    # Generate a manifest
    manifest_path = output_dir.parent / "MANIFEST.json"
    import json
    manifest = {
        "version": "1.0.0",
        "source": "codex-field-kit/agents",
        "total": success,
        "skills": {
            name: {"path": f"codex-agents/{name}", "source": src}
            for name, src in sorted(seen_names.items())
        },
    }
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Manifest: {manifest_path}")


if __name__ == "__main__":
    main()
