# Codex Field Kit

This repository is my personal Codex toolkit and handbook.

It is where I keep the skills, agents, prompts, and reference material I actually want nearby when building with agents. The goal is not to be a giant catalog. The goal is to have a practical working kit: planning tools, documentation access, frontend guidance, browser automation, and a deep bench of specialized agents when the task gets narrow.

## What Lives Here

- `skills/` contains installable Codex skills.
- `agents/` contains reusable Codex agent definitions in TOML.
- `prompts/` contains planning and orchestration prompts I reuse.
- `bin/codexskills.js` is the local installer CLI for skills.
- `archive/legacy-subagents/` preserves the old category-based awesome-list structure.
- `archive/upstream/` keeps upstream snapshots that informed this rebuild.

## Core Skills

### Planning and orchestration

- `planner` for structured implementation plans.
- `plan-harder` for heavier planning passes.
- `parallel-task` and `parallel-task-spark` for plan execution with multiple workers.
- `llm-council` for multi-model planning and synthesis.
- `swarm-planner` and `super-swarm-spark` for broader delegation workflows.

### Documentation and research

- `context7` for current library docs.
- `openai-docs-skill` for OpenAI docs workflows.
- `read-github` for repository-aware documentation access.
- `markdown-url` for cleaner LLM-friendly browsing.

### Code search and indexing

- `ccc` for AST-based semantic code search and index management via CocoIndex Code.

### Frontend and browser work

- `frontend-design` for sharper UI direction.
- `frontend-responsive-ui` for responsive standards.
- `vercel-react-best-practices` for React and Next.js performance guidance.
- `agent-browser` and `gemini-computer-use` for browser automation.

## Study Collections

Some imports in this repo are here to sharpen judgment, not just to be installed blindly.

### Chasebuild Agent Skills

The Chasebuild collection is preserved under `archive/upstream/chasebuild-agent-skills/` as a study library for skill design and agent operating style.

- `context-engineering` has 13 skills focused on context budgeting, degradation, compression, memory, and multi-agent design.
- `git` has 5 workflow skills with unusually clear commit, PR, and validation guardrails.
- `react` has 4 skills that complement the Vercel material already in this kit.
- `rust` has 38 Rust-focused skills plus supporting agent files, making it the deepest specialized study set in the repo.
- `web3` has 7 Uniswap-leaning skills for viem integration, deployment, swap planning, and security foundations.

What is valuable here is the perspective: practical activation criteria, explicit guardrails, and strong task framing. Even where the topics overlap with skills already in this repo, the wording and operating assumptions are worth studying.

## Quick Start

### Install a skill locally from this repo

```bash
node bin/codexskills.js --project . ./tmp-playground
```

That installs selected skills into `./tmp-playground/.codex/skills`.

### Install agents into Codex

```bash
./installer.sh reviewer architect worker_mini
```

Or copy everything:

```bash
./installer.sh all
```

Agents are copied into `~/.codex/agents`.

### Install semantic code search for Codex

```bash
./scripts/install-ccc.sh --user
```

That installs the local `ccc` skill into `~/.codex/skills` and, if `pipx` or `uv` is available, installs the `cocoindex-code` CLI as well.

To wire it into a specific project instead:

```bash
./scripts/install-ccc.sh --project ./my-repo
```

If `ccc` already exists in the target skills directory, it is skipped by default. Use `--force` only when you want to reinstall it.

### Install a Chasebuild skill group from the local archive

```bash
./scripts/install-chase-skill-group.sh git -g
```

Available groups:

- `context-engineering`
- `git`
- `react`
- `rust`
- `web3`

This wrapper installs directly from the archived local snapshot via `npx skills add`.

For global installs, these group skills land in `~/.agents/skills`, which `skills.sh` uses as its shared multi-agent location. Existing installed skills in the selected group are skipped by default. Use `--force` if you intentionally want to reinstall the full group.

### Install from a published GitHub repo later

```bash
npx skills add <your-user>/<your-repo> --skill planner -g
```

Replace `<your-user>/<your-repo>` with the repository you publish.

## Working Style

This repo is opinionated:

- keep prompts direct
- keep skills small and composable
- keep agents specialized
- keep archived material available, but out of the way

If something is here, it should earn its place by being useful in real agent-driven work.

## Development

```bash
npm install
node bin/codexskills.js --help
```

There is no formal test suite yet. When changing the installer or packaged skills, use a temporary project directory and confirm the expected files land in `.codex/skills` or `~/.codex/agents`.

## Archive

The original categorized `awesome-codex-subagents` collection still exists under `archive/legacy-subagents/categories/`. I kept it for reference, but it is no longer the primary interface to the repository.

The imported CocoIndex Code upstream snapshot now lives under `archive/upstream/cocoindex-code/`. The live skill exposed by this toolkit is `skills/ccc/`.

The imported Chasebuild collection now lives under `archive/upstream/chasebuild-agent-skills/`. I treat it as a study and selective-install source rather than flattening all of its groups into the root skill tree.

## Attribution

This repository is built on top of, inspired by, or adapted from upstream agent-skill collections. The two primary upstream references for the current toolkit shape are:

- `am-will/codex-skills`: <https://github.com/am-will/codex-skills>
- `chasebuild/agent-skills`: <https://github.com/chasebuild/agent-skills>

Local upstream snapshots are preserved under `archive/upstream/` for provenance and study. See [`THIRD_PARTY_NOTICES.md`](/home/harry-riddle/dev/github.com/0xharryriddle/awesome-codex-subagents/THIRD_PARTY_NOTICES.md) for the attribution record maintained in this repo.
