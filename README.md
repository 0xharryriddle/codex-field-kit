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
