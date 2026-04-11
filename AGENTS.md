# Repository Guidelines

## Purpose

This repository is a personal Codex field kit. The primary assets are:

- `skills/` for installable Codex skills
- `agents/` for reusable TOML agent definitions
- `prompts/` for reusable orchestration prompts
- `archive/` for legacy or upstream reference material

When making changes, treat the root toolkit as the product. Treat `archive/` as reference material unless the task is explicitly about migration or comparison.

## Structure

- `skills/<skill-name>/SKILL.md` is the entrypoint for each skill.
- `skills/<skill-name>/scripts/`, `references/`, and `assets/` are optional support files.
- `agents/**/*.toml` contains Codex agent definitions grouped by domain.
- `skills-hermes/codex-agents/` contains converted agents as SKILL.md for Hermes.
- `skills-hermes/codex-prompts/` contains wrapped prompts as SKILL.md for Hermes.
- `bin/fieldkit.js` is the unified installer (skills, agents, prompts to Codex or Hermes).
- `bin/codexskills.js` installs skills into project or user scope (legacy, Codex-only).
- `scripts/convert-all-agents.py` batch-converts TOML agents to SKILL.md format.
- `scripts/install-ccc.sh` bootstraps the CocoIndex Code CLI plus the local `ccc` skill.
- `scripts/install-chase-skill-group.sh` installs a Chasebuild skill group from the archived local snapshot using `npx skills add`.
- `installer.sh` installs agent TOML files into `~/.codex/agents` (legacy).
- `lib/` contains shared modules: targets, registry, install-skills/agents/prompts, interactive, banner.
- `archive/legacy-subagents/` preserves the previous category-based repo layout.
- `archive/upstream/` preserves imported upstream snapshots.

## Editing Rules

- Prefer editing root `skills/`, `agents/`, `prompts/`, and installer/docs files.
- Do not treat `archive/upstream/` as a source of truth. It is retained for provenance.
- Keep skill directories self-contained and small. If a skill grows, move detailed material into `references/`.
- Keep agent names and roles narrow. Avoid generic personas that overlap heavily with existing agents.
- If you add or remove a skill or agent, update `README.md`.
- For semantic repository exploration, prefer `skills/ccc/` over ad hoc grep-only workflows when the task is concept-based or spans unfamiliar code paths.
- Use `archive/upstream/chasebuild-agent-skills/` as a study reference for skill writing patterns, especially context-engineering guardrails, Git workflow discipline, and deep Rust specialization.
- Installer scripts in this repo should be idempotent by default: skip existing skills unless the user explicitly requests a reinstall.
- Agent installer behavior must preserve the full repository inventory. If duplicate basenames exist under `agents/`, install them with deterministic namespaced IDs instead of silently overwriting files.
- When documenting or requesting one of those duplicate-name agents, prefer a qualified selector such as `architecture-orchestration/architect` or the installed ID `architecture-orchestration__architect`.
- When importing or adapting upstream material, add or update an entry in `THIRD_PARTY_NOTICES.md` and keep the source repository URL explicit.

## Style

- JavaScript in this repo uses CommonJS, 2-space indentation, semicolons, and single quotes.
- Skill directories use kebab-case.
- `SKILL.md` stays uppercase and lives at the skill root.
- Documentation should be direct, practical, and low on filler.

## Verification

- For unified CLI changes, run `node bin/fieldkit.js --help` and test with `--dry-run`.
- For legacy installer changes, run `node bin/codexskills.js --help`.
- For `ccc` bootstrap changes, run `bash -n scripts/install-ccc.sh`.
- For Chasebuild installer wrapper changes, run `bash -n scripts/install-chase-skill-group.sh`.
- For agent installer changes, smoke test both `./installer.sh <agent-name>` and `HOME=/tmp/codex-field-kit-smoke ./installer.sh all` when practical.
- For agent conversion changes, run `python3 scripts/convert-all-agents.py --dry-run` then check a sample output.
- If you touch a skill with scripts or required environment variables, verify the instructions still match the files in that skill directory.

## Archive Policy

- `archive/legacy-subagents/` may be referenced or mined for migration work.
- `archive/upstream/` contains imported snapshots with `_git/` metadata preserved only for provenance.
- New product work should not be added under `archive/`.
