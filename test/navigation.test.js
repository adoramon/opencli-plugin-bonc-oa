import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isOaUrl } from '../lib/navigation.js';
import { OA_BROWSER_OPTIONS } from '../lib/command-options.js';

describe('browser session options', () => {
  it('keeps BONC OA commands in a site-scoped browser workspace', () => {
    assert.deepEqual(OA_BROWSER_OPTIONS, {
      navigateBefore: false,
      siteSession: 'persistent',
    });
  });
});

describe('OA URL detection', () => {
  it('accepts BONC OA pages and rejects unrelated URLs', () => {
    assert.equal(isOaUrl('https://oa.bonc.com.cn/r/w'), true);
    assert.equal(isOaUrl('https://oa.bonc.com.cn/'), true);
    assert.equal(isOaUrl('about:blank'), false);
    assert.equal(isOaUrl('https://example.test/'), false);
  });
});
