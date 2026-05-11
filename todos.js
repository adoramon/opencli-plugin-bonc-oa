import { AuthRequiredError, CommandExecutionError, ArgumentError } from '@jackwener/opencli/errors';
import { cli, Strategy } from '@jackwener/opencli/registry';
import { getBaseUrl, parseLimit, SITE } from './lib/validation.js';
import { statusScript, todosScript } from './lib/browser-scripts.js';

function normalizeLimit(raw) {
  try {
    return parseLimit(raw, 20, 100);
  } catch (error) {
    throw new ArgumentError(error.message);
  }
}

export const todosCommand = cli({
  site: SITE,
  name: 'todos',
  access: 'read',
  description: 'List pending BONC OA workflow tasks from the logged-in browser session',
  domain: 'oa.bonc.com.cn',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'limit', type: 'int', default: 20, help: 'Number of pending tasks to return (1-100)' },
  ],
  columns: ['rank', 'taskId', 'title', 'flowName', 'applicant', 'receivedAt', 'status', 'url'],
  func: async (page, kwargs) => {
    const limit = normalizeLimit(kwargs.limit);
    await page.goto(process.env.BONC_OA_TODO_LIST_URL || getBaseUrl(), { waitUntil: 'load', settleMs: 4000 });
    const state = await page.evaluate(statusScript());
    if (!state?.loggedIn) {
      throw new AuthRequiredError('oa.bonc.com.cn', 'Open BONC OA in Chrome and complete login, then retry.');
    }
    const rows = await page.evaluate(todosScript(limit));
    if (!Array.isArray(rows)) {
      throw new CommandExecutionError('BONC OA todos extraction did not return a row array');
    }
    return rows.slice(0, limit);
  },
});
