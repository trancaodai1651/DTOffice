// "Phòng Kho dữ liệu": the marketing department's asset library (server/asset-library.mjs) and the Social Media agent's
// accounts (server/social-accounts.mjs), in the team's sheet. Three parts:
//   Kho dữ liệu         where the library is, the folders of yours it links (product photos and videos, by category and
//                        product), the products filed and the image sets made (bo-anh/, by category and product)
//   Tài khoản MXH        each account in a browser profile of its own: "Đăng nhập" opens it for you to sign in once
//   Bài chờ đăng         the posts the team queued: "Đăng" opens that account's posting page, copies the caption and
//                        opens the post's folder; you press the platform's Post button, then "Đã đăng"
// Changing anything is for this computer only (the server refuses it from a phone).
import { el } from '../core/env.js';
import { TOKEN } from '../net/live.js';
import { toast } from './activity.js';
import { t as tr } from '../../i18n/index.js';

const q = () => (TOKEN ? `?k=${encodeURIComponent(TOKEN)}` : '');
const get = () => fetch(`/api/library${q()}`).then((x) => (x.ok ? x.json() : null)).catch(() => null);
const post = (url, body) => fetch(`${url}${q()}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  .then((x) => x.json()).catch(() => ({ ok: false, message: tr('library.unreachable') }));
const button = (text, onClick, cls = 'zc-task-tool') => { const b = el('button', cls, text); b.type = 'button'; b.addEventListener('click', onClick); return b; };
const field = (label, input) => { const w = el('label', 'lib-field'); w.append(el('small', null, label), input); return w; };
const input = (ph, value = '') => { const i = el('input'); i.type = 'text'; i.placeholder = ph; i.value = value; i.addEventListener('keydown', (e) => e.stopPropagation()); return i; };
const platformName = (p) => tr(`library.platform.${p}`);
async function copy(text) { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } }

/** The panel, drawn from /api/library; `focus`: 'kho' | 'accounts' | 'posts' opens that part first. */
export function libraryPanel({ focus = '' } = {}) {
  const box = el('div', 'lib-panel'), body = el('div', 'lib-body');
  box.append(body);
  let data = null;
  const open = (what) => post('/api/library/open', { what }).then((r) => { if (!r?.ok) toast(r?.message || tr('library.err.noDir'), 5000); });
  async function load() { body.replaceChildren(el('p', 'zc-task-note', tr('library.loading'))); data = await get(); draw(); }
  async function act(url, b) { const r = await post(url, b); if (!r?.ok) { toast(r?.message || tr('library.unreachable'), 6000); return null; } if (r.root) { data = r; draw(); } return r; }

  function section(key, title) {
    const d = el('details', 'lib-sec'); d.open = focus ? focus === key : key === 'kho'; d.dataset.lib = key;
    d.append(el('summary', null, title)); return d;
  }
  // 1. the library: where it is, the folders linked, what is filed, the image sets
  function kho() {
    const d = section('kho', `📦 ${tr('library.kho.title')}`);
    const where = el('div', 'lib-row'); where.append(el('code', 'lib-path', data.root), button(tr('library.open'), () => open('')));
    const rootIn = input(tr('library.kho.rootPh'));
    const move = el('div', 'lib-row'); move.append(field(tr('library.kho.root'), rootIn), button(tr('library.kho.setRoot'), () => act('/api/library/root', { dir: rootIn.value })));
    d.append(el('p', 'zc-task-note', tr('library.kho.sub')), where);
    // folders of yours
    d.append(el('h4', null, tr('library.kho.sources')));
    if (!data.sources.length) d.append(el('p', 'zc-task-note', tr('library.kho.noSources')));
    for (const s of data.sources) {
      const row = el('div', 'lib-item');
      row.append(el('b', null, s.name), el('small', null, s.here ? tr('library.kho.counts', { images: s.images, videos: s.videos }) : tr('library.kho.gone')),
        el('code', 'lib-path', s.dir), ...(s.category ? [el('small', null, `${s.category}${s.product ? ` / ${s.product}` : ''}`)] : []));
      const acts = el('div', 'lib-acts'); acts.append(button(tr('library.open'), () => open(s.id)), button(tr('library.kho.unlink'), () => act('/api/library/unsource', { id: s.id })));
      row.append(acts); d.append(row);
    }
    const dirIn = input(tr('library.kho.dirPh')), catIn = input(tr('library.kho.catPh')), prodIn = input(tr('library.kho.prodPh'));
    const add = el('div', 'lib-form');
    add.append(field(tr('library.kho.dir'), dirIn), field(tr('library.kho.cat'), catIn), field(tr('library.kho.prod'), prodIn),
      button(tr('library.kho.link'), async () => { if (!dirIn.value.trim()) return; if (await act('/api/library/source', { dir: dirIn.value, category: catIn.value, product: prodIn.value })) { toast(tr('library.kho.linked'), 4000); } }, 'zc-task-go'));
    d.append(add);
    // what is filed, and the image sets made
    d.append(el('h4', null, tr('library.kho.products')));
    if (!data.categories.length) d.append(el('p', 'zc-task-note', tr('library.kho.noProducts')));
    for (const c of data.categories) {
      const cat = el('div', 'lib-cat'); cat.append(el('b', null, `🗂️ ${c.name}`), button(tr('library.open'), () => open(`san-pham/${c.name}`)));
      for (const p of c.products) {
        const sets = data.sets.find((x) => x.name === c.name)?.products.find((x) => x.name === p.name)?.sets || [];
        const row = el('div', 'lib-item'); row.append(el('span', null, p.name), el('small', null, `${tr('library.kho.counts', { images: p.images, videos: p.videos })} · ${tr('library.kho.sets', { n: sets.length })}`));
        const acts = el('div', 'lib-acts'); acts.append(button(tr('library.kho.originals'), () => open(`san-pham/${c.name}/${p.name}`)));
        if (sets.length) acts.append(button(tr('library.kho.openSets'), () => open(`bo-anh/${c.name}/${p.name}`)));
        row.append(acts); cat.append(row);
      }
      d.append(cat);
    }
    const quick = el('div', 'lib-acts'); quick.append(button(tr('library.kho.openSetsAll'), () => open('bo-anh')), button(tr('library.kho.openPosts'), () => open('bai-dang')));
    d.append(quick, move);
    return d;
  }
  // 2. the accounts
  function accounts() {
    const d = section('accounts', `🔐 ${tr('library.acc.title', { n: data.accounts.length })}`);
    d.append(el('p', 'zc-task-note', tr('library.acc.sub')));
    for (const a of data.accounts) {
      const row = el('div', 'lib-item'); row.dataset.account = a.id;
      row.append(el('b', null, `${platformName(a.platform)} · ${a.label}`), el('small', null, a.loggedIn ? tr('library.acc.opened') : tr('library.acc.notYet')));
      const acts = el('div', 'lib-acts');
      acts.append(button(tr('library.acc.login'), () => act('/api/social/login', { id: a.id }).then((r) => r && toast(tr('library.acc.loginHint'), 8000))),
        button(tr('library.acc.visit'), () => act('/api/social/visit', { id: a.id })),
        button(tr('library.acc.remove'), () => { if (confirm(tr('library.acc.removeAsk', { name: a.label }))) act('/api/social/remove', { id: a.id }); }));
      row.append(acts); d.append(row);
    }
    const plat = el('select'); for (const p of data.platforms) { const o = el('option', null, platformName(p)); o.value = p; plat.append(o); }
    const label = input(tr('library.acc.labelPh'));
    const add = el('div', 'lib-form'); add.append(field(tr('library.acc.platform'), plat), field(tr('library.acc.label'), label),
      button(tr('library.acc.add'), async () => { if (!label.value.trim()) return; const r = await act('/api/social/add', { platform: plat.value, label: label.value }); if (r) toast(tr('library.acc.added'), 5000); }, 'zc-task-go'));
    d.append(add);
    return d;
  }
  // 3. the posts queued
  function posts() {
    const waiting = data.posts.filter((p) => p.status !== 'posted');
    const d = section('posts', `📮 ${tr('library.posts.title', { n: waiting.length })}`);
    d.append(el('p', 'zc-task-note', tr('library.posts.sub')));
    if (!data.posts.length) d.append(el('p', 'zc-task-note', tr('library.posts.none')));
    for (const p of data.posts.slice(0, 40)) {
      const card = el('div', `lib-post is-${p.status}`); card.dataset.post = p.id;
      card.append(el('b', null, p.title), el('small', null, [tr(`library.posts.status.${p.status}`), p.when, p.product, tr('library.posts.media', { n: p.media.length })].filter(Boolean).join(' · ')));
      const text = el('p', 'lib-caption', p.caption.length > 280 ? `${p.caption.slice(0, 280)}…` : p.caption); card.append(text);
      const acts = el('div', 'lib-acts');
      for (const pf of p.platforms) {
        const done = p.posted?.[pf], mine = data.accounts.filter((a) => a.platform === pf), chosen = mine.find((a) => a.id === p.accounts?.[pf]) || mine[0];
        if (done) { acts.append(el('small', 'lib-done', `✓ ${platformName(pf)}`)); continue; }
        if (!chosen) { acts.append(el('small', 'lib-miss', tr('library.posts.noAccount', { platform: platformName(pf) }))); continue; }
        acts.append(button(tr('library.posts.publish', { platform: platformName(pf), account: chosen.label }), async () => {
          const r = await post('/api/social/publish', { id: chosen.id, post: p.id });
          if (!r?.ok) { toast(r?.message || tr('library.unreachable'), 6000); return; }
          const copied = await copy(r.text);
          toast(tr(copied ? 'library.posts.opened' : 'library.posts.openedNoCopy', { platform: platformName(pf) }), 12000);
        }));
        acts.append(button(tr('library.posts.markDone', { platform: platformName(pf) }), () => act('/api/library/posted', { id: p.id, platform: pf })));
      }
      acts.append(button(tr('library.posts.copy'), async () => toast(tr((await copy([p.caption, p.hashtags.join(' ')].filter(Boolean).join('\n\n'))) ? 'library.posts.copied' : 'library.posts.copyFail'), 4000)),
        button(tr('library.open'), () => open(`bai-dang/${p.id}`)));
      card.append(acts); d.append(card);
    }
    return d;
  }
  function draw() {
    if (!data?.ok) { body.replaceChildren(el('p', 'zc-task-note', tr('library.unreachable')), button(tr('library.retry'), load)); return; }
    body.replaceChildren(kho(), accounts(), posts(), button(tr('library.refresh'), load));
  }
  load();
  return box;
}
