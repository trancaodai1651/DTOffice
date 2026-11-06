// Desktop IPC only: web and phone clients cannot download or execute installers.
import { t as tr } from '../../i18n/index.js';

export function setup() {
  const invoke = window.__TAURI__?.core?.invoke, section = document.getElementById('desktop-updates');
  if (!invoke || !section) return;
  const text = (name, vars) => tr(`settings.updates.${name}`, vars), hour = 3600000;
  const status = section.querySelector('[data-update-status]'), checkButton = section.querySelector('[data-update-check]'), auto = section.querySelector('[data-update-auto]');
  let current = {}, running = false, approved = false, supported = false, polling = false, checkedAt = 0, poll, waiting, restoreFocus;
  const stored = name => { try { return localStorage.getItem(name); } catch { return null; } };
  const save = (name, value) => { try { localStorage.setItem(name, value); } catch { /* private storage */ } };
  const dialog = document.createElement('dialog'); dialog.className = 'office-update'; dialog.setAttribute('aria-labelledby', 'office-update-title');
  const node = (tag, content, parent = dialog) => { const el = document.createElement(tag); if (content) el.textContent = content; parent.append(el); return el; };
  const heading = node('h2'); heading.id = 'office-update-title';
  const summary = node('p'), note = node('pre'), progress = node('progress'), message = node('p'); message.setAttribute('role', 'status');
  message.id = 'office-update-progress'; progress.setAttribute('aria-labelledby', message.id);
  const actions = node('div'); actions.className = 'office-update-actions';
  const later = node('button', text('later'), actions), accept = node('button', text('install'), actions);
  for (const b of [later, accept]) b.type = 'button';
  document.body.append(dialog);
  const native = action => invoke('desktop_update', { action, version: current.version || null });
  const show = () => { if (!dialog.open) { restoreFocus = document.activeElement; dialog.showModal(); later.focus(); } };
  const close = () => { dialog.close(); (restoreFocus?.isConnected && restoreFocus.getClientRects().length ? restoreFocus : document.getElementById('btn-look'))?.focus(); };
  function render(snapshot = current) {
    current = snapshot;
    status.textContent = current.version ? text('available', { version: current.version }) : text('current', { version: current.current || '' });
    heading.textContent = text('available', { version: current.version || '' });
    summary.textContent = text('note'); note.textContent = current.notes || ''; note.hidden = !current.notes;
    const stage = current.stage, busy = ['checking', 'downloading', 'verifying', 'installing'].includes(stage);
    checkButton.disabled = busy || running;
    accept.disabled = busy || stage === 'waiting';
    accept.textContent = text(stage === 'ready' ? 'restart' : 'install');
    later.disabled = ['downloading', 'verifying', 'installing'].includes(stage);
    later.textContent = text(stage === 'waiting' ? 'cancelWait' : 'later');
    progress.hidden = !['downloading', 'verifying'].includes(stage);
    progress.max = current.total || 1;
    if (current.total) progress.value = Math.min(current.received || 0, current.total); else progress.removeAttribute('value');
    message.textContent = stage === 'downloading' ? text('downloading', { percent: current.total ? Math.floor(100 * current.received / current.total) : '…' }) : ['verifying', 'installing', 'waiting'].includes(stage) ? text(stage) : '';
  }
  async function install() {
    if (!approved) return;
    later.disabled = true; checkButton.disabled = true;
    render(await native('install'));
    if (current.stage === 'waiting' && approved) waiting = setTimeout(() => { install().catch(failed); }, 5000);
  }
  function failed() {
    polling = false; clearInterval(poll); clearTimeout(waiting); running = false; approved = false;
    native('status').then(s => { render(s); message.textContent = text('error'); accept.disabled = !s.version; }).catch(() => { message.textContent = text('error'); });
    checkButton.disabled = false; status.textContent = text('error');
  }
  async function check(manual = false) {
    if (running) return;
    running = true; checkedAt = Date.now(); checkButton.disabled = true; status.textContent = text('checking');
    try {
      const snapshot = await native('check'); checkedAt = Date.now(); running = false; render(snapshot);
      if (!current.version) { status.textContent = text('upToDate', { version: current.current }); return; }
      let reminder; try { reminder = JSON.parse(stored('office-update-reminder') || 'null'); } catch { /* old preference */ }
      if (manual || reminder?.version !== current.version || Date.now() - reminder.at > 24 * hour) show();
    } catch { running = false; checkButton.disabled = false; if (manual) status.textContent = text('error'); else render(); }
  }
  accept.addEventListener('click', async () => {
    if (running || !current.version) return;
    approved = true; running = true;
    try {
      if (!['ready', 'waiting'].includes(current.stage)) {
        render({ ...current, stage: 'downloading', received: 0, total: null });
        polling = true; poll = setInterval(() => { native('status').then(s => { if (polling) render(s); }).catch(() => {}); }, 800);
        const downloaded = await native('download'); polling = false; clearInterval(poll); render(downloaded);
      }
      await install();
    } catch { failed(); }
    finally { running = false; checkButton.disabled = false; }
  });
  function postpone() {
    if (later.disabled) return;
    approved = false; clearTimeout(waiting);
    if (current.stage === 'waiting') native('pause').then(render).catch(() => {});
    save('office-update-reminder', JSON.stringify({ version: current.version, at: Date.now() })); close();
  }
  later.addEventListener('click', postpone);
  dialog.addEventListener('cancel', e => { e.preventDefault(); postpone(); });
  checkButton.addEventListener('click', () => check(true));
  auto.checked = stored('office-auto-update-check') !== 'false';
  auto.addEventListener('change', () => save('office-auto-update-check', String(auto.checked)));
  const maybeCheck = () => { if (supported && auto.checked && document.visibilityState !== 'hidden' && Date.now() - checkedAt > 6 * hour) check(); };
  native('status').then(s => { supported = true; section.hidden = false; render(s); setTimeout(maybeCheck, 10000); }).catch(() => { dialog.remove(); });
  setInterval(maybeCheck, 6 * hour);
  addEventListener('online', () => { if (supported && auto.checked) check(); }); addEventListener('focus', maybeCheck);
}
