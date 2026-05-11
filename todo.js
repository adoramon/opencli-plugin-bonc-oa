import { AuthRequiredError, CommandExecutionError, ArgumentError } from '@jackwener/opencli/errors';
import { cli, Strategy } from '@jackwener/opencli/registry';
import { getBaseUrl, requireText, SITE } from './lib/validation.js';
import { detailScript, statusScript } from './lib/browser-scripts.js';

function resolveTodoUrl(taskId) {
  const template = process.env.BONC_OA_TODO_DETAIL_URL_TEMPLATE;
  if (template) return template.replace(/\{taskId\}/g, encodeURIComponent(taskId));
  if (/^https?:\/\//i.test(taskId)) return taskId;
  return getBaseUrl();
}

export const todoCommand = cli({
  site: SITE,
  name: 'todo',
  access: 'read',
  description: 'Read one BONC OA pending task detail',
  domain: 'oa.bonc.com.cn',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'taskId', required: true, positional: true, help: 'Task id or task detail URL' },
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
    const state = await page.evaluate(statusScript());
    if (!state?.loggedIn) {
      throw new AuthRequiredError('oa.bonc.com.cn', 'Open BONC OA in Chrome and complete login, then retry.');
    }
    const rows = await page.evaluate(detailScript(taskId));
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new CommandExecutionError(`BONC OA task detail not found for ${taskId}`);
    }
    return rows;
  },
});
