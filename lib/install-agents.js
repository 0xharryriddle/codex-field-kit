'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { getInstallPath, getHermesInstallPath } = require('./targets');

/**
 * Install agents to a target system.
 *
 * For Codex: copies TOML files to ~/.codex/agents/
 * For Hermes: converts TOML to SKILL.md and installs to ~/.hermes/skills/codex-agents/
 */

async function pathExists(p) {
  try { await fsp.access(p); return true; } catch { return false; }
}

/**
 * Convert TOML agent content to SKILL.md format.
 */
function escapeYamlString(str) {
  // Escape double quotes and wrap in quotes for YAML safety
  return '"' + str.replace(/\\/g, '\\\\').replace(/"/g, "'").slice(0, 200) + '"';
}

function convertTomlToSkillMd(tomlContent, name, category) {
  const desc = extractField(tomlContent, 'description') || `Codex agent: ${name}`;
  const instructions = extractField(tomlContent, 'developer_instructions') || '';
  const title = name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const body = instructions || `Agent role: ${name}\nModel: ${extractField(tomlContent, 'model') || 'default'}`;

  return `---
name: ${name}
description: ${escapeYamlString(desc)}
metadata:
  hermes:
    tags: [codex-agent, ${category || 'root'}]
    source: codex-field-kit/${category || 'root'}
---

# ${title}

${body}
`;
}

/**
 * Simple TOML field extractor for single-line and multi-line strings.
 */
function extractField(content, field) {
  // Multi-line: field = """..."""
  const mlRe = new RegExp(`${field}\\s*=\\s*"""([\\s\\S]*?)"""`);
  const mlMatch = content.match(mlRe);
  if (mlMatch) return mlMatch[1].trim();

  // Single-line: field = "..."
  const slRe = new RegExp(`^${field}\\s*=\\s*"([^"]*)"`, 'm');
  const slMatch = content.match(slRe);
  if (slMatch) return slMatch[1];

  return null;
}

async function installAgents(agentFiles, opts) {
  const { targets, scope, force } = opts;
  const installed = [];
  const skipped = [];

  for (const target of targets) {
    for (const agent of agentFiles) {
      const content = await fsp.readFile(agent.path, 'utf8');
      const stem = path.basename(agent.path, '.toml');
      const category = agent.category || 'root';

      if (target === 'codex') {
        // Copy TOML directly to Codex agents dir
        const destDir = getInstallPath(target, 'agents', scope);
        await fsp.mkdir(destDir, { recursive: true });
        const dest = path.join(destDir, `${stem}.toml`);

        if (!force && await pathExists(dest)) {
          skipped.push({ target, name: agent.name });
          continue;
        }

        await fsp.copyFile(agent.path, dest);
        installed.push({ target, name: agent.name, path: dest });

      } else if (target === 'hermes') {
        // Convert TOML to SKILL.md and install to Hermes skills
        const destDir = getHermesInstallPath('agents', scope);
        const skillDir = path.join(destDir, stem);
        await fsp.mkdir(skillDir, { recursive: true });
        const skillMd = path.join(skillDir, 'SKILL.md');

        if (!force && await pathExists(skillMd)) {
          skipped.push({ target, name: agent.name });
          continue;
        }

        const converted = convertTomlToSkillMd(content, stem, category);
        await fsp.writeFile(skillMd, converted, 'utf8');
        installed.push({ target, name: agent.name, path: skillMd });
      }
    }
  }

  return { installed, skipped };
}

module.exports = { installAgents };
