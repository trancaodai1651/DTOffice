import { el } from '../core/env.js';
import { TOKEN } from '../net/live.js';
import { t as tr } from '../../i18n/index.js';

export function roleSkillsEditor(info) {
  const box = el('details', 'tm-about'); box.append(el('summary', null, tr('team.skills.title')));
  const role = el('select'), content = el('textarea'), status = el('p', 'zc-task-note');
  role.setAttribute('aria-label', tr('team.skills.role')); content.setAttribute('aria-label', tr('team.skills.content'));
  content.placeholder = tr('team.skills.content'); content.rows = 8; content.maxLength = 20000; content.style.width = '100%';
  const assignments = { ...info.roleSkills };
  const defaults = el('pre', 'tm-default-skill'); defaults.tabIndex = 0; defaults.setAttribute('aria-label', tr('team.defaultSkill'));
  for (const r of [...info.roles, ...(info.marketing?.roles || []), ...(info.specialists || [])]) { const o = el('option', null, tr(`team.roles.${r.id}.name`)); o.value = r.id; role.append(o); }
  const draw = () => { content.value = assignments[role.value] || ''; defaults.textContent = info.defaultSkills?.[role.value] || '—'; status.textContent = ''; }; role.addEventListener('change', draw); draw();
  const upload = el('input'); upload.type = 'file'; upload.accept = '.md,.txt'; upload.setAttribute('aria-label', tr('team.skills.import'));
  upload.addEventListener('change', async () => { const f = upload.files[0]; if (!f) return; if (f.size > 80000) { status.textContent = tr('team.skills.error'); return; } try { const text = await f.text(); if (text.length > 20000) throw Error(); content.value = text; } catch { status.textContent = tr('team.skills.error'); } });
  const save = el('button', 'zc-task-tool', tr('team.skills.save')); save.type = 'button';
  save.addEventListener('click', async () => {
    const selected = role.value, text = content.value; save.disabled = role.disabled = content.disabled = upload.disabled = true;
    try { const r = await fetch(`/api/team/skills${TOKEN ? `?k=${encodeURIComponent(TOKEN)}` : ''}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: selected, content: text }) }); if (!r.ok || !(await r.json()).ok) throw Error(); assignments[selected] = text; status.textContent = tr('team.skills.saved'); }
    catch { status.textContent = tr('team.skills.error'); }
    finally { save.disabled = role.disabled = content.disabled = upload.disabled = false; }
  });
  box.append(el('p', 'zc-task-note', tr('team.skills.note')), role, el('b', null, tr('team.defaultSkill')), defaults, el('b', null, tr('team.customSkill')), content, upload, save, status); return box;
}
