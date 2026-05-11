import * as fs from 'node:fs';
import * as path from 'node:path';

export const DEFAULT_BASE_URL = 'https://oa.bonc.com.cn';
export const SITE = 'bonc-oa';

export function getBaseUrl(env = process.env) {
  const raw = String(env.BONC_OA_BASE_URL || DEFAULT_BASE_URL).trim();
  return raw.replace(/\/+$/, '');
}

export function requireText(value, label) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!text) throw new Error(`${label} cannot be empty`);
  return text;
}

export function parseLimit(value, fallback = 20, max = 100) {
  const raw = value == null || value === '' ? fallback : Number(value);
  if (!Number.isInteger(raw) || raw <= 0) {
    throw new Error('limit must be a positive integer');
  }
  if (raw > max) {
    throw new Error(`limit must be <= ${max}`);
  }
  return raw;
}

export function parseConfirm(value) {
  return value === true || String(value ?? '').toLowerCase() === 'true';
}

export function parseAmount(value) {
  const text = requireText(value, 'amount');
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
    throw new Error('amount must be a positive number with at most 2 decimals');
  }
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('amount must be positive');
  }
  return text;
}

export function parseIsoDate(value) {
  const text = requireText(value, 'date');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error('date must be YYYY-MM-DD');
  }
  const date = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
    throw new Error('date must be a valid calendar date');
  }
  return text;
}

export function parseAttachments(raw) {
  if (raw == null || String(raw).trim() === '') return [];
  return String(raw)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const abs = path.resolve(item);
      const stat = fs.statSync(abs, { throwIfNoEntry: false });
      if (!stat || !stat.isFile()) {
        throw new Error(`attachment is not a readable file: ${abs}`);
      }
      return abs;
    });
}

export function normalizeExpenseArgs(kwargs, env = process.env) {
  const attachments = parseAttachments(kwargs.attachments);
  return {
    title: requireText(kwargs.title, 'title'),
    amount: parseAmount(kwargs.amount),
    date: parseIsoDate(kwargs.date),
    category: requireText(kwargs.category, 'category'),
    description: requireText(kwargs.description, 'description'),
    attachments,
    confirm: parseConfirm(kwargs.confirm),
    flowName: String(env.BONC_OA_EXPENSE_FLOW_NAME || 'Expense Reimbursement').trim(),
  };
}

export function normalizeApprovalArgs(kwargs, action) {
  return {
    taskId: requireText(kwargs.taskId, 'taskId'),
    comment: requireText(kwargs.comment ?? (action === 'approve' ? '同意' : ''), 'comment'),
    confirm: parseConfirm(kwargs.confirm),
    action,
  };
}
