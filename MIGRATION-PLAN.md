# Codex Field Kit -> Multi-Target Migration Plan

## Date: 2026-04-11

## Goal

Transform the Codex Field Kit from a Codex-only toolkit into a **universal agent toolkit**
that can install skills, agents, and prompts into either **Codex** or **Hermes Agent**
(or both). The user chooses the target at install time.

---

## 1. Current State Summary

### What the Codex Field Kit Contains

| Asset Type | Count | Format | Current Target |
|------------|-------|--------|----------------|
| Skills | 19 | SKILL.md + support files | `~/.codex/skills/` |
| Agents | 400 | TOML (model + developer_instructions) | `~/.codex/agents/` |
| Prompts | 3 | Markdown | No installer exists |
| Scripts | 4 | Shell + Node.js | N/A |

### What Hermes Agent Needs

| Asset Type | Format | Target Path |
|------------|--------|-------------|
| Skills | SKILL.md (identical format!) | `~/.hermes/skills/` or via `external_dirs` |
| Agents/Prompts | SKILL.md or SOUL.md (markdown) | `~/.hermes/skills/` or delegate prompts |
| Persona | SOUL.md | `~/.hermes/SOUL.md` |

### Key Finding: Skills Are Already Compatible

Both Codex and Hermes use the **exact same SKILL.md format**:
```yaml
---
name: skill-name
description: Brief description
---
# Skill Title
Instructions...
```

No conversion needed for skills. Just install to the right directory.

---

## 2. Architecture: Multi-Target Installer

### Design Principle

One CLI (`bin/fieldkit.js`) that accepts `--codex`, `--hermes`, or `--both` flags.
Internally, a **Target Adapter** maps asset types to the correct paths and formats
per target system.

### Target Adapter Matrix

| Asset | Codex Path | Hermes Path | Format Change? |
|-------|-----------|-------------|----------------|
| Skills | `~/.codex/skills/<name>/` | `~/.hermes/skills/codex-field-kit/<name>/` | NO |
| Agents | `~/.codex/agents/<name>.toml` | `~/.hermes/skills/codex-agents/<name>/SKILL.md` | YES (TOML->SKILL.md) |
| Prompts | (no target) | `~/.hermes/skills/prompts/<name>/SKILL.md` | NO (already md) |

### Directory Structure (new)

```
codex-field-kit/
  bin/
    fieldkit.js              # NEW unified CLI entry point
  lib/
    targets.js               # Target adapter (codex vs hermes paths)
    registry.js              # Scans repo assets, builds catalog
    install-skills.js        # Skill installer (extends codexskills.js)
    install-agents.js        # Agent installer (extends installer.sh + conversion)
    install-prompts.js       # Prompt installer (NEW)
    interactive.js           # TTY multi-select UI (extracted from codexskills.js)
    convert-agent.js         # TOML -> SKILL.md converter
    banner.js                # Unified branding
  scripts/
    convert-all-agents.py    # Batch TOML->SKILL.md conversion script
    install-ccc.sh           # Keep as-is (specialized)
    install-chase-skill-group.sh  # Keep as-is (specialized)
  agents/                    # Keep as-is (source of truth)
  skills/                    # Keep as-is (source of truth)
  prompts/                   # Keep as-is (source of truth)
  skills-hermes/             # NEW: converted agents as SKILL.md for Hermes
  installer.sh               # Keep for backward compat (thin wrapper)
  bin/codexskills.js         # Keep for backward compat (thin wrapper)
```

---

## 3. Implementation Phases

### Phase 1: Skills -- Zero-Conversion (TRIVIAL)

Skills use identical SKILL.md format in both systems. Two approaches:

**Option A -- `external_dirs` (recommended, zero-copy):**
```yaml
# Add to ~/.hermes/config.yaml
skills:
  external_dirs:
    - /home/harry-riddle/dev/github.com/0xharryriddle/codex-field-kit/skills
```

**Option B -- Copy into Hermes skills dir:**
```bash
cp -r codex-field-kit/skills/* ~/.hermes/skills/
```

The installer should support both. Option A is preferred because:
- Zero file duplication
- Updates to the field kit are immediately available
- Hermes scans external dirs fresh every session

**Deliverables:**
- `fieldkit install skill --hermes` adds `external_dirs` entry to config.yaml
- `fieldkit install skill --codex` uses existing codexskills.js logic
- `fieldkit install skill --both` does both

### Phase 2: Agents -- TOML to SKILL.md Conversion (MEDIUM)

400 TOML agent files need conversion to SKILL.md for Hermes.

