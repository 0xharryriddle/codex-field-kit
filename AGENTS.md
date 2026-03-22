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
- `bin/codexskills.js` installs skills into project or user scope.
- `scripts/install-ccc.sh` bootstraps the CocoIndex Code CLI plus the local `ccc` skill.
- `installer.sh` installs agent TOML files into `~/.codex/agents`.
- `archive/legacy-subagents/` preserves the previous category-based repo layout.
- `archive/upstream/` preserves imported upstream snapshots.

## Editing Rules

- Prefer editing root `skills/`, `agents/`, `prompts/`, and installer/docs files.
- Do not treat `archive/upstream/` as a source of truth. It is retained for provenance.
- Keep skill directories self-contained and small. If a skill grows, move detailed material into `references/`.
- Keep agent names and roles narrow. Avoid generic personas that overlap heavily with existing agents.
- If you add or remove a skill or agent, update `README.md`.
- For semantic repository exploration, prefer `skills/ccc/` over ad hoc grep-only workflows when the task is concept-based or spans unfamiliar code paths.

## Style

- JavaScript in this repo uses CommonJS, 2-space indentation, semicolons, and single quotes.
- Skill directories use kebab-case.
- `SKILL.md` stays uppercase and lives at the skill root.
- Documentation should be direct, practical, and low on filler.

## Verification

- For installer changes, run `node bin/codexskills.js --help`.
- For `ccc` bootstrap changes, run `bash -n scripts/install-ccc.sh`.
- For agent installer changes, smoke test `./installer.sh <agent-name>` against a disposable environment when practical.
- If you touch a skill with scripts or required environment variables, verify the instructions still match the files in that skill directory.

## Archive Policy

- `archive/legacy-subagents/` may be referenced or mined for migration work.
- `archive/upstream/` contains imported snapshots with `_git/` metadata preserved only for provenance.
- New product work should not be added under `archive/`.
