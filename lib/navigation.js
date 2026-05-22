import { getBaseUrl } from './validation.js';

export async function getCurrentUrl(page) {
  if (typeof page.getCurrentUrl === 'function') {
    const url = await page.getCurrentUrl().catch(() => null);
    if (url) return url;
  }
  return page.evaluate('(() => location.href)()').catch(() => null);
}

export function isOaUrl(url) {
  try {
    return new URL(url).hostname === 'oa.bonc.com.cn';
  } catch {
    return false;
  }
}

export function isOaTodoListUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'oa.bonc.com.cn') return false;
    const path = parsed.pathname.replace(/\/+$/, '');
    return path === '' || path === '/workflow' || path === '/todo' || path === '/todos' || path === '/pending' || path === '/index';
  } catch {
    return false;
  }
}

export async function gotoUnlessAlreadyOa(page, targetUrl = getBaseUrl(), options = {}) {
  const currentUrl = await getCurrentUrl(page);
  if (isOaUrl(currentUrl) && isOaTodoListUrl(currentUrl)) return currentUrl;
  await page.goto(targetUrl, options);
  return targetUrl;
}
