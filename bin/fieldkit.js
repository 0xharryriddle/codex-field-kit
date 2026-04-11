#!/usr/bin/env node

'use strict';

const path = require('path');
const os = require('os');
const { printBanner } = require('../lib/banner');
const { resolveTargets, resolveScope } = require('../lib/targets');
const { scanSkills, scanAgents, scanPrompts, filterByCategory, filterByNames } = require('../lib/registry');
const { installSkills } = require('../lib/install-skills');
const { installAgents } = require('../lib/install-agents');
const { installPrompts } = require('../lib/install-prompts');
const { promptSelect } = require('../lib/interactive');

const ROOT_DIR = path.resolve(__dirname, '..');

function usage(exitCode = 0) {
  printBanner();
  console.log(`fieldkit - universal installer for Codex Field Kit assets

Usage:
  fieldkit install <type> [options] [items...]
  fieldkit list <type> [options]
  fieldkit convert agents --target hermes

Types:
  skill       Install SKILL.md skill directories
  agent       Install TOML agent definitions
  prompt      Install prompt templates
  all         Install all asset types

Options:
  --codex             Install to Codex (default)
  --hermes            Install to Hermes
  --both              Install to both systems
  --user              User-global install (default)
  --project <path>    Project-scoped install
  --all               Install all items of the type
  --force             Overwrite existing files
  --category <cat>    Filter by category (e.g., "languages-runtime")
  --dry-run           Show what would be installed

Examples:
  fieldkit install skill --hermes --all
  fieldkit install agent --codex --category languages-runtime
  fieldkit install agent --hermes debugger architect
  fieldkit install prompt --both
  fieldkit install all --both --all
  fieldkit list skills
  fieldkit list agents --category frontend-ui
  fieldkit convert agents --target hermes

Legacy compatibility:
  ./installer.sh all                          (same as: fieldkit install agent --codex --all)
  node bin/codexskills.js --user ./skills      (same as: fieldkit install skill --codex --all)
`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.length === 0) usage(0);

  const result = {
    command: null,
    type: null,
    targets: [],
    scope: null,
    all: false,
    force: false,
    dryRun: false,
    category: null,
    items: [],
    convertTarget: null,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      usage(0);
    } else if (arg === 'install' || arg === 'list' || arg === 'convert') {
      result.command = arg;
    } else if (['skill', 'skills', 'agent', 'agents', 'prompt', 'prompts', 'all'].includes(arg)) {
      result.type = arg.replace(/s$/, '').replace('all', 'all');
    } else if (arg === '--codex') {
      result.targets.push('codex');
    } else if (arg === '--hermes') {
      result.targets.push('hermes');
    } else if (arg === '--both') {
      result.targets = ['codex', 'hermes'];
    } else if (arg === '--user') {
      result.scope = { type: 'user' };
    } else if (arg === '--project') {
      result.scope = { type: 'project', path: args[++i] };
    } else if (arg === '--all') {
      result.all = true;
    } else if (arg === '--force') {
      result.force = true;
    } else if (arg === '--dry-run') {
      result.dryRun = true;
    } else if (arg === '--category') {
      result.category = args[++i];
    } else if (arg === '--target') {
      result.convertTarget = args[++i];
    } else if (!arg.startsWith('--')) {
      result.items.push(arg);
    }
    i++;
  }

  // Defaults
  if (result.targets.length === 0) result.targets = ['codex'];
  if (!result.scope) result.scope = { type: 'user' };
  if (!result.command) {
    if (result.items.length > 0 || result.all) {
      result.command = 'install';
    } else {
      usage(1);
    }
  }

  return result;
}

async function getAssetItems(type, rootDir) {
  switch (type) {
    case 'skill':
      return scanSkills(path.join(rootDir, 'skills'));
    case 'agent':
      return scanAgents(path.join(rootDir, 'agents'));
    case 'prompt':
      return scanPrompts(path.join(rootDir, 'prompts'));
    default:
      throw new Error(`Unknown type: ${type}`);
  }
}

async function runList(args) {
  const type = args.type || 'skill';
  let items = await getAssetItems(type, ROOT_DIR);

  if (args.category) {
    items = filterByCategory(items, args.category);
  }

  console.log(`\nAvailable ${type}s (${items.length}):\n`);

  for (const item of items) {
    const cat = item.category ? ` [${item.category}]` : '';
    console.log(`  ${item.name}${cat}`);
    if (item.description) {
      console.log(`    ${item.description.slice(0, 100)}`);
    }
  }
  console.log('');
}

async function runInstall(args) {
  const types = args.type === 'all' ? ['skill', 'agent', 'prompt'] : [args.type];

  for (const type of types) {
    let items = await getAssetItems(type, ROOT_DIR);

    // Filter
    if (args.category) {
      items = filterByCategory(items, args.category);
    }
    if (args.items.length > 0) {
      items = filterByNames(items, args.items);
    }

    if (items.length === 0) {
      console.log(`No ${type}s found matching criteria.`);
      continue;
    }

    // Select items
    let selected = items;
    if (!args.all && args.items.length === 0 && items.length > 1) {
      const names = items.map(i => i.name);
      const indices = await promptSelect(names, `Select ${type}s to install:`);
      selected = indices.map(i => items[i]);
    }

    if (args.dryRun) {
      console.log(`\nDry run -- would install ${selected.length} ${type}s to: ${args.targets.join(', ')}`);
      for (const item of selected) {
        console.log(`  ${item.name}`);
      }
      continue;
    }

    console.log(`\nInstalling ${selected.length} ${type}s to ${args.targets.join(', ')}...\n`);

    let result;
    switch (type) {
      case 'skill':
        result = await installSkills(
          selected.map(i => i.path),
          { targets: args.targets, scope: args.scope, force: args.force }
        );
        break;
      case 'agent':
        result = await installAgents(
          selected,
          { targets: args.targets, scope: args.scope, force: args.force }
        );
        break;
      case 'prompt':
        result = await installPrompts(
          selected,
          { targets: args.targets, scope: args.scope, force: args.force }
        );
        break;
    }

    if (result) {
      for (const inst of result.installed) {
        console.log(`  Installed: ${inst.name} -> ${inst.target}`);
      }
      for (const skip of result.skipped) {
        console.log(`  Skipped (exists): ${skip.name} @ ${skip.target}`);
      }
      console.log(`\n  ${result.installed.length} installed, ${result.skipped.length} skipped`);
    }
  }
}

async function runConvert(args) {
  if (!args.convertTarget) {
    console.error('Error: --target <hermes|codex> required for convert');
    process.exit(1);
  }

  if (args.type === 'agent' || args.type === 'agents') {
    console.log(`Converting agents to ${args.convertTarget} format...`);
    const { spawnSync } = require('child_process');
    const script = path.join(ROOT_DIR, 'scripts', 'convert-all-agents.py');
    const result = spawnSync('python3', [script], { stdio: 'inherit', cwd: ROOT_DIR });
    if (result.status !== 0) {
      console.error('Conversion failed.');
      process.exit(1);
    }
    console.log('Conversion complete. Run "fieldkit install agent --hermes --all" to install.');
  } else {
    console.error('Only agent conversion is currently supported.');
    process.exit(1);
  }
}

async function main() {
  try {
    const args = parseArgs(process.argv);

    switch (args.command) {
      case 'list':
        await runList(args);
        break;
      case 'install':
        await runInstall(args);
        break;
      case 'convert':
        await runConvert(args);
        break;
      default:
        usage(1);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
