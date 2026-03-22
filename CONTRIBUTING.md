# Contributing

This repository is a personal Codex toolkit, not just a catalog of agent files. Contributions should improve real workflows: better skills, sharper agents, cleaner prompts, or documentation that makes the kit easier to use.

## Project Areas

- `skills/` holds installable Codex skills.
- `agents/` holds reusable TOML agent definitions.
- `prompts/` holds reusable prompt assets.
- `archive/` holds legacy and upstream reference material.

Prefer working in the root toolkit. Do not add new product work under `archive/`.

## Adding or Updating a Skill

1. Add or edit a directory under `skills/<skill-name>/`.
2. Keep `SKILL.md` at the skill root.
3. Add only the support files the skill actually needs.
4. Update `README.md` if the skill set changed.
5. Document required environment variables inside the skill.

## Adding or Updating an Agent

1. Add or edit a `.toml` file under the most relevant folder in `agents/`.
2. Keep the role narrow and distinct.
3. Prefer concrete operating instructions over persona-heavy text.
4. Update `README.md` if the change affects the visible toolkit.

## Quality Bar

- Keep instructions specific and task-shaped.
- Prefer practical output contracts over abstract guidance.
- Avoid duplicating existing agents or skills with only cosmetic differences.
- Keep docs concise and operational.

## Verification

- Run `node bin/codexskills.js --help` after changing the skill installer.
- Smoke test `./installer.sh <agent-name>` when changing the agent installer.
- Confirm any new files referenced by docs actually exist.

## Style Notes

- JavaScript uses CommonJS, 2-space indentation, semicolons, and single quotes.
- Skill directories use kebab-case.
- Documentation should be clear, direct, and low on filler.

## License

By contributing, you agree your contributions are provided under the repository license terms.
