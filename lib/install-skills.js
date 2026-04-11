'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { getInstallPath, getHermesInstallPath } = require('./targets');

/**
 * Install skills to a target system.
 *
 * @param {string[]} skillDirs - Array of absolute paths to skill directories
 * @param {object} opts - { targets, scope, force }
 */

async function pathExists(p) {
  try { await fsp.access(p); return true; } catch { return false; }
}

async function copyDir(src, dest) {
  await fsp.mkdir(dest, { recursive: true });
  await fsp.cp(src, dest, { recursive: true, force: true });
}

/**
 * Update Hermes config.yaml to add an external_dirs entry.
 */
async function addHermesExternalDir(dirPath) {
  const os = require('os');
  const configPath = path.join(os.homedir(), '.hermes', 'config.yaml');

  if (!(await pathExists(configPath))) {
    console.log(`  Warning: Hermes config not found at ${configPath}`);
    return false;
  }

  const content = await fsp.readFile(configPath, 'utf8');

  // Simple check: does the path already appear in external_dirs?
  if (content.includes(dirPath)) {
    return false; // Already present
  }

  // Add to external_dirs list
  // Find the line with "external_dirs:" and add after it
  const lines = content.split('\n');
  const newLines = [];
  let inExternalDirs = false;
  let added = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^skills:/)) {
      inExternalDirs = false;
    }
    if (line.match(/^\s+external_dirs:/)) {
      inExternalDirs = true;
      newLines.push(line);
      continue;
    }
    if (inExternalDirs && line.match(/^\s+-\s/) && !added) {
      newLines.push(line);
      continue;
    }
    if (inExternalDirs && !line.match(/^\s/) && line.trim() !== '') {
      // End of external_dirs section
      newLines.push(`    - ${dirPath}`);
      added = true;
      inExternalDirs = false;
    }
    if (inExternalDirs && !line.match(/^\s+-\s/) && line.trim() === '') {
      newLines.push(`    - ${dirPath}`);
      added = true;
      inExternalDirs = false;
    }
    newLines.push(line);
  }

  if (!added && inExternalDirs) {
    newLines.push(`    - ${dirPath}`);
    added = true;
  }

  if (added) {
    await fsp.writeFile(configPath, newLines.join('\n'), 'utf8');
  }

  return added;
}

async function installSkills(skillDirs, opts) {
  const { targets, scope, force } = opts;
  const installed = [];
  const skipped = [];

  for (const target of targets) {
    let targetRoot;

    if (target === 'hermes' && scope.type === 'user') {
      // For Hermes user-scope, use the field-kit group subdir
      targetRoot = getHermesInstallPath('skills', scope);
    } else {
      targetRoot = getInstallPath(target, 'skills', scope);
    }

    await fsp.mkdir(targetRoot, { recursive: true });

    for (const skillDir of skillDirs) {
      const dest = path.join(targetRoot, path.basename(skillDir));

      if (!force && await pathExists(dest)) {
        skipped.push({ target, name: path.basename(skillDir), path: dest });
        continue;
      }

      await copyDir(skillDir, dest);
      installed.push({ target, name: path.basename(skillDir), path: dest });
    }

    // For Hermes: also add the parent dir to external_dirs config
    if (target === 'hermes' && scope.type === 'user') {
      const added = await addHermesExternalDir(targetRoot);
      if (added) {
        console.log(`  Added ${targetRoot} to Hermes external_dirs`);
      }
    }
  }

  return { installed, skipped };
}

module.exports = { installSkills };
