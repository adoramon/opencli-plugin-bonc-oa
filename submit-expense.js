import { CommandExecutionError, ArgumentError } from '@jackwener/opencli/errors';
import { cli, Strategy } from '@jackwener/opencli/registry';
import { OA_BROWSER_OPTIONS } from './lib/command-options.js';
import { gotoUnlessAlreadyOa } from './lib/navigation.js';
import { getBaseUrl, normalizeExpenseArgs, SITE } from './lib/validation.js';
import { expenseFillScript } from './lib/browser-scripts.js';
import { ensureLoggedIn, LOGIN_ARGS } from './lib/session.js';

function normalize(kwargs) {
  try {
    return normalizeExpenseArgs(kwargs);
  } catch (error) {
    throw new ArgumentError(error.message);
  }
}

export const submitExpenseCommand = cli({
  ...OA_BROWSER_OPTIONS,
  site: SITE,
  name: 'submit-expense',
  access: 'write',
  description: 'Submit a BONC OA expense workflow; preview unless --confirm true is passed',
  domain: 'oa.bonc.com.cn',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    ...LOGIN_ARGS,
    { name: 'title', required: true, help: 'Expense title/subject' },
    { name: 'amount', required: true, help: 'Expense amount, e.g. 128.50' },
    { name: 'date', required: true, help: 'Expense date in YYYY-MM-DD' },
    { name: 'category', required: true, help: 'Expense category' },
    { name: 'description', required: true, help: 'Expense description' },
    { name: 'attachments', help: 'Comma-separated local attachment file paths' },
    { name: 'confirm', type: 'bool', default: false, help: 'Actually submit the workflow. Default is preview only.' },
  ],
  columns: ['flowName', 'title', 'amount', 'attachmentCount', 'confirmed', 'status', 'instanceId', 'message', 'url'],
  func: async (page, kwargs) => {
    const data = normalize(kwargs);
    const targetUrl = process.env.BONC_OA_EXPENSE_URL || getBaseUrl();
    await gotoUnlessAlreadyOa(page, targetUrl, { waitUntil: 'load', settleMs: 5000 });
    await ensureLoggedIn(page, kwargs);

    if (!data.confirm) {
      return [{
        flowName: data.flowName,
        title: data.title,
        amount: data.amount,
        attachmentCount: data.attachments.length,
        confirmed: false,
        status: 'preview',
        instanceId: '',
        message: 'preview only; rerun with --confirm true to fill and submit',
        url: targetUrl,
      }];
    }

    if (data.attachments.length > 0 && data.confirm) {
      if (!page.setFileInput) {
        throw new CommandExecutionError('BONC OA expense submission requires Browser Bridge file upload support.');
      }
      try {
        await page.setFileInput(data.attachments, 'input[type="file"]');
        await page.wait(2);
      } catch (error) {
        throw new CommandExecutionError(`BONC OA attachment upload failed: ${error?.message || error}`);
      }
    }

    const result = await page.evaluate(expenseFillScript({
      title: data.title,
      amount: data.amount,
      date: data.date,
      category: data.category,
      description: data.description,
    }, data.confirm));

    if (!result?.ok || result.status !== 'submitted') {
      throw new CommandExecutionError(
        `BONC OA expense submission was not confirmed: ${result?.reason || 'unknown-state'}`,
        `Open ${result?.url || targetUrl} and verify whether the workflow was submitted.`,
      );
    }

    return [{
      flowName: data.flowName,
      title: data.title,
      amount: data.amount,
      attachmentCount: data.attachments.length,
      confirmed: true,
      status: 'submitted',
      instanceId: result.instanceId || '',
      message: 'expense workflow submitted',
      url: result.url || targetUrl,
    }];
  },
});
