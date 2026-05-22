import { CommandExecutionError, ArgumentError } from '@jackwener/opencli/errors';
import { cli, Strategy } from '@jackwener/opencli/registry';
import { OA_BROWSER_OPTIONS } from './lib/command-options.js';
import { gotoUnlessAlreadyOa } from './lib/navigation.js';
import { getBaseUrl, parseLimit, SITE } from './lib/validation.js';
import { todosScript } from './lib/browser-scripts.js';
import { ensureLoggedIn, LOGIN_ARGS } from './lib/session.js';

function normalizeLimit(raw) {
  try {
    return parseLimit(raw, 20, 100);
  } catch (error) {
    throw new ArgumentError(error.message);
  }
}

export const todosCommand = cli({
  ...OA_BROWSER_OPTIONS,
  site: SITE,
  name: 'todos',
  access: 'read',
  description: 'List pending BONC OA workflow tasks from the logged-in browser session',
  domain: 'oa.bonc.com.cn',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    ...LOGIN_ARGS,
    { name: 'limit', type: 'int', default: 20, help: 'Number of pending tasks to return (1-100)' },
  ],
  columns: ['rank', 'taskId', 'title', 'flowName', 'applicant', 'receivedAt', 'status', 'url'],
  func: async (page, kwargs) => {
    const limit = normalizeLimit(kwargs.limit);
    await gotoUnlessAlreadyOa(page, process.env.BONC_OA_TODO_LIST_URL || getBaseUrl(), { waitUntil: 'load', settleMs: 4000 });
    await ensureLoggedIn(page, kwargs);
    const rows = await page.evaluate(todosScript(limit));
    if (!Array.isArray(rows)) {
      throw new CommandExecutionError('BONC OA todos extraction did not return a row array');
    }
    return rows.slice(0, limit);
  },
});