**Conversion rules:**
1. Extract `name` (or infer from filename), `description`, `developer_instructions`
2. Drop: `model`, `model_reasoning_effort`, `sandbox_mode`, `web_search`, `[features]`, `[mcp_servers]`, `[apps]`
3. Generate SKILL.md with YAML frontmatter + developer_instructions as body
4. Category derived from directory path (e.g., `agents/languages-runtime/python-expert.toml` -> category: `languages-runtime`)

**Output structure for Hermes:**
```
~/.hermes/skills/codex-agents/
  architect/
    SKILL.md
  python-expert/
    SKILL.md
  languages-runtime__python-expert/   # namespaced for dupes
    SKILL.md
  ...
```

**Conversion script** (`scripts/convert-all-agents.py`):
```python
#!/usr/bin/env python3
"""Batch convert Codex TOML agents to Hermes SKILL.md format."""
import tomllib, os, re
from pathlib import Path

REPO = Path(__file__).parent.parent
AGENTS_DIR = REPO / "agents"
OUTPUT_DIR = REPO / "skills-hermes" / "codex-agents"

TEMPLATE = """---
name: {name}
description: {description}
metadata:
  hermes:
    tags: [codex-agent, {category}]
    source: codex-field-kit/{category}
---

# {title}

{body}
"""

def convert(toml_path, output_dir):
    with open(toml_path, "rb") as f:
        data = tomllib.load(f)

    name = data.get("name", toml_path.stem)
    desc = data.get("description", f"Codex agent: {name}")
    instructions = data.get("developer_instructions", "")
    category = toml_path.parent.relative_to(AGENTS_DIR).as_posix()

    content = TEMPLATE.format(
        name=name,
        description=desc,
        category=category if category != "." else "root",
        title=name.replace("-", " ").replace("_", " ").title(),
        body=instructions,
    )

    out = output_dir / name
    out.mkdir(parents=True, exist_ok=True)
    (out / "SKILL.md").write_text(content)

# Walk all TOML files
for toml_file in sorted(AGENTS_DIR.rglob("*.toml")):
    convert(toml_file, OUTPUT_DIR)
```

**Deliverables:**
- `scripts/convert-all-agents.py` -- batch conversion script
- `fieldkit convert agents --target hermes` -- CLI subcommand
- `skills-hermes/codex-agents/` -- output directory with converted SKILL.md files
- `fieldkit install agent --hermes` -- adds external_dirs or copies converted skills

### Phase 3: Prompts -- Markdown Installation (TRIVIAL)

Prompts are plain markdown. Wrap each as a SKILL.md for Hermes:

```
~/.hermes/skills/codex-field-kit/prompts/
  planner/
    SKILL.md          # wraps prompts/planner.md with frontmatter
  parallel-task/
    SKILL.md
  codex-plan/
    SKILL.md
```

**Deliverables:**
- `fieldkit install prompt --hermes` -- wraps and installs prompts
- `fieldkit install prompt --codex` -- copies to `.codex/prompts/` (if Codex supports it)

### Phase 4: Unified CLI -- `bin/fieldkit.js` (LARGE)

New CLI that replaces the current fragmented installer scripts.

**Command structure:**
```
fieldkit install <type> [options] [items...]

  Types: skill | agent | prompt | all

  Options:
    --codex              Install to Codex (default if no target specified)
    --hermes             Install to Hermes
    --both               Install to both
    --user               User-global install (default)
    --project <path>     Project-scoped install
    --all                Install all items of the type
    --force              Overwrite existing
    --category <cat>     Filter by category

fieldkit list [type]              # List available items
fieldkit convert <type> --target <system>  # Convert formats
fieldkit discover                  # Show catalog with categories
```

**Implementation plan:**

1. Extract interactive TTY selection from `codexskills.js` into `lib/interactive.js`
2. Port agent indexing logic from `installer.sh` into `lib/install-agents.js`
3. Create `lib/targets.js` with path resolution per target system
4. Create `lib/registry.js` to scan repo and build asset catalog
5. Wire everything into `bin/fieldkit.js`
6. Make `installer.sh` and `codexskills.js` thin wrappers that call `fieldkit`

**Backward compatibility:**
- `installer.sh` becomes: `exec node bin/fieldkit.js install agent --codex "$@"`
- `codexskills.js` becomes: `exec node bin/fieldkit.js install skill --codex "$@"`
- Both continue to work exactly as before

### Phase 5: Hermes Integration Polish (SMALL)

