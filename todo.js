import { CommandExecutionError, ArgumentError } from '@jackwener/opencli/errors';
import { cli, Strategy } from '@jackwener/opencli/registry';
import { OA_BROWSER_OPTIONS } from './lib/command-options.js';
import { requireText, resolveTaskUrl, SITE } from './lib/validation.js';
import { detailScript } from './lib/browser-scripts.js';
import { ensureLoggedIn, LOGIN_ARGS } from './lib/session.js';

function resolveTodoUrl(taskId) {
  return resolveTaskUrl(taskId);
}

export const todoCommand = cli({
  ...OA_BROWSER_OPTIONS,
  site: SITE,
  name: 'todo',
  access: 'read',
  description: 'Read one BONC OA pending task detail',
  domain: 'oa.bonc.com.cn',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'taskId', required: true, positional: true, help: 'Task id or task detail URL' },
    ...LOGIN_ARGS,
  ],
  columns: ['taskId', 'title', 'flowName', 'applicant', 'receivedAt', 'formSummary', 'availableActions', 'url'],
  func: async (page, kwargs) => {
    let taskId;
    try {
      taskId = requireText(kwargs.taskId, 'taskId');
    } catch (error) {
      throw new ArgumentError(error.message);
    }
    await page.goto(resolveTodoUrl(taskId), { waitUntil: 'load', settleMs: 4000 });
    await ensureLoggedIn(page, kwargs);
    const rows = await page.evaluate(detailScript(taskId));
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new CommandExecutionError(`BONC OA task detail not found for ${taskId}`);
    }
    return rows;
  },
});
