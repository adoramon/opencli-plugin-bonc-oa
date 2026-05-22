export function statusScript() {
  return `
(() => {
  const clean = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
  const text = clean(document.body?.innerText || '');
  const url = location.href;
  const loginPatterns = [/登录/, /账号/, /密码/, /验证码/, /sign in/i, /login/i];
  const loggedOut = loginPatterns.filter((pattern) => pattern.test(text)).length >= 2;
  const userNode = Array.from(document.querySelectorAll('[class*=user], [class*=avatar], [class*=account], [id*=user], [id*=account]'))
    .map((node) => clean(node.textContent))
    .find((value) => value && value.length <= 40 && !/登录|账号|密码|验证码/.test(value));
  return {
    loggedIn: !loggedOut,
    user: userNode || '',
    title: document.title || '',
    url,
    bodySnippet: text.slice(0, 300),
  };
})()
`;
}

export function autoLoginScript(credentials = {}) {
  return `
(async () => {
  const credentials = ${JSON.stringify({
    username: credentials.username || '',
    password: credentials.password || '',
  })};
  const clean = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
  const isVisible = (node) => {
    if (!node) return false;
    const style = window.getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
  };
  const hasValue = (node) => Boolean(String(node?.value || '').trim());
  const setValue = (node, value) => {
    node.focus();
    const proto = node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    setter?.call(node, value);
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const inputs = Array.from(document.querySelectorAll('input')).filter(isVisible);
  const password = inputs.find((node) => String(node.type || '').toLowerCase() === 'password');
  const account = inputs.find((node) => {
    const type = String(node.type || 'text').toLowerCase();
    if (type === 'password' || type === 'hidden' || type === 'submit' || type === 'button') return false;
    const around = clean([node.name, node.id, node.placeholder, node.autocomplete, node.getAttribute('aria-label'), node.closest('label')?.textContent, node.parentElement?.textContent].filter(Boolean).join(' '));
    return /user|account|login|name|mobile|phone|mail|账号|用户名|用户|工号|手机号|邮箱/i.test(around) || inputs.length <= 3;
  });

  if (credentials.username && credentials.password && account && password) {
    if (!hasValue(account)) setValue(account, credentials.username);
    if (!hasValue(password)) setValue(password, credentials.password);
  }

  if (!password || !account) return { attempted: false, reason: 'prefilled-credentials-not-found', url: location.href };
  if (!hasValue(password) || !hasValue(account)) return { attempted: false, reason: 'prefilled-credentials-not-found', url: location.href };

  const captcha = inputs.find((node) => {
    const around = clean([node.name, node.id, node.placeholder, node.getAttribute('aria-label'), node.parentElement?.textContent].filter(Boolean).join(' '));
    return /验证码|captcha|verify/i.test(around);
  });
  if (captcha && !hasValue(captcha)) return { attempted: false, reason: 'captcha-required', url: location.href };

  const buttons = Array.from(document.querySelectorAll('#loginBtn, .login-button, [onclick*=login], [onclick*=Login], button, [role=button], input[type=submit], input[type=button], a')).filter(isVisible);
  const submit = buttons.find((node) => node.id === 'loginBtn')
    || buttons.find((node) => String(node.className || '').includes('login-button'))
    || buttons.find((node) => /login/i.test(String(node.getAttribute('onclick') || '')))
    || buttons.find((node) => /登录|登陆|sign in|login/i.test(clean(node.innerText || node.value || node.textContent)))
    || inputs.find((node) => ['submit', 'button'].includes(String(node.type || '').toLowerCase()) && /登录|登陆|sign in|login/i.test(clean(node.value || node.textContent)))
    || document.querySelector('button[type=submit], input[type=submit]');
  if (!submit || !isVisible(submit)) return { attempted: false, reason: 'login-button-not-found', url: location.href };

  submit.click();
  return { attempted: true, reason: 'clicked-login', url: location.href };
})()
`;
}

