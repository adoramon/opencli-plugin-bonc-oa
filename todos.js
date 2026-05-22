import { CommandExecutionError, ArgumentError } from '@jackwener/opencli/errors';
import { cli, Strategy } from '@jackwener/opencli/registry';
import { OA_BROWSER_OPTIONS } from './lib/command-options.js';
import { gotoUnlessAlreadyOa } from './lib/navigation.js';
import { getBaseUrl, parseLimit, SITE } from './lib/validation.js';
import { openWorkbenchScript, todosScript } from './lib/browser-scripts.js';
import { ensureLoggedIn, LOGIN_ARGS } from './lib/session.js';

function normalizeLimit(raw) {
  try {
    return parseLimit(raw, 20, 100);
  } catch (error) {
    throw new ArgumentError(error.message);
  }
}

async function waitForWorkbench(page) {
  let state;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    state = await page.evaluate(openWorkbenchScript());
    if (state?.reason === 'workbench-ready' && state?.dataUrl) return state;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!state?.dataUrl) {
    throw new CommandExecutionError(`BONC OA workbench not available: ${state?.reason || 'unknown'} at ${state?.url || 'unknown url'}`);
  }
  return state;
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
    { name: 'type', type: 'string', help: 'Filter by task type (e.g. 审批, 报销, 请假)' },
    { name: 'status', type: 'string', default: 'pending', help: 'Task status filter (pending/done)' },
  ],
  columns: ['taskId', 'title', 'type', 'receivedAt', 'result', 'processedAt'],
  func: async (page, kwargs) => {
    const limit = normalizeLimit(kwargs.limit);
    const isDone = kwargs.status === 'done';
    const targetUrl = isDone
      ? (process.env.BONC_OA_DONE_LIST_URL || getBaseUrl())
      : (process.env.BONC_OA_TODO_LIST_URL || getBaseUrl());
    await gotoUnlessAlreadyOa(page, targetUrl, { waitUntil: 'load', settleMs: 4000 });
    await ensureLoggedIn(page, kwargs);
    await waitForWorkbench(page);

    const extractWithRetry = async (attempt = 0) => {
      const filter = { type: kwargs.type || '', status: kwargs.status || 'pending' };
      const result = await page.evaluate(todosScript(limit, filter));
      const rows = Array.isArray(result) ? result : [];
      if (rows.length === 0 && attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return extractWithRetry(attempt + 1);
      }
      if (rows.length === 0 && attempt === 2) {
        const debug = await page.evaluate(() => {
          const taskRows = Array.from(document.querySelectorAll('#tableData tr.tdata, table#tableData tr[class*=tdata]'));
          const frames = Array.from(document.querySelectorAll('iframe')).map(f => ({ id: f.id, src: f.src?.slice(0, 80), visible: f.offsetWidth > 0 }));
          return { taskRowsFound: taskRows.length, iframes: frames, bodySnippet: document.body?.innerText?.slice(0, 200) };
        }).catch(() => null);
        throw new CommandExecutionError(`BONC OA todos extraction returned 0 rows after retries. Debug: ${JSON.stringify(debug)}`);
      }
      return rows.slice(0, limit);
    };

    return extractWithRetry();
  },
});
