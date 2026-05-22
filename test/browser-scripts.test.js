import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { autoLoginScript, openWorkbenchScript, todosScript } from '../lib/browser-scripts.js';

describe('browser login script', () => {
  it('attempts only prefilled browser login without returning credentials', () => {
    const source = autoLoginScript();

    assert.match(source, /prefilled-credentials-not-found/);
    assert.match(source, /captcha-required/);
    assert.match(source, /clicked-login/);
    assert.doesNotMatch(source, /password:\s*password\.value/);
    assert.doesNotMatch(source, /account:\s*account\.value/);
  });

  it('can inject one-shot credentials without adding them to result fields', () => {
    const source = autoLoginScript({ username: 'u-123', password: 'p-456' });

    assert.match(source, /"username":"u-123"/);
    assert.match(source, /"password":"p-456"/);
    assert.match(source, /setValue\(account, credentials\.username\)/);
    assert.match(source, /setValue\(password, credentials\.password\)/);
    assert.doesNotMatch(source, /return \{[^}]*username/s);
    assert.doesNotMatch(source, /return \{[^}]*password/s);
  });
});

describe('browser todos scripts', () => {
  it('prefers the workbench dataFrame task table before generic scraping', () => {
    const source = todosScript(3);

    assert.match(source, /#tableData tr\.tdata/);
    assert.match(source, /replace\(\/\^tr-/);
    assert.match(source, /searchParams\.delete\('sid'\)/);
    assert.match(source, /taskInstId/);
    assert.match(source, /workbench frames are expected to be same-origin/);
  });

  it('opens the workbench entry when it is not already loaded', () => {
    const source = openWorkbenchScript();

    assert.match(source, /workbench_main_page/);
    assert.match(source, /obj_c867594519be463faadfe4e4a9aa25d1/);
    assert.match(source, /clicked-workbench/);
    assert.match(source, /workbench-entry-not-found/);
  });
});
