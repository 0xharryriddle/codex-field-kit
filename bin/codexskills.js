#!/usr/bin/env node

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

function usage(exitCode = 1) {
  console.log(`codexskills - install Codex skills into user or project scope

Usage:
  npx codexskills --user <repo[/path] | local-path>
  npx codexskills --project <repo[/path] | local-path> [projectPath]

Examples:
  npx codexskills --user ./skills
  npx codexskills --project . ./my-repo
  npx codexskills --user ./skills --force
  npx codexskills --user am-will/codex-skills/skills/openai-docs-skill
  npx codexskills --user am-will/codex-skills/skills
  npx codexskills --project am-will/codex-skills/skills ./my-repo
  npx codexskills --user https://github.com/am-will/codex-skills/skills

Notes:
  - <repo> is in the form owner/repo (GitHub). You can append a path inside the repo.
  - You can also pass a local directory such as "." or "./skills".
  - If the source directory contains a top-level "skills/" directory, the installer uses that by default.
  - "--project" installs into <projectPath>/.codex/skills (defaults to CWD).
  - Existing installed skills are skipped by default. Use "--force" to overwrite them.
  - When multiple skills are found, you can interactively select which to install.
`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.length === 0) usage(0);

  let scope = null;
  let spec = null;
  let projectPath = null;
  let installAll = false;
  let force = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--user') {
      scope = 'user';
      spec = args[i + 1];
      i++;
    } else if (arg === '--project') {
      scope = 'project';
      spec = args[i + 1];
      i++;
      if (args[i + 1] && !args[i + 1].startsWith('--')) {
        projectPath = args[i + 1];
        i++;
      }
    } else if (arg === '--all') {
      installAll = true;
    } else if (arg === '--force') {
      force = true;
    } else if (arg === '-h' || arg === '--help') {
      usage(0);
    } else {
      // Allow legacy positionals like: codexskills owner/repo
      if (!spec) {
        spec = arg;
      } else if (!projectPath) {
        projectPath = arg;
      }
    }
  }

  if (!scope || !spec) {
    usage(1);
  }

  return { scope, spec, projectPath, installAll, force };
}

function splitRepoSpec(spec) {
  const cleaned = spec.replace(/^https?:\/\//, '').replace(/\.git$/, '');
  let parts = cleaned.split('/').filter(Boolean);

  // If the input is a full GitHub URL, drop the domain
  if (parts[0] && parts[0].includes('.')) {
    parts = parts.slice(1);
  }

  const owner = parts[0];
  const repo = parts[1];
  const subPath = parts.slice(2).join('/');

  if (!owner || !repo) {
    throw new Error('Invalid repo spec. Use owner/repo[/path].');
  }

  return {
    repoUrl: `https://github.com/${owner}/${repo}.git`,
    subPath
  };
}

function resolveLocalSpec(spec) {
  const resolved = path.resolve(spec);
  if (!fs.existsSync(resolved)) {
    return null;
  }

  return resolved;
}

function ensureCmd(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: 'ignore' });
  } catch {
    throw new Error(`Missing required command: ${cmd}`);
  }
}

async function pathExists(p) {
  try {
    await fsp.access(p);
    return true;
  } catch {
    return false;
  }
}

