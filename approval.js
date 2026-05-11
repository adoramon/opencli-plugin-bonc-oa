import { AuthRequiredError, CommandExecutionError, ArgumentError } from '@jackwener/opencli/errors';
import { cli, Strategy } from '@jackwener/opencli/registry';
import { getBaseUrl, normalizeApprovalArgs, SITE } from './lib/validation.js';
import { approvalScript, detailScript, statusScript } from './lib/browser-scripts.js';

function resolveTodoUrl(taskId) {
  const template = process.env.BONC_OA_TODO_DETAIL_URL_TEMPLATE;
  if (template) return template.replace(/\{taskId\}/g, encodeURIComponent(taskId));
  if (/^https?:\/\//i.test(taskId)) return taskId;
  return getBaseUrl();
}

function normalize(kwargs, action) {
  try {
    return normalizeApprovalArgs(kwargs, action);
  } catch (error) {
    throw new ArgumentError(error.message);
  }
}

async function runApproval(page, kwargs, action) {
  const data = normalize(kwargs, action);
  await page.goto(resolveTodoUrl(data.taskId), { waitUntil: 'load', settleMs: 4000 });
  const state = await page.evaluate(statusScript());
  if (!state?.loggedIn) {
    throw new AuthRequiredError('oa.bonc.com.cn', 'Open BONC OA in Chrome and complete login, then retry.');
  }
  const detailRows = await page.evaluate(detailScript(data.taskId));
  const detail = Array.isArray(detailRows) ? detailRows[0] : {};
  if (!data.confirm) {
    return [{
      taskId: data.taskId,
      action,
      confirmed: false,
      status: 'preview',
      message: `${action} preview only; rerun with --confirm true to submit. ${detail?.title || ''}`.trim(),
      url: detail?.url || resolveTodoUrl(data.taskId),
    }];
  }
  const result = await page.evaluate(approvalScript(action, data.comment, true));
  if (!result?.ok || result.status !== 'submitted') {
    throw new CommandExecutionError(
      `BONC OA ${action} was not confirmed: ${result?.reason || 'unknown-state'}`,
      `Open ${result?.url || detail?.url || resolveTodoUrl(data.taskId)} and verify whether the workflow was processed.`,
    );
  }
  return [{
    taskId: data.taskId,
    action,
    confirmed: true,
    status: 'submitted',
    message: `${action} submitted`,
    url: result.url || detail?.url || resolveTodoUrl(data.taskId),
  }];
}

const approvalArgs = [
  { name: 'taskId', required: true, positional: true, help: 'Task id or task detail URL' },
  { name: 'comment', help: 'Approval comment' },
  { name: 'confirm', type: 'bool', default: false, help: 'Actually submit the workflow action. Default is preview only.' },
];

export const approveCommand = cli({
  site: SITE,
  name: 'approve',
  access: 'write',
  description: 'Approve one BONC OA pending task; preview unless --confirm true is passed',
  domain: 'oa.bonc.com.cn',
  strategy: Strategy.COOKIE,
  browser: true,
  args: approvalArgs,
  columns: ['taskId', 'action', 'confirmed', 'status', 'message', 'url'],
  func: (page, kwargs) => runApproval(page, kwargs, 'approve'),
});

export const rejectCommand = cli({
  site: SITE,
  name: 'reject',
  access: 'write',
  description: 'Reject one BONC OA pending task; preview unless --confirm true is passed',
  domain: 'oa.bonc.com.cn',
  strategy: Strategy.COOKIE,
  browser: true,
  args: approvalArgs,
  columns: ['taskId', 'action', 'confirmed', 'status', 'message', 'url'],
  func: (page, kwargs) => runApproval(page, kwargs, 'reject'),
});