export function todosScript(limit) {
  return `
(() => {
  const limit = ${Number(limit)};
  const clean = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
  const rows = [];
  const seen = new Set();
  const taskWords = /待办|审批|流程|申请|报销|请假|处理|办理|同意|驳回/;
  const nodes = Array.from(document.querySelectorAll('tr, [role=row], li, .todo, .task, .workflow, .list-item, [class*=todo], [class*=task], [class*=work], [class*=flow]'));
  for (const node of nodes) {
    const text = clean(node.innerText || node.textContent || '');
    if (!text || text.length < 4 || !taskWords.test(text)) continue;
    const link = node.querySelector('a[href]') || (node.matches?.('a[href]') ? node : null);
    const url = link ? new URL(link.getAttribute('href'), location.href).href : location.href;
    const idMatch = (url + ' ' + text).match(/(?:task|todo|work|flow|process|id)[_=/-]([A-Za-z0-9-]+)/i) || text.match(/\\b[A-Z0-9]{6,}\\b/);
    const taskId = idMatch ? idMatch[1] || idMatch[0] : String(rows.length + 1);
    if (seen.has(taskId + url)) continue;
    seen.add(taskId + url);
    const cells = Array.from(node.querySelectorAll('td, [role=cell], span, div')).map((cell) => clean(cell.textContent)).filter(Boolean);
    rows.push({
      taskId,
      title: cells[0] || text.slice(0, 80),
      flowName: cells.find((v) => /流程|审批|报销|请假/.test(v)) || '',
      applicant: cells.find((v) => /申请人|发起人/.test(v)) || '',
      receivedAt: (text.match(/\\d{4}[-/]\\d{1,2}[-/]\\d{1,2}(?:\\s+\\d{1,2}:\\d{2})?/) || [''])[0],
      status: 'pending',
      url,
    });
    if (rows.length >= limit) break;
  }
  return rows.map((row, index) => ({ rank: index + 1, ...row }));
})()
`;
}

export function detailScript(taskId) {
  return `
(() => {
  const taskId = ${JSON.stringify(taskId)};
  const clean = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
  const text = clean(document.body?.innerText || '');
  const buttons = Array.from(document.querySelectorAll('button, [role=button], input[type=button], input[type=submit]'))
    .map((node) => clean(node.innerText || node.value || node.textContent))
    .filter(Boolean);
  const title = document.title || text.split(' ').slice(0, 12).join(' ');
  const date = (text.match(/\\d{4}[-/]\\d{1,2}[-/]\\d{1,2}(?:\\s+\\d{1,2}:\\d{2})?/) || [''])[0];
  return [{
    taskId,
    title,
    flowName: (text.match(/(?:流程|类型|事项)[:：]?\\s*([^\\n\\r]{2,40})/) || [,''])[1],
    applicant: (text.match(/(?:申请人|发起人|提交人)[:：]?\\s*([^\\s,，;；]{2,20})/) || [,''])[1],
    receivedAt: date,
    formSummary: text.slice(0, 500),
    availableActions: buttons.filter((v) => /同意|通过|驳回|退回|提交|保存/.test(v)).join(','),
    url: location.href,
  }];
})()
`;
}

