'use strict';

const path = require('path');
const os = require('os');

/**
 * Target adapter: maps asset types to the correct paths per target system.
 */

const TARGETS = {
  codex: {
    name: 'Codex',
    userSkills: path.join(os.homedir(), '.codex', 'skills'),
    userAgents: path.join(os.homedir(), '.codex', 'agents'),
    userPrompts: path.join(os.homedir(), '.codex', 'prompts'),
    projectSkills: (projectPath) => path.join(projectPath, '.codex', 'skills'),
    projectAgents: (projectPath) => path.join(projectPath, '.codex', 'agents'),
    projectPrompts: (projectPath) => path.join(projectPath, '.codex', 'prompts'),
    agentFormat: 'toml',
    skillFormat: 'skill-md',
  },
  hermes: {
    name: 'Hermes',
    userSkills: path.join(os.homedir(), '.hermes', 'skills'),
    userAgents: path.join(os.homedir(), '.hermes', 'skills'),
    userPrompts: path.join(os.homedir(), '.hermes', 'skills'),
    projectSkills: (projectPath) => path.join(projectPath, '.hermes', 'skills'),
    projectAgents: (projectPath) => path.join(projectPath, '.hermes', 'skills'),
    projectPrompts: (projectPath) => path.join(projectPath, '.hermes', 'skills'),
    agentFormat: 'skill-md',
    skillFormat: 'skill-md',
    configPath: path.join(os.homedir(), '.hermes', 'config.yaml'),
  },
};

/**
 * Get the install path for a given asset type, target, and scope.
 */
function getInstallPath(target, assetType, scope) {
  const t = TARGETS[target];
  if (!t) throw new Error(`Unknown target: ${target}. Use 'codex' or 'hermes'.`);

  const key = scope.type === 'user' ? `user${capitalize(assetType)}` : `project${capitalize(assetType)}`;

  if (scope.type === 'project') {
    const fn = t[key];
    if (typeof fn === 'function') return fn(scope.path);
    return path.join(scope.path, `.${target}`, assetType);
  }

  return t[key];
}

/**
 * Get a subdirectory path for Hermes skills (category grouping).
 * For Hermes, skills/agents/prompts all go under skills/<group>/.
 */
function getHermesInstallPath(assetType, scope) {
  const base = scope.type === 'user'
    ? path.join(os.homedir(), '.hermes', 'skills')
    : path.join(scope.path, '.hermes', 'skills');

  const groupMap = {
    skills: 'codex-field-kit',
    agents: 'codex-agents',
    prompts: 'codex-prompts',
  };

  return path.join(base, groupMap[assetType] || assetType);
}

/**
 * Resolve all targets from CLI flags.
 */
function resolveTargets(flags) {
  if (flags.both) return ['codex', 'hermes'];
  if (flags.hermes) return ['hermes'];
  return ['codex'];
}

/**
 * Resolve scope from CLI flags.
 */
function resolveScope(flags) {
  if (flags.project) {
    return { type: 'project', path: path.resolve(flags.project) };
  }
  return { type: 'user' };
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

module.exports = {
  TARGETS,
  getInstallPath,
  getHermesInstallPath,
  resolveTargets,
  resolveScope,
};
