import { AuthRequiredError } from '@jackwener/opencli/errors';
import { requireText } from './validation.js';
import { autoLoginScript, statusScript } from './browser-scripts.js';

export const LOGIN_ARGS = [
  { name: 'username', help: 'BONC OA username for this command only; not stored.' },
  { name: 'password', help: 'BONC OA password for this command only; not stored or printed.' },
];

function normalizeCredentials(kwargs = {}) {
  const hasUsername = kwargs.username != null && String(kwargs.username).trim() !== '';
  const hasPassword = kwargs.password != null && String(kwargs.password).trim() !== '';
  if (!hasUsername && !hasPassword) return {};
  if (!hasUsername || !hasPassword) {
    throw new AuthRequiredError(
      'oa.bonc.com.cn',
      'Pass both --username and --password, or omit both to reuse an existing Chrome login.',
    );
  }
  return {
    username: requireText(kwargs.username, 'username'),
    password: requireText(kwargs.password, 'password'),
  };
}

async function waitSeconds(page, seconds) {
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

export async function ensureLoggedIn(page, kwargs = {}) {
  const credentials = normalizeCredentials(kwargs);
  let state = await page.evaluate(statusScript());
  if (state?.loggedIn) {
    return { ...state, autoLoginAttempted: false };
  }

  let login;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    login = await page.evaluate(autoLoginScript(credentials));
    if (login?.attempted) {
      await waitSeconds(page, 3);
      state = await page.evaluate(statusScript());
      if (state?.loggedIn) {
        return { ...state, autoLoginAttempted: true };
      }
      break;
    }

    if (login?.reason !== 'prefilled-credentials-not-found') {
      break;
    }
    await waitSeconds(page, 1);
  }

  const reason = login?.reason ? ` Auto-login skipped or failed: ${login.reason}.` : '';
  throw new AuthRequiredError(
    'oa.bonc.com.cn',
    `Open BONC OA in Chrome and complete login, then retry.${reason}`,
  );
}
