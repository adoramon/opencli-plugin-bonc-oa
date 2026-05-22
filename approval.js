import { CommandExecutionError, ArgumentError } from '@jackwener/opencli/errors';
import { cli, Strategy } from '@jackwener/opencli/registry';
import { OA_BROWSER_OPTIONS } from './lib/command-options.js';
import { normalizeApprovalArgs, resolveTaskUrl, SITE } from './lib/validation.js';
import { approvalScript, detailScript } from './lib/browser-scripts.js';
import { ensureLoggedIn, LOGIN_ARGS } from './lib/session.js';

function resolveTodoUrl(taskId) {
  return resolveTaskUrl(taskId);
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
  await ensureLoggedIn(page, kwargs);
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
  ...LOGIN_ARGS,
  { name: 'comment', help: 'Approval comment' },
  { name: 'confirm', type: 'bool', default: false, help: 'Actually submit the workflow action. Default is preview only.' },
];

export const approveCommand = cli({
  ...OA_BROWSER_OPTIONS,
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
  ...OA_BROWSER_OPTIONS,
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