1. Add `fieldkit setup --hermes` that:
   - Creates `~/.hermes/skills/codex-field-kit/` if needed
   - Adds `external_dirs` to `~/.hermes/config.yaml`
   - Runs agent conversion if not already done
   - Validates all SKILL.md files parse correctly

2. Create `fieldkit update` that:
   - Re-scans the repo for new/changed assets
   - Re-converts agents if source TOML files changed
   - Updates external_dirs if paths changed

3. Add a `SKILLS_MANIFEST.json` at repo root:
   ```json
   {
     "version": "0.2.0",
     "skills": {
       "planner": {"path": "skills/planner", "categories": ["planning"]},
       "architect": {"path": "skills-hermes/codex-agents/architect", "categories": ["architecture"]}
     }
   }
   ```

---

## 4. Files to Create

| File | Type | Size Est. | Phase |
|------|------|-----------|-------|
| `bin/fieldkit.js` | CLI entry point | 200 lines | 4 |
| `lib/targets.js` | Path adapter | 100 lines | 4 |
| `lib/registry.js` | Asset catalog | 150 lines | 4 |
| `lib/install-skills.js` | Skill installer | 150 lines | 4 |
| `lib/install-agents.js` | Agent installer | 200 lines | 4 |
| `lib/install-prompts.js` | Prompt installer | 80 lines | 4 |
| `lib/interactive.js` | TTY selector | 100 lines (extracted) | 4 |
| `lib/convert-agent.js` | TOML converter | 80 lines | 4 |
| `lib/banner.js` | Branding | 50 lines (extracted) | 4 |
| `scripts/convert-all-agents.py` | Batch converter | 60 lines | 2 |
| `skills-hermes/codex-agents/` | Converted output | ~400 dirs | 2 |

---

## 5. Files to Modify

| File | Change | Phase |
|------|--------|-------|
| `installer.sh` | Thin wrapper -> `fieldkit install agent --codex` | 4 |
| `bin/codexskills.js` | Thin wrapper -> `fieldkit install skill --codex` | 4 |
| `package.json` | Add `fieldkit` bin entry, keep `codexskills` | 4 |
| `README.md` | Document multi-target install | 5 |
| `AGENTS.md` | Update editing rules for new structure | 5 |

---

## 6. Verification Plan

### Phase 1 (Skills)
```bash
# Test Hermes external_dirs
echo 'skills:\n  external_dirs:\n    - ./skills' >> /tmp/test-hermes-config.yaml
# Verify hermes can scan and find skills

# Test codex install still works
node bin/codexskills.js --project . /tmp/test-codex-skills
ls /tmp/test-codex-skills/.codex/skills/
```

### Phase 2 (Agents)
```bash
# Run conversion
python3 scripts/convert-all-agents.py
# Verify output
find skills-hermes/codex-agents/ -name SKILL.md | wc -l  # Should be ~400
# Spot check a few
head -20 skills-hermes/codex-agents/architect/SKILL.md
```

### Phase 3 (Prompts)
```bash
ls skills-hermes/prompts/*/SKILL.md
```

### Phase 4 (Unified CLI)
```bash
node bin/fieldkit.js --help
node bin/fieldkit.js list skills
node bin/fieldkit.js install skill --hermes --all
node bin/fieldkit.js install agent --codex --category languages-runtime
node bin/fieldkit.js install all --both
```

### Phase 5 (Integration)
```bash
# Verify backward compat
./installer.sh all  # Should still work
node bin/codexskills.js --user ./skills  # Should still work

# Verify Hermes sees everything
hermes  # In session: /skills should list all field-kit skills
```

---

## 7. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Hermes external_dirs scanning is slow with 400+ skills | Medium | Use copy mode instead; or batch into categories |
| Converted agents lose context without model hints | Low | Add `model_preference` note in SKILL.md frontmatter |
| TOML parsing requires Python 3.11+ | Low | Node.js TOML parser as fallback |
| Breaking existing installer.sh behavior | Medium | Keep as thin wrapper; test thoroughly |
| Hermes changes skill format in future | Low | SKILL.md is stable, widely adopted |

---

## 8. Execution Order

```
1. Phase 1 (Skills)     -- Do first, immediate value, zero risk
2. Phase 2 (Agents)     -- Do second, batch conversion, moderate effort
3. Phase 3 (Prompts)    -- Do third, trivial, depends on Phase 4 for CLI
4. Phase 4 (CLI)        -- Do in parallel with 1-3, incrementally
5. Phase 5 (Polish)     -- Last, after everything works
```

Recommended start: Phase 1 (add `external_dirs` to Hermes config) + Phase 2 (run conversion script) simultaneously. These are independent and give immediate results.
