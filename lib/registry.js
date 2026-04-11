'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

/**
 * Asset registry: scans the repo for available skills, agents, and prompts.
 */

async function pathExists(p) {
  try {
    await fsp.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Scan for skills (directories containing SKILL.md).
 */
async function scanSkills(skillsDir) {
  const items = [];
  if (!(await pathExists(skillsDir))) return items;

  const entries = await fsp.readdir(skillsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillMd = path.join(skillsDir, entry.name, 'SKILL.md');
    if (await pathExists(skillMd)) {
      const content = await fsp.readFile(skillMd, 'utf8');
      const desc = extractDescription(content);
      items.push({
        name: entry.name,
        path: path.join(skillsDir, entry.name),
        description: desc,
        type: 'skill',
      });
    }
  }

  return items.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Scan for agents (TOML files).
 */
async function scanAgents(agentsDir) {
  const items = [];
  if (!(await pathExists(agentsDir))) return items;

  async function walk(dir, prefix) {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath, prefix ? `${prefix}/${entry.name}` : entry.name);
      } else if (entry.name.endsWith('.toml')) {
        const stem = entry.name.replace(/\.toml$/, '');
        const content = await fsp.readFile(fullPath, 'utf8');
        const desc = extractTomlField(content, 'description') || `Codex agent: ${stem}`;
        items.push({
          name: prefix ? `${prefix}/${stem}` : stem,
          path: fullPath,
          description: desc,
          type: 'agent',
          category: prefix || 'root',
        });
      }
    }
  }

  await walk(agentsDir, '');
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Scan for prompts (markdown files).
 */
async function scanPrompts(promptsDir) {
  const items = [];
  if (!(await pathExists(promptsDir))) return items;

  const entries = await fsp.readdir(promptsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    if (entry.name === 'README.md') continue;
    const stem = entry.name.replace(/\.md$/, '');
    const content = await fsp.readFile(path.join(promptsDir, entry.name), 'utf8');
    items.push({
      name: stem,
      path: path.join(promptsDir, entry.name),
      description: extractDescription(content),
      type: 'prompt',
    });
  }

  return items.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Extract description from SKILL.md frontmatter or first text line.
 */
function extractDescription(content) {
  // Try YAML frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const descMatch = fmMatch[1].match(/^description:\s*(.+)/m);
    if (descMatch) return descMatch[1].trim().replace(/^["']|["']$/g, '');
  }
  // Fall back to first non-empty, non-heading line
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('---')) {
      return trimmed.slice(0, 120);
    }
  }
  return 'No description available.';
}

/**
 * Extract a TOML field value (simple single-line strings only).
 */
function extractTomlField(content, field) {
  const re = new RegExp(`^${field}\\s*=\\s*"([^"]*)"`, 'm');
  const match = content.match(re);
  return match ? match[1] : null;
}

/**
 * Filter items by category.
 */
function filterByCategory(items, category) {
  if (!category) return items;
  const lower = category.toLowerCase();
  return items.filter(item => {
    const cat = item.category || '';
    return cat.toLowerCase().includes(lower) || item.name.toLowerCase().includes(lower);
  });
}

/**
 * Filter items by name list.
 */
function filterByNames(items, names) {
  if (!names || names.length === 0) return items;
  const nameSet = new Set(names.map(n => n.toLowerCase()));
  return items.filter(item => {
    const lower = item.name.toLowerCase();
    const stem = lower.split('/').pop();
    return nameSet.has(lower) || nameSet.has(stem);
  });
}

module.exports = {
  scanSkills,
  scanAgents,
  scanPrompts,
  filterByCategory,
  filterByNames,
};
