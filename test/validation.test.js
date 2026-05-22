import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, it } from 'node:test';
import {
  getBaseUrl,
  normalizeApprovalArgs,
  normalizeExpenseArgs,
  parseAmount,
  parseAttachments,
  parseConfirm,
  parseIsoDate,
  parseLimit,
  resolveTaskUrl,
} from '../lib/validation.js';

describe('configuration helpers', () => {
  it('normalizes the base URL without trailing slashes', () => {
    assert.equal(getBaseUrl({ BONC_OA_BASE_URL: 'https://oa.example.test///' }), 'https://oa.example.test');
  });
});

describe('primitive validation', () => {
  it('parses bounded limits', () => {
    assert.equal(parseLimit(undefined), 20);
    assert.equal(parseLimit('3'), 3);
    assert.throws(() => parseLimit('0'), /positive integer/);
    assert.throws(() => parseLimit('101'), /<= 100/);
  });

  it('parses confirm as an explicit true flag only', () => {
    assert.equal(parseConfirm(true), true);
    assert.equal(parseConfirm('true'), true);
    assert.equal(parseConfirm('TRUE'), true);
    assert.equal(parseConfirm(' true '), false);
    assert.equal(parseConfirm(1), false);
    assert.equal(parseConfirm('1'), false);
    assert.equal(parseConfirm('yes'), false);
    assert.equal(parseConfirm('false'), false);
    assert.equal(parseConfirm(undefined), false);
  });

  it('validates amount precision and positivity', () => {
    assert.equal(parseAmount('128.50'), '128.50');
    assert.throws(() => parseAmount('12.345'), /at most 2 decimals/);
    assert.throws(() => parseAmount('0'), /positive/);
  });

  it('validates ISO calendar dates', () => {
    assert.equal(parseIsoDate('2026-05-11'), '2026-05-11');
    assert.throws(() => parseIsoDate('2026-02-30'), /valid calendar date/);
    assert.throws(() => parseIsoDate('05/11/2026'), /YYYY-MM-DD/);
  });
});

describe('task URL resolution', () => {
  it('uses a configured detail URL template for task ids', () => {
    assert.equal(
      resolveTaskUrl('TASK 1', {
        BONC_OA_BASE_URL: 'https://oa.example.test',
        BONC_OA_TODO_DETAIL_URL_TEMPLATE: 'https://oa.example.test/todo/{taskId}',
      }),
      'https://oa.example.test/todo/TASK%201',
    );
  });

  it('accepts absolute task detail URLs', () => {
    assert.equal(
      resolveTaskUrl('https://oa.example.test/workflow?id=TASK-1', {
        BONC_OA_BASE_URL: 'https://oa.example.test',
      }),
      'https://oa.example.test/workflow?id=TASK-1',
    );
  });

  it('falls back to the base URL for opaque task ids without a template', () => {
    assert.equal(
      resolveTaskUrl('TASK-1', { BONC_OA_BASE_URL: 'https://oa.example.test///' }),
      'https://oa.example.test',
    );
  });

  it('requires a non-empty task id', () => {
    assert.throws(() => resolveTaskUrl('   '), /taskId cannot be empty/);
  });
});

describe('approval args', () => {
  it('keeps approval writes in preview mode by default', () => {
    const args = normalizeApprovalArgs({ taskId: 'TASK-1', comment: '同意' }, 'approve');
    assert.deepEqual(args, {
      taskId: 'TASK-1',
      comment: '同意',
      confirm: false,
      action: 'approve',
    });
  });

  it('requires reject comments', () => {
    assert.throws(() => normalizeApprovalArgs({ taskId: 'TASK-1' }, 'reject'), /comment cannot be empty/);
  });

  it('uses a default approval comment but still requires a task id', () => {
    assert.equal(normalizeApprovalArgs({ taskId: 'TASK-1' }, 'approve').comment, '同意');
    assert.throws(() => normalizeApprovalArgs({ comment: '同意' }, 'approve'), /taskId cannot be empty/);
  });
});

describe('expense args', () => {
  it('normalizes a preview expense submission', () => {
    const args = normalizeExpenseArgs({
      title: '差旅报销',
      amount: '128.50',
      date: '2026-05-11',
      category: 'travel',
      description: '客户现场支持',
    }, { BONC_OA_EXPENSE_FLOW_NAME: '费用报销' });
    assert.equal(args.flowName, '费用报销');
    assert.equal(args.confirm, false);
    assert.deepEqual(args.attachments, []);
  });

  it('resolves readable attachment paths', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bonc-oa-test-'));
    const file = path.join(dir, 'receipt.txt');
    fs.writeFileSync(file, 'mock receipt');
    const args = normalizeExpenseArgs({
      title: '差旅报销',
      amount: '128.50',
      date: '2026-05-11',
      category: 'travel',
      description: '客户现场支持',
      attachments: file,
      confirm: 'true',
    });
    assert.equal(args.confirm, true);
    assert.deepEqual(args.attachments, [file]);
    assert.deepEqual(parseAttachments(`${file}, ,`), [file]);
  });

  it('rejects missing attachments', () => {
    assert.throws(() => normalizeExpenseArgs({
      title: '差旅报销',
      amount: '128.50',
      date: '2026-05-11',
      category: 'travel',
      description: '客户现场支持',
      attachments: '/definitely/missing/file.pdf',
    }), /not a readable file/);
  });
});
