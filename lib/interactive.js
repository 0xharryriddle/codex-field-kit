'use strict';

/**
 * Interactive TTY multi-select UI.
 * Extracted from codexskills.js for reuse.
 */

function renderSelection(title, items, index, selected) {
  const lines = [''];
  lines.push('  ' + title);
  lines.push('  Use \x1b[A/\x1b[B to move, Space to toggle, A to toggle all, Enter to confirm.');
  lines.push('');
  for (let i = 0; i < items.length; i++) {
    const cursor = i === index ? '>' : ' ';
    const mark = selected[i] ? '[x]' : '[ ]';
    lines.push(`  ${cursor} ${mark} ${items[i]}`);
  }
  process.stdout.write('\x1b[2J\x1b[H' + lines.join('\n'));
}

function readKey() {
  return new Promise((resolve) => {
    const onData = (buf) => {
      process.stdin.off('data', onData);
      resolve(buf.toString('utf8'));
    };
    process.stdin.on('data', onData);
  });
}

/**
 * Prompt user to select items from a list.
 * Returns array of selected indices.
 */
async function promptSelect(items, title = 'Select items to install:') {
  if (!process.stdin.isTTY) {
    throw new Error('Multiple items found but no TTY for selection. Use --all or specify items by name.');
  }

  const selected = new Array(items.length).fill(true);
  let index = 0;

  process.stdin.setRawMode(true);
  process.stdin.resume();

  try {
    while (true) {
      renderSelection(title, items, index, selected);
      const key = await readKey();

      if (key === '\u0003') {
        throw new Error('Aborted.');
      } else if (key === '\r' || key === '\n') {
        break;
      } else if (key === ' ') {
        selected[index] = !selected[index];
      } else if (key === 'a' || key === 'A') {
        const anyOff = selected.some((v) => !v);
        for (let i = 0; i < selected.length; i++) selected[i] = anyOff;
      } else if (key === '\x1b[A') {
        index = (index - 1 + items.length) % items.length;
      } else if (key === '\x1b[B') {
        index = (index + 1) % items.length;
      }
    }
  } finally {
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdout.write('\x1b[2J\x1b[H');
  }

  const picked = [];
  for (let i = 0; i < items.length; i++) {
    if (selected[i]) picked.push(i);
  }

  if (picked.length === 0) {
    throw new Error('No items selected.');
  }

  return picked;
}

module.exports = { promptSelect };