export function approvalScript(action, comment, confirm) {
  return `
(async () => {
  const action = ${JSON.stringify(action)};
  const comment = ${JSON.stringify(comment)};
  const confirm = ${confirm ? 'true' : 'false'};
  const clean = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const keywords = action === 'approve' ? ['同意', '通过', '批准', '办理'] : ['驳回', '退回', '不同意'];
  const textArea = document.querySelector('textarea, [contenteditable=true], input[placeholder*=意见], textarea[placeholder*=意见]');
  if (textArea) {
    textArea.focus();
    if (textArea.isContentEditable) {
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, comment);
    } else {
      const setter = Object.getOwnPropertyDescriptor(textArea instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value')?.set;
      setter?.call(textArea, comment);
      textArea.dispatchEvent(new Event('input', { bubbles: true }));
      textArea.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
  const buttons = Array.from(document.querySelectorAll('button, [role=button], input[type=button], input[type=submit], a'));
  const actionButton = buttons.find((node) => keywords.some((word) => clean(node.innerText || node.value || node.textContent).includes(word)));
  if (!actionButton) return { ok: false, reason: 'action-button-not-found', url: location.href };
  if (!confirm) return { ok: true, preview: true, buttonText: clean(actionButton.innerText || actionButton.value || actionButton.textContent), url: location.href };
  actionButton.click();
  await wait(800);
  const confirmButton = Array.from(document.querySelectorAll('button, [role=button], input[type=button], input[type=submit]'))
    .find((node) => /确定|确认|提交|是/.test(clean(node.innerText || node.value || node.textContent)));
  if (confirmButton) {
    confirmButton.click();
    await wait(1500);
  }
  const body = clean(document.body?.innerText || '');
  if (/成功|已提交|处理完成|办理完成/.test(body)) return { ok: true, status: 'submitted', url: location.href };
  return { ok: false, reason: 'submit-state-not-confirmed', url: location.href, bodySnippet: body.slice(0, 300) };
})()
`;
}

export function expenseFillScript(data, confirm) {
  return `
(async () => {
  const data = ${JSON.stringify(data)};
  const confirm = ${confirm ? 'true' : 'false'};
  const clean = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const fillText = (labels, value) => {
    const nodes = Array.from(document.querySelectorAll('input:not([type=file]), textarea, [contenteditable=true]'));
    const target = nodes.find((node) => {
      const around = clean([node.placeholder, node.name, node.id, node.getAttribute('aria-label'), node.closest('label')?.textContent, node.parentElement?.textContent].filter(Boolean).join(' '));
      return labels.some((label) => around.includes(label));
    });
    if (!target) return false;
    target.focus();
    if (target.isContentEditable) {
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, value);
    } else {
      const proto = target instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      setter?.call(target, value);
      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return true;
  };
  const filled = [];
  if (fillText(['标题', '主题', '事由', 'title'], data.title)) filled.push('title');
  if (fillText(['金额', '费用', 'amount'], data.amount)) filled.push('amount');
  if (fillText(['日期', '发生时间', 'date'], data.date)) filled.push('date');
  if (fillText(['类别', '类型', 'category'], data.category)) filled.push('category');
  if (fillText(['说明', '描述', '备注', 'description'], data.description)) filled.push('description');
  if (!confirm) return { ok: true, preview: true, filled, url: location.href };
  const submit = Array.from(document.querySelectorAll('button, [role=button], input[type=submit], input[type=button]'))
    .find((node) => /提交|发起|送审|保存并提交/.test(clean(node.innerText || node.value || node.textContent)));
  if (!submit) return { ok: false, reason: 'submit-button-not-found', filled, url: location.href };
  submit.click();
  await wait(1200);
  const confirmButton = Array.from(document.querySelectorAll('button, [role=button], input[type=button], input[type=submit]'))
    .find((node) => /确定|确认|提交/.test(clean(node.innerText || node.value || node.textContent)));
  if (confirmButton) {
    confirmButton.click();
    await wait(1500);
  }
  const body = clean(document.body?.innerText || '');
  const id = (location.href.match(/(?:instance|process|flow|id)[=/-]([A-Za-z0-9-]+)/i) || body.match(/(?:编号|单号|实例)[:：]?\\s*([A-Za-z0-9-]+)/) || [,''])[1];
  if (/成功|已提交|发起成功|提交成功/.test(body) || id) return { ok: true, status: 'submitted', instanceId: id || '', url: location.href };
  return { ok: false, reason: 'submit-state-not-confirmed', bodySnippet: body.slice(0, 300), url: location.href };
})()
`;
}
