import { AuthRequiredError } from '@jackwener/opencli/errors';
import { cli, Strategy } from '@jackwener/opencli/registry';
import { getBaseUrl, SITE } from './lib/validation.js';
import { statusScript } from './lib/browser-scripts.js';

export const statusCommand = cli({
  site: SITE,
  name: 'status',
  access: 'read',
  description: 'Check BONC OA availability and current browser login state',
  domain: 'oa.bonc.com.cn',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [],
  columns: ['loggedIn', 'user', 'title', 'url'],
  func: async (page) => {
    await page.goto(getBaseUrl(), { waitUntil: 'load', settleMs: 3000 });
    const state = await page.evaluate(statusScript());
    if (!state?.loggedIn) {
      throw new AuthRequiredError('oa.bonc.com.cn', 'Open BONC OA in Chrome and complete login, then retry.');
    }
    return [{
      loggedIn: true,
      user: state.user || '',
      title: state.title || '',
      url: state.url || getBaseUrl(),
    }];
  },
});
