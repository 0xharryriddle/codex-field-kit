'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { getInstallPath, getHermesInstallPath } = require('./targets');

/**
 * Install prompts to a target system.
 *
 * For Codex: copies markdown files to ~/.codex/prompts/
 * For Hermes: wraps as SKILL.md and installs to ~/.hermes/skills/codex-prompts/
 */

async function pathExists(p) {
  try { await fsp.access(p); return true; } catch { return false; }
}

/**
 * Wrap a prompt markdown file as a SKILL.md.
 */
function wrapPromptAsSkillMd(content, name) {
  const title = name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  // Extract first meaningful line as description
  let desc = `Codex prompt template: ${name}`;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('---')) {
      desc = trimmed.slice(0, 120);
      break;
    }
  }

  return `---
name: ${name}
description: ${desc.replace(/"/g, "'")}
metadata:
  hermes:
    tags: [codex-prompt, planning]
    source: codex-field-kit/prompts
---

# ${title}

${content}
`;
}

async function installPrompts(promptFiles, opts) {
  const { targets, scope, force } = opts;
  const installed = [];
  const skipped = [];

  for (const target of targets) {
    for (const prompt of promptFiles) {
      const content = await fsp.readFile(prompt.path, 'utf8');
      const stem = path.basename(prompt.path, '.md');

      if (target === 'codex') {
        // Copy markdown directly
        const destDir = getInstallPath(target, 'prompts', scope);
        await fsp.mkdir(destDir, { recursive: true });
        const dest = path.join(destDir, `${stem}.md`);

        if (!force && await pathExists(dest)) {
          skipped.push({ target, name: prompt.name });
          continue;
        }

        await fsp.writeFile(dest, content, 'utf8');
        installed.push({ target, name: prompt.name, path: dest });

      } else if (target === 'hermes') {
        // Wrap as SKILL.md
        const destDir = getHermesInstallPath('prompts', scope);
        const skillDir = path.join(destDir, stem);
        await fsp.mkdir(skillDir, { recursive: true });
        const skillMd = path.join(skillDir, 'SKILL.md');

        if (!force && await pathExists(skillMd)) {
          skipped.push({ target, name: prompt.name });
          continue;
        }

        const wrapped = wrapPromptAsSkillMd(content, stem);
        await fsp.writeFile(skillMd, wrapped, 'utf8');
        installed.push({ target, name: prompt.name, path: skillMd });
      }
    }
  }

  return { installed, skipped };
}

module.exports = { installPrompts };
