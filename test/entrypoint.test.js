import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import { describe, it } from 'node:test';

const commandExports = [
  'statusCommand',
  'todosCommand',
  'todoCommand',
  'approveCommand',
  'rejectCommand',
  'submitExpenseCommand',
];

describe('plugin entrypoint', () => {
  it('points package and plugin metadata at the public ESM entrypoint', () => {
    const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    const manifest = JSON.parse(fs.readFileSync(new URL('../opencli-plugin.json', import.meta.url), 'utf8'));

    assert.equal(pkg.type, 'module');
    assert.equal(pkg.main, './index.js');
    assert.equal(pkg.exports, './index.js');
    assert.equal(manifest.main, './index.js');
  });

  it('exports every command from the entrypoint source', () => {
    const source = fs.readFileSync(new URL('../index.js', import.meta.url), 'utf8');

    for (const name of commandExports) {
      assert.match(source, new RegExp(`\\b${name}\\b`));
    }
    assert.match(source, /export const commands = \[/);
    assert.match(source, /export default commands/);
  });

  it('configures commands to use the shared BONC OA browser session', () => {
    for (const file of ['status.js', 'todos.js', 'todo.js', 'approval.js', 'submit-expense.js']) {
      const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
      assert.match(source, /OA_BROWSER_OPTIONS/);
    }
  });

  it('adds shared one-shot login args to browser commands', () => {
    for (const file of ['status.js', 'todos.js', 'todo.js', 'approval.js', 'submit-expense.js']) {
      const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
      assert.match(source, /LOGIN_ARGS/);
    }
  });
});