async function hasTrashCommand() {
  try {
    execSync('command -v trash', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function cleanupDir(dir) {
  if (await hasTrashCommand()) {
    try {
      execSync(`trash "${dir}"`, { stdio: 'ignore' });
      return;
    } catch {
      // Fall through to fs.rm
    }
  }
  await fsp.rm(dir, { recursive: true, force: true });
}

async function listSkillDirs(skillsRoot) {
  const entries = await fsp.readdir(skillsRoot, { withFileTypes: true });
  const dirs = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillDir = path.join(skillsRoot, entry.name);
    const skillFile = path.join(skillDir, 'SKILL.md');
    if (await pathExists(skillFile)) {
      dirs.push(skillDir);
    }
  }
  return dirs;
}

async function copyDir(src, dest) {
  await fsp.mkdir(dest, { recursive: true });
  await fsp.cp(src, dest, { recursive: true, force: true });
}

async function normalizeSourcePath(basePath) {
  const skillFile = path.join(basePath, 'SKILL.md');
  const defaultSkills = path.join(basePath, 'skills');

  if (!(await pathExists(skillFile)) && await pathExists(defaultSkills)) {
    return defaultSkills;
  }

  return basePath;
}

function bannerLines() {
  const pad = '  ';
  const main = [
    `${pad}█████ █████ █████ █████ █   █ █████ █   █ █████ █     █     █████`,
    `${pad}█     █   █ █   █ █      █ █  █     █  █    █   █     █     █`,
    `${pad}█     █   █ █   █ █████   █   █████ █ █     █   █     █     █████`,
    `${pad}█     █   █ █   █ █      █ █      █ ██      █   █     █         █`,
    `${pad}█     █   █ █   █ █     █   █     █ █ █     █   █     █         █`,
    `${pad}█████ █████ █████ █████ █   █ █████ █  █  █████ █████ █████ █████`,
  ];
  const shadow = [
    `${pad}  █████ █████ █████ █████ █   █ █████ █   █ █████ █     █     █████`,
    `${pad}  █     █   █ █   █ █      █ █  █     █  █    █   █     █     █`,
    `${pad}  █     █   █ █   █ █████   █   █████ █ █     █   █     █     █████`,
    `${pad}  █     █   █ █   █ █      █ █      █ ██      █   █     █         █`,
    `${pad}  █     █   █ █   █ █     █   █     █ █ █     █   █     █         █`,
    `${pad}  █████ █████ █████ █████ █   █ █████ █  █  █████ █████ █████ █████`,
  ];
  const cTop = '\u001b[38;5;209m';
  const cMid = '\u001b[38;5;203m';
  const cLow = '\u001b[38;5;208m';
  const cShadow = '\u001b[38;5;237m';
  const reset = '\u001b[0m';
  return [
    `${cShadow}${shadow[0]}${reset}`,
    `${cShadow}${shadow[1]}${reset}`,
    `${cTop}${main[0]}${reset}`,
    `${cTop}${main[1]}${reset}`,
    `${cMid}${main[2]}${reset}`,
    `${cMid}${main[3]}${reset}`,
    `${cLow}${main[4]}${reset}`,
    `${cLow}${main[5]}${reset}`,
    '',
  ];
}

function printBanner() {
  if (!process.stdout.isTTY) return;
  process.stdout.write(bannerLines().join('\n') + '\n');
}

function renderSelection(title, skills, index, selected) {
  const lines = [];
  lines.push(...bannerLines());
  const pad = '  ';
  lines.push(pad + title);
  lines.push(pad + 'Use \u2191/\u2193 to move, Space to toggle, A to toggle all, Enter to confirm.');
  lines.push('');
  for (let i = 0; i < skills.length; i++) {
    const cursor = i === index ? '>' : ' ';
    const mark = selected[i] ? '[x]' : '[ ]';
    lines.push(`${pad}${cursor} ${mark} ${skills[i]}`);
  }
  process.stdout.write('\x1b[2J\x1b[H' + lines.join('\n'));
}

function readKey() {
  return new Promise((resolve) => {
    const onData = (buf) => {
      const s = buf.toString('utf8');
      process.stdin.off('data', onData);
      resolve(s);
    };
    process.stdin.on('data', onData);
  });
}

async function promptSelectSkills(skillDirs) {
  if (!process.stdin.isTTY) {
    throw new Error('Multiple skills found but no TTY for selection. Use --all or specify a skill path.');
  }

  const names = skillDirs.map((dir) => path.basename(dir));
  const selected = new Array(names.length).fill(true);
  let index = 0;

  process.stdin.setRawMode(true);
  process.stdin.resume();

  try {
    while (true) {
      renderSelection('Select skills to install:', names, index, selected);
      const key = await readKey();

      if (key === '\u0003') { // Ctrl+C
        throw new Error('Aborted.');
      } else if (key === '\r' || key === '\n') {
        break;
      } else if (key === ' ') {
        selected[index] = !selected[index];
      } else if (key === 'a' || key === 'A') {
        const anyOff = selected.some((v) => !v);
        for (let i = 0; i < selected.length; i++) selected[i] = anyOff;
      } else if (key === '\x1b[A') {
        index = (index - 1 + names.length) % names.length;
      } else if (key === '\x1b[B') {
        index = (index + 1) % names.length;
      }
    }
  } finally {
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdout.write('\x1b[2J\x1b[H');
  }

  const picked = [];
  for (let i = 0; i < skillDirs.length; i++) {
    if (selected[i]) picked.push(skillDirs[i]);
  }

  if (picked.length === 0) {
    throw new Error('No skills selected.');
  }

  return picked;
}

async function installSkills({ scope, spec, projectPath, installAll, force }) {
  printBanner();

  const localSource = resolveLocalSpec(spec);
  let tmpBase = null;

  try {
    let sourcePath;

    if (localSource) {
      sourcePath = await normalizeSourcePath(localSource);
    } else {
      ensureCmd('git');
      const { repoUrl, subPath } = splitRepoSpec(spec);
      tmpBase = await fsp.mkdtemp(path.join(os.tmpdir(), 'codexskills-'));
      execSync(`git clone --depth 1 ${repoUrl} ${tmpBase}`, { stdio: 'inherit' });

      sourcePath = subPath ? path.join(tmpBase, subPath) : tmpBase;
      sourcePath = await normalizeSourcePath(sourcePath);
    }

    if (!(await pathExists(sourcePath))) {
      throw new Error(`Path not found: ${sourcePath}`);
    }

    const targetRoot = scope === 'user'
      ? path.join(os.homedir(), '.codex', 'skills')
      : path.join(projectPath ? path.resolve(projectPath) : process.cwd(), '.codex', 'skills');

    await fsp.mkdir(targetRoot, { recursive: true });

    const srcStat = await fsp.stat(sourcePath);
    const installed = [];
    const skipped = [];

    if (srcStat.isDirectory()) {
      const skillFile = path.join(sourcePath, 'SKILL.md');
      if (await pathExists(skillFile)) {
        const dest = path.join(targetRoot, path.basename(sourcePath));
        if (!force && await pathExists(dest)) {
          skipped.push(dest);
        } else {
          await copyDir(sourcePath, dest);
          installed.push(dest);
        }
      } else {
        const skillDirs = await listSkillDirs(sourcePath);
        if (skillDirs.length === 0) {
          throw new Error('No skills found. Ensure SKILL.md exists in each skill folder.');
        }
        const picked = installAll ? skillDirs : await promptSelectSkills(skillDirs);
        for (const skillDir of picked) {
          const dest = path.join(targetRoot, path.basename(skillDir));
          if (!force && await pathExists(dest)) {
            skipped.push(dest);
            continue;
          }
          await copyDir(skillDir, dest);
          installed.push(dest);
        }
      }
    } else {
      throw new Error('Source path is not a directory.');
    }

    if (installed.length > 0) {
      console.log('Installed:');
      for (const dest of installed) {
        console.log(`- ${dest}`);
      }
    }

    if (skipped.length > 0) {
      console.log('Skipped existing:');
      for (const dest of skipped) {
        console.log(`- ${dest}`);
      }
    }

    if (installed.length === 0 && skipped.length === 0) {
      console.log('No skills were installed.');
    }
  } finally {
    if (tmpBase) {
      try {
        await cleanupDir(tmpBase);
      } catch (err) {
        console.warn(`Warning: unable to clean up temp dir: ${tmpBase}`);
      }
    }
  }
}

(async () => {
  try {
    const args = parseArgs(process.argv);
    await installSkills(args);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
})();
