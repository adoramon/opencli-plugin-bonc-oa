import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { autoLoginScript } from '../lib/browser-scripts.js';

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
