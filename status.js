import { cli, Strategy } from '@jackwener/opencli/registry';
import { OA_BROWSER_OPTIONS } from './lib/command-options.js';
import { gotoUnlessAlreadyOa } from './lib/navigation.js';
import { getBaseUrl, SITE } from './lib/validation.js';
import { ensureLoggedIn, LOGIN_ARGS } from './lib/session.js';

export const statusCommand = cli({
  ...OA_BROWSER_OPTIONS,
  site: SITE,
  name: 'status',
  access: 'read',
  description: 'Check BONC OA availability and current browser login state',
  domain: 'oa.bonc.com.cn',
  strategy: Strategy.COOKIE,
  browser: true,
  args: LOGIN_ARGS,
  columns: ['loggedIn', 'user', 'title', 'url'],
  func: async (page, kwargs) => {
    await gotoUnlessAlreadyOa(page, getBaseUrl(), { waitUntil: 'load', settleMs: 3000 });
    const state = await ensureLoggedIn(page, kwargs);
    return [{
      loggedIn: true,
      user: state.user || '',
      title: state.title || '',
      url: state.url || getBaseUrl(),
    }];
  },
});
